/**
 * Reading shelves — "Currently Reading", "Finished", and "Want to Read".
 *
 * Entries are keyed by book id under the owning user, so a book can only appear
 * on one shelf at a time and moving shelves is a single write.
 */

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { logSnapshotError } from './errors';
import { db } from './firebase';

export type ShelfStatus = 'reading' | 'read' | 'wantToRead';

export const SHELF_LABELS: Record<ShelfStatus, string> = {
  reading: 'Currently Reading',
  read: 'Finished',
  wantToRead: 'Want to Read',
};

export type ShelfEntry = {
  id: string;
  bookId: string;
  title: string;
  authors: string[];
  coverUrl: string;
  isbn: string;
  status: ShelfStatus;
  /** Pages read so far. */
  progress: number;
  totalPages: number;
  rating: number;
  review: string;
  categories: string[];
  /** Set the first time the entry moves to `read`; drives the stats dashboard. */
  finishedAt: Date | null;
  startedAt: Date | null;
  updatedAt: Date | null;
};

export type ShelfEntryInput = Omit<ShelfEntry, 'id' | 'finishedAt' | 'startedAt' | 'updatedAt'>;

function shelfCollection(userId: string) {
  return collection(db, 'users', userId, 'shelfEntries');
}

export async function addOrUpdateShelfEntry(
  userId: string,
  entry: Partial<ShelfEntryInput> & Pick<ShelfEntryInput, 'bookId'>
): Promise<void> {
  const ref = doc(shelfCollection(userId), entry.bookId);

  await setDoc(
    ref,
    {
      ...entry,
      updatedAt: serverTimestamp(),
      ...(entry.status === 'reading' ? { startedAt: serverTimestamp() } : {}),
      ...(entry.status === 'read' ? { finishedAt: serverTimestamp() } : {}),
    },
    { merge: true }
  );
}

/** Updates pages read, auto-finishing the book when progress reaches the end. */
export async function updateProgress(
  userId: string,
  bookId: string,
  pagesRead: number,
  totalPages: number
): Promise<{ finished: boolean }> {
  const clamped = Math.max(0, totalPages > 0 ? Math.min(pagesRead, totalPages) : pagesRead);
  const finished = totalPages > 0 && clamped >= totalPages;

  await updateDoc(doc(shelfCollection(userId), bookId), {
    progress: clamped,
    updatedAt: serverTimestamp(),
    ...(finished ? { status: 'read', finishedAt: serverTimestamp() } : {}),
  });

  return { finished };
}

export async function rateShelfEntry(
  userId: string,
  bookId: string,
  rating: number,
  review = ''
): Promise<void> {
  await updateDoc(doc(shelfCollection(userId), bookId), {
    rating,
    review,
    updatedAt: serverTimestamp(),
  });
}

export async function removeShelfEntry(userId: string, bookId: string): Promise<void> {
  await deleteDoc(doc(shelfCollection(userId), bookId));
}

export function subscribeToShelf(userId: string, onChange: (entries: ShelfEntry[]) => void) {
  const q = query(shelfCollection(userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: ShelfEntry[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          bookId: data.bookId ?? d.id,
          title: data.title ?? '',
          authors: data.authors ?? [],
          coverUrl: data.coverUrl ?? '',
          isbn: data.isbn ?? '',
          status: (data.status ?? 'wantToRead') as ShelfStatus,
          progress: data.progress ?? 0,
          totalPages: data.totalPages ?? 0,
          rating: data.rating ?? 0,
          review: data.review ?? '',
          categories: data.categories ?? [],
          finishedAt: data.finishedAt?.toDate?.() ?? null,
          startedAt: data.startedAt?.toDate?.() ?? null,
          updatedAt: data.updatedAt?.toDate?.() ?? null,
        };
      });

      entries.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
      onChange(entries);
    },
    (error) => {
      logSnapshotError('shelves')(error);
      onChange([]);
    }
  );
}

export type ReadingStats = {
  booksFinished: number;
  pagesRead: number;
  currentlyReading: number;
  wantToRead: number;
  averageRating: number;
  /** Books finished per month key (`YYYY-MM`), for the stats dashboard. */
  byMonth: Record<string, number>;
  /** Books finished per genre. */
  byGenre: Record<string, number>;
};

export function computeStats(entries: ShelfEntry[]): ReadingStats {
  const finished = entries.filter((e) => e.status === 'read');
  const rated = entries.filter((e) => e.rating > 0);

  const byMonth: Record<string, number> = {};
  const byGenre: Record<string, number> = {};

  for (const entry of finished) {
    if (entry.finishedAt) {
      const key = `${entry.finishedAt.getFullYear()}-${String(
        entry.finishedAt.getMonth() + 1
      ).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] ?? 0) + 1;
    }
    const genre = entry.categories[0];
    if (genre) byGenre[genre] = (byGenre[genre] ?? 0) + 1;
  }

  return {
    booksFinished: finished.length,
    // A finished book counts fully even when progress was never logged page by page.
    pagesRead: entries.reduce(
      (sum, e) => sum + (e.status === 'read' ? e.totalPages || e.progress : e.progress),
      0
    ),
    currentlyReading: entries.filter((e) => e.status === 'reading').length,
    wantToRead: entries.filter((e) => e.status === 'wantToRead').length,
    averageRating: rated.length ? rated.reduce((sum, e) => sum + e.rating, 0) / rated.length : 0,
    byMonth,
    byGenre,
  };
}
