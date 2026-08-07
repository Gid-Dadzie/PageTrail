import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import {
  removeWord,
  saveWord,
  setWordLearned,
  subscribeToVocabulary,
  wordId,
  type SavedWord,
  type SavedWordInput,
} from '@/services/vocabulary';

export type Vocabulary = {
  words: SavedWord[];
  /** True once the reader has this word on their list (any inflection of it). */
  isSaved: (word: string) => boolean;
  save: (input: SavedWordInput) => Promise<void>;
  remove: (word: string) => Promise<void>;
  setLearned: (word: string, learned: boolean) => Promise<void>;
};

/**
 * Live view of the signed-in reader's word list, shared by the Words tab and the
 * reader's lookup sheet so a word saved in one place is instantly saved in both.
 * Mutations are no-ops while signed out rather than throwing.
 */
export function useVocabulary(): Vocabulary {
  const { user } = useAuth();
  const [words, setWords] = useState<SavedWord[]>([]);

  useEffect(() => {
    if (!user) {
      setWords([]);
      return;
    }
    return subscribeToVocabulary(user.uid, setWords);
  }, [user]);

  const ids = useMemo(() => new Set(words.map((w) => w.id)), [words]);

  return {
    words,
    isSaved: useCallback((word: string) => ids.has(wordId(word)), [ids]),
    save: useCallback(
      async (input: SavedWordInput) => {
        if (user) await saveWord(user.uid, input);
      },
      [user]
    ),
    remove: useCallback(
      async (word: string) => {
        if (user) await removeWord(user.uid, word);
      },
      [user]
    ),
    setLearned: useCallback(
      async (word: string, learned: boolean) => {
        if (user) await setWordLearned(user.uid, word, learned);
      },
      [user]
    ),
  };
}
