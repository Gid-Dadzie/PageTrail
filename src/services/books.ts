/**
 * Book metadata via the Open Library API.
 *
 * The proposal allows either Google Books or Open Library. Google Books is used
 * here only as a fallback: its keyless endpoint shares a global anonymous quota
 * that is routinely exhausted (HTTP 429), so Open Library — free, keyless, and
 * without a per-day cap — is the primary catalogue.
 *
 * The proposal calls for this to be proxied and cached server-side; until that
 * backend exists the client calls the public endpoints directly.
 */

const SEARCH_ROOT = 'https://openlibrary.org/search.json';
const COVER_ROOT = 'https://covers.openlibrary.org/b';

/** Fields requested from search; Open Library returns everything otherwise. */
const SEARCH_FIELDS = [
  'key',
  'title',
  'author_name',
  'cover_i',
  'first_publish_year',
  'number_of_pages_median',
  'subject',
  'isbn',
  'publisher',
  'ratings_average',
  'ratings_count',
  'ebook_access',
].join(',');

export type Book = {
  /** Open Library work id, e.g. `OL35351151W`. */
  id: string;
  title: string;
  authors: string[];
  description: string;
  coverUrl: string;
  pageCount: number;
  categories: string[];
  publishedYear: number;
  publisher: string;
  averageRating: number;
  ratingsCount: number;
  isbn: string;
  /**
   * Open Library says the full text is freely readable (`ebook_access:public`),
   * i.e. public domain. Known the moment the book loads, unlike a Gutenberg
   * match — which is what lets the book screen commit to a "Read now" button
   * before it has confirmed an edition to serve.
   */
  freeToRead: boolean;
};

type SearchDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  number_of_pages_median?: number;
  subject?: string[];
  isbn?: string[];
  publisher?: string[];
  ratings_average?: number;
  ratings_count?: number;
  /** One of `no_ebook`, `printdisabled`, `borrowable`, `public`. */
  ebook_access?: string;
};

export function coverUrlForId(coverId: number | undefined, size: 'M' | 'L' = 'L'): string {
  return coverId ? `${COVER_ROOT}/id/${coverId}-${size}.jpg` : '';
}

export function coverUrlForIsbn(isbn: string, size: 'M' | 'L' = 'L'): string {
  return isbn ? `${COVER_ROOT}/isbn/${isbn}-${size}.jpg` : '';
}

/** Open Library work keys arrive as `/works/OL123W`; callers want the bare id. */
function workIdFromKey(key: string | undefined): string {
  return key?.replace('/works/', '') ?? '';
}

function toBook(doc: SearchDoc): Book {
  return {
    id: workIdFromKey(doc.key),
    title: doc.title ?? 'Untitled',
    authors: doc.author_name ?? ['Unknown author'],
    description: '',
    coverUrl: coverUrlForId(doc.cover_i),
    pageCount: doc.number_of_pages_median ?? 0,
    // Open Library subjects are long and noisy; the UI only ever shows a few.
    categories: (doc.subject ?? []).slice(0, 8),
    publishedYear: doc.first_publish_year ?? 0,
    publisher: doc.publisher?.[0] ?? '',
    averageRating: doc.ratings_average ?? 0,
    ratingsCount: doc.ratings_count ?? 0,
    isbn: doc.isbn?.[0] ?? '',
    freeToRead: doc.ebook_access === 'public',
  };
}

async function search(params: Record<string, string>, signal?: AbortSignal): Promise<Book[]> {
  const query = new URLSearchParams({ limit: '20', fields: SEARCH_FIELDS, ...params });
  const res = await fetch(`${SEARCH_ROOT}?${query}`, { signal });

  if (!res.ok) throw new Error(`Open Library request failed (${res.status})`);

  const json: { docs?: SearchDoc[] } = await res.json();
  // Works without a cover render as grey boxes, so keep them out of grids.
  return (json.docs ?? []).filter((d) => d.cover_i && d.key).map(toBook);
}

/** Free-text search across titles and authors. */
export async function searchBooks(term: string, signal?: AbortSignal): Promise<Book[]> {
  const trimmed = term.trim();
  if (!trimmed) return [];
  return search({ q: trimmed }, signal);
}

/** Books within a genre, used by the Explore-by-genre screens. */
export function fetchBooksByGenre(
  genre: string,
  limit = 20,
  signal?: AbortSignal
): Promise<Book[]> {
  return search({ q: `subject:"${genre.toLowerCase()}"`, sort: 'rating', limit: String(limit) }, signal);
}

/** Highest-rated books overall, backing the Discover "Top Charts" rail. */
export function fetchTopCharts(limit = 15, signal?: AbortSignal): Promise<Book[]> {
  return search({ q: 'ratings_count:[100 TO *]', sort: 'rating', limit: String(limit) }, signal);
}

/**
 * Public-domain books that are free to read, highest-rated first.
 *
 * `ebook_access:public` is Open Library's flag for a freely readable full text.
 * Most of these also have a Project Gutenberg edition, so the book screen's
 * in-app "Read now" button lights up; the rest still read free via the borrow
 * link.
 */
export function fetchFreeToRead(limit = 30, signal?: AbortSignal): Promise<Book[]> {
  return search({ q: 'ebook_access:public', sort: 'rating', limit: String(limit) }, signal);
}

/** Loose "readers also liked" signal: other books by the same author. */
export function fetchRelatedBooks(book: Book, signal?: AbortSignal): Promise<Book[]> {
  const author = book.authors[0];
  const q = author && author !== 'Unknown author'
    ? `author:"${author}"`
    : `subject:"${book.categories[0] ?? 'fiction'}"`;
  return search({ q, limit: '10' }, signal).then((books) =>
    books.filter((b) => b.id !== book.id)
  );
}

type WorkDetail = {
  description?: string | { value?: string };
  subjects?: string[];
  covers?: number[];
};

/**
 * Full detail for one work. Search results carry no description, so the detail
 * screen fetches it separately and merges it over the summary it already has.
 */
export async function fetchBookById(id: string, signal?: AbortSignal): Promise<Book | null> {
  const [workRes, searchResults] = await Promise.all([
    fetch(`https://openlibrary.org/works/${encodeURIComponent(id)}.json`, { signal }),
    search({ q: `key:/works/${id}`, limit: '1' }, signal).catch(() => [] as Book[]),
  ]);

  if (workRes.status === 404) return null;
  if (!workRes.ok) throw new Error(`Open Library request failed (${workRes.status})`);

  const work: WorkDetail = await workRes.json();
  // `description` is sometimes a bare string and sometimes a {value} record.
  const description =
    typeof work.description === 'string' ? work.description : (work.description?.value ?? '');

  const base: Book = searchResults[0] ?? {
    id,
    title: 'Untitled',
    authors: ['Unknown author'],
    description: '',
    coverUrl: '',
    pageCount: 0,
    categories: [],
    publishedYear: 0,
    publisher: '',
    averageRating: 0,
    ratingsCount: 0,
    isbn: '',
    freeToRead: false,
  };

  return {
    ...base,
    description,
    categories: base.categories.length ? base.categories : (work.subjects ?? []).slice(0, 8),
    coverUrl: base.coverUrl || coverUrlForId(work.covers?.[0]),
  };
}
