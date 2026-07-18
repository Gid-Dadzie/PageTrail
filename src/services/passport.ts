/**
 * Book Passport — the provenance trail described in the proposal.
 *
 * Every physical copy exchanged through PageTrail carries a passport keyed by
 * ISBN + a unique copy code. Each owner can leave a note pinned to a page, and
 * a note stays sealed for the next reader until they reach that page — turning
 * a second-hand copy into a chain of prior readers' reactions.
 */

import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { logSnapshotError } from './errors';
import { db } from './firebase';

export type PassportNote = {
  id: string;
  authorId: string;
  authorName: string;
  /** The page this note is pinned to; it unlocks once a reader passes it. */
  page: number;
  text: string;
  createdAt: Date | null;
};

export type PassportOwner = {
  userId: string;
  displayName: string;
  /** ISO date the copy was received. */
  since: string;
};

export type Passport = {
  /** The copy code, e.g. `PT-9780141-4F2A`. */
  code: string;
  bookId: string;
  isbn: string;
  title: string;
  coverUrl: string;
  currentOwnerId: string;
  owners: PassportOwner[];
  createdAt: Date | null;
};

/** Copy codes are human-readable so they can be written inside a physical book. */
export function generateCopyCode(isbn: string): string {
  const isbnPart = (isbn || '000000').replace(/\D/g, '').slice(0, 7).padEnd(7, '0');
  const random = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `PT-${isbnPart}-${random}`;
}

function passportRef(code: string) {
  return doc(db, 'passports', code);
}

function notesCollection(code: string) {
  return collection(db, 'passports', code, 'notes');
}

/** Mints a passport for a physical copy the user is putting into circulation. */
export async function createPassport(input: {
  bookId: string;
  isbn: string;
  title: string;
  coverUrl: string;
  ownerId: string;
  ownerName: string;
}): Promise<string> {
  const code = generateCopyCode(input.isbn);

  await setDoc(passportRef(code), {
    code,
    bookId: input.bookId,
    isbn: input.isbn,
    title: input.title,
    coverUrl: input.coverUrl,
    currentOwnerId: input.ownerId,
    owners: [
      {
        userId: input.ownerId,
        displayName: input.ownerName,
        since: new Date().toISOString().slice(0, 10),
      },
    ],
    createdAt: serverTimestamp(),
  });

  return code;
}

export async function fetchPassport(code: string): Promise<Passport | null> {
  const snap = await getDoc(passportRef(code));
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    code: data.code,
    bookId: data.bookId,
    isbn: data.isbn ?? '',
    title: data.title ?? '',
    coverUrl: data.coverUrl ?? '',
    currentOwnerId: data.currentOwnerId,
    owners: data.owners ?? [],
    createdAt: data.createdAt?.toDate?.() ?? null,
  };
}

/** Hands the copy to a new reader, appending them to the provenance chain. */
export async function transferPassport(
  code: string,
  newOwner: { userId: string; displayName: string }
): Promise<void> {
  await updateDoc(passportRef(code), {
    currentOwnerId: newOwner.userId,
    owners: arrayUnion({
      userId: newOwner.userId,
      displayName: newOwner.displayName,
      since: new Date().toISOString().slice(0, 10),
    }),
  });
}

export async function addPassportNote(
  code: string,
  note: { authorId: string; authorName: string; page: number; text: string }
): Promise<void> {
  await addDoc(notesCollection(code), { ...note, createdAt: serverTimestamp() });
}

export function subscribeToNotes(code: string, onChange: (notes: PassportNote[]) => void) {
  const q = query(notesCollection(code), orderBy('page', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            authorId: data.authorId,
            authorName: data.authorName ?? 'A reader',
            page: data.page ?? 0,
            text: data.text ?? '',
            createdAt: data.createdAt?.toDate?.() ?? null,
          };
        })
      );
    },
    (error) => {
      logSnapshotError('passport notes')(error);
      onChange([]);
    }
  );
}

export type NoteVisibility = {
  note: PassportNote;
  /** False while the reader has not yet reached `note.page`. */
  unlocked: boolean;
};

/**
 * Applies the progress gate.
 *
 * A note unlocks when the reader passes its page, when they wrote it, or when
 * they paid PageCoins to unlock the passport early.
 */
export function applyNoteGate(
  notes: PassportNote[],
  opts: { currentPage: number; viewerId: string; earlyUnlock: boolean }
): NoteVisibility[] {
  return notes.map((note) => ({
    note,
    unlocked:
      opts.earlyUnlock || note.authorId === opts.viewerId || opts.currentPage >= note.page,
  }));
}
