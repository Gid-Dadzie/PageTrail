/**
 * In-app reading for public-domain titles.
 *
 * The catalogue (Open Library) carries metadata only, so readable text comes
 * from Project Gutenberg via the keyless Gutendex API. A book is offered for
 * in-app reading only when Gutendex has a confident title + author match — which
 * in practice means it is public domain. Everything else routes to the buy or
 * borrow links instead.
 */

const GUTENDEX_ROOT = 'https://gutendex.com/books/';

export type ReadableEdition = {
  gutenbergId: number;
  title: string;
  author: string;
  /** Full styled HTML of the book, rendered in the reader's WebView. */
  htmlUrl: string;
  /** Plain-text fallback when a book has no HTML format. */
  textUrl: string;
};

type GutendexAuthor = { name: string };
type GutendexBook = {
  id: number;
  title: string;
  authors: GutendexAuthor[];
  formats: Record<string, string>;
};

/** Lowercase, strip accents and punctuation, collapse whitespace. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "Jane Austen" -> "austen"; "Austen, Jane" (Gutenberg's form) -> "austen". */
function surname(author: string): string {
  // Gutenberg lists "Surname, Firstname"; Open Library lists "Firstname Surname".
  const base = author.includes(',') ? author.split(',')[0] : author;
  const tokens = normalize(base).split(' ').filter(Boolean);
  return tokens[tokens.length - 1] ?? '';
}

/** True when one normalized title contains the other — tolerant of subtitles. */
function titlesMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;

  // Otherwise require most of the shorter title's words to appear in the other.
  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na];
  const words = shorter.split(' ').filter((w) => w.length > 2);
  if (!words.length) return false;
  const hit = words.filter((w) => longer.includes(w)).length;
  return hit / words.length >= 0.7;
}

function pickFormat(formats: Record<string, string>, prefix: string): string {
  const key = Object.keys(formats).find(
    (k) => k.startsWith(prefix) && !k.includes('zip') && !formats[k].endsWith('.zip')
  );
  return key ? formats[key] : '';
}

/**
 * Finds a public-domain edition readable in-app, or null.
 *
 * Matching is deliberately strict: the top Gutendex results must agree on both
 * the title and the author's surname, so an in-copyright book cannot be matched
 * to an unrelated classic that happens to share a word.
 */
export async function findReadableEdition(
  book: { title: string; authors: string[] },
  signal?: AbortSignal
): Promise<ReadableEdition | null> {
  const authorSurname = surname(book.authors[0] ?? '');
  const query = normalize(`${book.title} ${authorSurname}`);
  if (!query) return null;

  const res = await fetch(`${GUTENDEX_ROOT}?search=${encodeURIComponent(query)}`, { signal });
  if (!res.ok) return null;

  const json: { results?: GutendexBook[] } = await res.json();

  for (const candidate of (json.results ?? []).slice(0, 5)) {
    const titleOk = titlesMatch(book.title, candidate.title);
    const authorOk =
      !authorSurname ||
      candidate.authors.some((a) => normalize(a.name).includes(authorSurname));

    if (!titleOk || !authorOk) continue;

    const htmlUrl = pickFormat(candidate.formats, 'text/html');
    const textUrl = pickFormat(candidate.formats, 'text/plain');
    if (!htmlUrl && !textUrl) continue;

    return {
      gutenbergId: candidate.id,
      title: candidate.title,
      author: candidate.authors[0]?.name ?? '',
      htmlUrl,
      textUrl,
    };
  }

  return null;
}

