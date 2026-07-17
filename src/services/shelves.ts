import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export type ShelfStatus = 'reading' | 'read' | 'wantToRead';

export type ShelfEntry = {
  id: string;
  bookId: string;
  title: string;
  authors: string[];
  coverUrl: string;
  status: ShelfStatus;
  progress: number;
  totalPages: number;
  rating: number;
};

function shelfCollection(userId: string) {
  return collection(db, 'users', userId, 'shelfEntries');
}

export async function addOrUpdateShelfEntry(
  userId: string,
  entry: Omit<ShelfEntry, 'id'>
) {
  const ref = doc(shelfCollection(userId), entry.bookId);
  await setDoc(
    ref,
    {
      ...entry,
      updatedAt: serverTimestamp(),
      addedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function removeShelfEntry(userId: string, bookId: string) {
  const ref = doc(shelfCollection(userId), bookId);
  await deleteDoc(ref);
}

export function subscribeToShelf(
  userId: string,
  onChange: (entries: ShelfEntry[]) => void
) {
  const q = query(shelfCollection(userId));
  return onSnapshot(q, (snapshot) => {
    const entries: ShelfEntry[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ShelfEntry, 'id'>),
    }));
    onChange(entries);
  });
}