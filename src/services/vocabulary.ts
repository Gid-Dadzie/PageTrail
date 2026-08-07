/**
 * A reader's personal word list.
 *
 * Words are keyed by the word itself under the owning user, so looking the same
 * word up in two different books updates one entry instead of collecting
 * duplicates — and `isSaved` can be answered without a query.
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

import type { WordEntry } from './dictionary';
import { normalizeTerm } from './dictionary';
import { logSnapshotError } from './errors';
import { db } from './firebase';

export type SavedWord = {
  id: string;
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  /** The sentence the word was met in, when it was saved from the reader. */
  context: string;
  /** Where it was met. Empty when looked up from the Words tab directly. */
  bookId: string;
  bookTitle: string;
  /** Set by the reader once they no longer need the definition. */
  learned: boolean;
  savedAt: Date | null;
};

/**
 * What a lookup knows about a word. `learned` is absent by design — it belongs to
 * the reader's progress, not to the definition, and is set only by `setWordLearned`.
 */
export type SavedWordInput = Omit<SavedWord, 'id' | 'savedAt' | 'learned'>;

/** Where a word was picked up, if it came from a book. */
export type WordSource = {
  context?: string;
  bookId?: string;
  bookTitle?: string;
};

function vocabularyCollection(userId: string) {
  return collection(db, 'users', userId, 'vocabulary');
}

/**
 * Firestore document id for a word. Normalising first is what makes the list
 * case- and punctuation-insensitive; the final replace only guards against
 * characters Firestore rejects in a document id.
 */
export function wordId(word: string): string {
  return normalizeTerm(word).replace(/[^a-z0-9'-]/g, '-') || 'unknown';
}

/** Flattens a dictionary entry into the row we store for its primary sense. */
export function savedWordFrom(entry: WordEntry, source: WordSource = {}): SavedWordInput {
  const primary = entry.senses[0];

  return {
    word: entry.word,
    phonetic: entry.phonetic,
    partOfSpeech: primary?.partOfSpeech ?? '',
    definition: primary?.definition ?? '',
    example: primary?.example ?? '',
    context: source.context ?? '',
    bookId: source.bookId ?? '',
    bookTitle: source.bookTitle ?? '',
  };
}

/**
 * Saves (or refreshes) a word.
 *
 * `learned` is never written here, only by `setWordLearned` — so meeting a word
 * again in a second book refreshes where it was found without quietly undoing
 * the reader's progress on it. A new document simply has no `learned` field,
 * which `subscribeToVocabulary` reads as `false`.
 */
export async function saveWord(userId: string, input: SavedWordInput): Promise<void> {
  await setDoc(
    doc(vocabularyCollection(userId), wordId(input.word)),
    { ...input, savedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function removeWord(userId: string, word: string): Promise<void> {
  await deleteDoc(doc(vocabularyCollection(userId), wordId(word)));
}

export async function setWordLearned(
  userId: string,
  word: string,
  learned: boolean
): Promise<void> {
  await updateDoc(doc(vocabularyCollection(userId), wordId(word)), { learned });
}

export function subscribeToVocabulary(userId: string, onChange: (words: SavedWord[]) => void) {
  return onSnapshot(
    query(vocabularyCollection(userId)),
    (snapshot) => {
      const words: SavedWord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          word: data.word ?? d.id,
          phonetic: data.phonetic ?? '',
          partOfSpeech: data.partOfSpeech ?? '',
          definition: data.definition ?? '',
          example: data.example ?? '',
          context: data.context ?? '',
          bookId: data.bookId ?? '',
          bookTitle: data.bookTitle ?? '',
          learned: data.learned ?? false,
          savedAt: data.savedAt?.toDate?.() ?? null,
        };
      });

      // Newest first, like the shelves — sorted here rather than in the query so
      // the listener needs no composite index.
      words.sort((a, b) => (b.savedAt?.getTime() ?? 0) - (a.savedAt?.getTime() ?? 0));
      onChange(words);
    },
    (error) => {
      logSnapshotError('vocabulary')(error);
      onChange([]);
    }
  );
}