/** Fetches the plain-text body of a readable edition. */
export async function fetchReadableText(
  edition: ReadableEdition,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch(edition.textUrl || edition.htmlUrl, { signal });
  if (!res.ok) throw new Error(`Could not load the book (${res.status}).`);
  return res.text();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Strips Project Gutenberg's licence header and footer.
 *
 * The body sits between the START and END banners; when they are missing (a
 * rare formatting variant) the whole text is kept rather than dropped.
 */
function stripGutenbergBoilerplate(text: string): string {
  const start = text.match(/\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG.*?\*\*\*/i);
  const end = text.match(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG.*?\*\*\*/i);

  const from = start ? start.index! + start[0].length : 0;
  const to = end ? end.index! : text.length;
  return text.slice(from, to).trim();
}

export type ReaderThemeName = 'dark' | 'sepia' | 'light';

export type ReaderTheme = {
  /** Page background. */
  bg: string;
  /** Body text. */
  fg: string;
  /** Muted text (title-page byline, chapter rules). */
  muted: string;
  /** Accent for drop cap and selection. */
  accent: string;
  /** Raised surface for the header and controls panel. */
  surface: string;
  /** Hairline for chrome borders. */
  border: string;
  /** Whether surrounding UI chrome should use light or dark content on `bg`. */
  ui: 'light' | 'dark';
};

/** Reading-surface themes. Separate from the app's dark-only chrome. */
export const READER_THEMES: Record<ReaderThemeName, ReaderTheme> = {
  dark: {
    bg: '#14141B', fg: '#D8D8E0', muted: '#8A8A97', accent: '#F5A524',
    surface: '#20202B', border: '#2E2E3A', ui: 'light',
  },
  sepia: {
    bg: '#F3E7CE', fg: '#463A28', muted: '#95805C', accent: '#B0791F',
    surface: '#E9DBBB', border: '#D8C7A2', ui: 'dark',
  },
  light: {
    bg: '#FCFBF7', fg: '#22201C', muted: '#7A756C', accent: '#C0791A',
    surface: '#F1EFE9', border: '#E3DFD6', ui: 'dark',
  },
};

/** Font sizes the reader steps through, in px. */
export const READER_FONT_SIZES = [16, 18, 20, 22, 24, 27];

/** Everything the reader document tells the host about. */
export type ReaderMessage =
  | { type: 'progress'; value: number }
  /** The reader highlighted a short phrase and may want it defined. */
  | { type: 'lookup'; word: string; context: string };

/**
 * Decodes a message from the reader document.
 *
 * Both surfaces route through here: the native WebView hands over a JSON string
 * from `postMessage`, while on web the browser has already structured-cloned it
 * into an object. Anything unrecognised yields `null` — a page can post whatever
 * it likes, and on web `window` also carries unrelated traffic.
 */
export function parseReaderMessage(data: unknown): ReaderMessage | null {
  let payload = data;

  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      return null;
    }
  }

  if (!payload || typeof payload !== 'object') return null;
  const message = payload as Record<string, unknown>;

  if (message.type === 'progress' && typeof message.value === 'number') {
    if (Number.isNaN(message.value)) return null;
    return { type: 'progress', value: message.value };
  }

  if (message.type === 'lookup' && typeof message.word === 'string' && message.word) {
    return {
      type: 'lookup',
      word: message.word,
      context: typeof message.context === 'string' ? message.context : '',
    };
  }

  return null;
}

export type ReaderDocOptions = {
  title: string;
  author: string;
  theme: ReaderTheme;
  fontPx: number;
};

/** Short, heading-like blocks (e.g. "CHAPTER I") get their own styling. */
function isHeading(block: string): boolean {
  const t = block.trim();
  if (t.length > 48 || t.includes('\n')) return false;
  if (/^(chapter|part|book|prologue|epilogue|canto|act|scene)\b/i.test(t)) return true;
  // A short all-caps line (roman numerals, section titles).
  return t.length >= 2 && t === t.toUpperCase() && /[A-Z]/.test(t);
}

/**
 * Builds a self-contained, book-styled reader document from Gutenberg plain
 * text.
 *
 * The theme and font size are exposed as CSS custom properties so the host can
 * restyle live (`document.documentElement.style.setProperty`) without rebuilding
 * the document and losing the reader's place. A scroll listener reports reading
 * position — via `ReactNativeWebView` on native and `postMessage` to the parent
 * window on web — so one document serves both `ReaderView` surfaces.
 */
export function buildReaderDocument(rawText: string, opts: ReaderDocOptions): string {
  const body = stripGutenbergBoilerplate(rawText);

  const blocks = body
    .split(/\n\s*\n/)
    // Strip illustration markers and the stray bracket lines they leave behind,
    // then drop blocks that were nothing but that noise.
    .map((block) =>
      block
        .replace(/\[illustration:[^\]]*\]?/gi, '')
        .replace(/^\s*[[\]]\s*$/gm, '')
        .trim()
    )
    .filter(Boolean);

  // The drop cap belongs on the opening of real prose, not on a short line of
  // front matter (a publisher name, a roman numeral), so wait for the first
  // substantial letter-initial paragraph.
  let leadDone = false;
  const content = blocks
    .map((block) => {
      const inline = escapeHtml(block)
        // Gutenberg plain text marks italics with _underscores_.
        .replace(/_([^_\n]+)_/g, '<em>$1</em>')
        .replace(/\n/g, '<br/>');

      if (isHeading(block)) return `<h2>${inline}</h2>`;

      const isProse = /^["'“‘]?[A-Za-z]/.test(block) && block.length >= 80;
      if (!leadDone && isProse) {
        leadDone = true;
        return `<p class="lead">${inline}</p>`;
      }
      return `<p>${inline}</p>`;
    })
    .join('\n');

  const { theme, fontPx } = opts;

  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  :root {
    --bg: ${theme.bg};
    --fg: ${theme.fg};
    --muted: ${theme.muted};
    --accent: ${theme.accent};
    --fs: ${fontPx}px;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--bg); }
  body {
    color: var(--fg);
    font-family: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
    font-size: var(--fs);
    line-height: 1.75;
    padding: 28px 26px calc(96px + env(safe-area-inset-bottom, 0px));
    max-width: 40rem;
    margin: 0 auto;
    -webkit-text-size-adjust: 100%;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  .titlepage {
    text-align: center;
    margin: 8px 0 40px;
    padding-bottom: 28px;
    border-bottom: 1px solid var(--muted);
  }
  .titlepage h1 {
    font-size: 1.5em;
    line-height: 1.25;
    margin: 0 0 10px;
    font-weight: 600;
  }
  .titlepage .byline {
    color: var(--muted);
    font-style: italic;
    font-size: 0.95em;
    margin: 0;
  }
  h2 {
    font-size: 1.15em;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-align: center;
    margin: 2em 0 1em;
  }
  p { margin: 0 0 1.15em; }
  /* Indent successive paragraphs like a printed book; leads stay flush. */
  p + p { margin-top: -0.5em; text-indent: 1.4em; }
  .lead { text-indent: 0; }
  .lead::first-letter {
    float: left;
    font-size: 3.1em;
    line-height: 0.72;
    padding: 0.05em 0.09em 0 0;
    color: var(--accent);
    font-weight: 600;
  }
  em { font-style: italic; }
  ::selection { background: var(--accent); color: var(--bg); }
</style>
</head>
<body>
  <div class="titlepage">
    <h1>${escapeHtml(opts.title)}</h1>
    <p class="byline">${escapeHtml(opts.author)}</p>
  </div>
  ${content}
<script>
  (function () {
    function send(payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      } else if (window.parent) {
        window.parent.postMessage({ pagetrail: payload }, '*');
      }
    }

    function reportScroll() {
      var el = document.documentElement;
      var max = el.scrollHeight - el.clientHeight;
      send({ type: 'progress', value: max > 0 ? el.scrollTop / max : 0 });
    }

    var ticking = false;
    document.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { reportScroll(); ticking = false; });
    }, { passive: true });

    /* The sentence the highlight sits in, so the host can show the word in the
       context it was met — pulled from the enclosing block, not the whole page. */
    function contextFor(selection, phrase) {
      var node = selection.anchorNode;
      var element = node && (node.nodeType === 1 ? node : node.parentElement);
      var block = element && element.closest ? element.closest('p, h2, li') : null;
      var text = (block && block.textContent) || '';
      var at = text.indexOf(phrase);
      if (at < 0) return '';

      var from = 0;
      for (var i = at - 1; i >= 0; i--) {
        var before = text.charAt(i);
        if (before === '.' || before === '!' || before === '?') { from = i + 1; break; }
      }
      var to = text.length;
      for (var j = at + phrase.length; j < text.length; j++) {
        var after = text.charAt(j);
        if (after === '.' || after === '!' || after === '?') { to = j + 1; break; }
      }
      return text.slice(from, to).replace(/\\s+/g, ' ').trim().slice(0, 240);
    }

    var lastSent = '';

    function reportSelection() {
      var selection = document.getSelection();
      if (!selection || selection.isCollapsed) { lastSent = ''; return; }

      var phrase = selection.toString().replace(/\\s+/g, ' ').trim();
      /* A long highlight means the reader is copying a passage, not asking what
         a word means, so only short phrases are offered for lookup. */
      if (!phrase || phrase.length > 40 || phrase.split(' ').length > 3) return;
      if (!/[A-Za-z]/.test(phrase) || phrase === lastSent) return;

      lastSent = phrase;
      send({ type: 'lookup', word: phrase, context: contextFor(selection, phrase) });
    }

    /* Debounced: 'selectionchange' fires continuously while a selection handle is
       being dragged, and we only want the word the reader settled on. */
    var pending = null;
    document.addEventListener('selectionchange', function () {
      if (pending) clearTimeout(pending);
      pending = setTimeout(reportSelection, 400);
    }, { passive: true });
  })();
</script>
</body>
</html>`;
}
