/**
 * Word lookup for the reader and the Words tab.
 *
 * Definitions come from the keyless Free Dictionary API (Wiktionary data), which
 * keeps the same posture as the rest of the catalogue: Open Library for
 * metadata, Gutendex for text, no API key and no server of our own.
 *
 * A miss is a normal outcome rather than an error — readers highlight proper
 * nouns, dialect spellings and archaic forms constantly — so `lookupWord`
 * resolves to `null` instead of throwing when nothing is found.
 */

const DICTIONARY_ROOT = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

export type WordSense = {
  partOfSpeech: string;
  definition: string;
  /** Usage sentence, when the entry carries one. */
  example: string;
  synonyms: string[];
};

export type WordEntry = {
  /** The headword the dictionary answered with. */
  word: string;
  /**
   * The term the reader actually highlighted, when it differed from `word`
   * because an inflection had to be stripped ("stopped" -> "stop"). Empty when
   * the highlighted word was found as-is.
   */
  matchedFrom: string;
  /** IPA pronunciation, e.g. "/ˌsɛɹənˈdɪpɪti/". Empty when unavailable. */
  phonetic: string;
  senses: WordSense[];
  /** Attribution target — the source data is CC BY-SA and asks for a credit. */
  sourceUrl: string;
};

/** Senses beyond this are long-tail Wiktionary trivia, not reading help. */
const MAX_SENSES = 10;

type ApiDefinition = { definition?: string; example?: string; synonyms?: string[] };
type ApiMeaning = { partOfSpeech?: string; definitions?: ApiDefinition[] };
type ApiEntry = {
  word?: string;
  phonetic?: string;
  phonetics?: { text?: string }[];
  meanings?: ApiMeaning[];
  sourceUrls?: string[];
};

/**
 * Reduces a highlighted fragment to something lookupable: drops the surrounding
 * punctuation a word carries in prose ("—well," / "'Tis") and the possessive,
 * but keeps internal hyphens and apostrophes so "well-known" and "don't" stay
 * whole.
 */
export function normalizeTerm(raw: string): string {
  return raw
    .normalize('NFC')
    // Typographic apostrophes and dashes, as Gutenberg sets them.
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[‐-―]/g, '-')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    // Trim anything that isn't a letter from either end.
    .replace(/^[^a-z]+/, '')
    .replace(/[^a-z]+$/, '')
    .replace(/'s$/, '');
}

/** "stopped" -> "stopp" -> "stop": drops a doubled final consonant. */
function undouble(stem: string): string {
  const last = stem.slice(-1);
  return last && last === stem.slice(-2, -1) ? stem.slice(0, -1) : stem;
}

/**
 * The word itself, then progressively de-inflected guesses.
 *
 * Wiktionary carries many inflected forms already, so the exact word is always
 * tried first; these are only a fallback so that highlighting "hurrying" in a
 * novel still finds "hurry" instead of shrugging.
 */
function candidates(word: string): string[] {
  const out: string[] = [word];
  const add = (guess: string) => {
    if (guess.length >= 2 && !out.includes(guess)) out.push(guess);
  };

  if (word.endsWith('ies')) add(`${word.slice(0, -3)}y`);
  if (word.endsWith('es')) add(word.slice(0, -2));
  if (word.endsWith('s')) add(word.slice(0, -1));
  if (word.endsWith('ed')) {
    add(word.slice(0, -1)); // "used" -> "use"
    add(word.slice(0, -2)); // "walked" -> "walk"
    add(undouble(word.slice(0, -2))); // "stopped" -> "stop"
  }
  if (word.endsWith('ing')) {
    add(word.slice(0, -3)); // "reading" -> "read"
    add(`${word.slice(0, -3)}e`); // "writing" -> "write"
    add(undouble(word.slice(0, -3))); // "running" -> "run"
  }
  if (word.endsWith('ly')) add(word.slice(0, -2));
  if (word.endsWith('est')) add(word.slice(0, -3));
  if (word.endsWith('er')) add(word.slice(0, -2));

  return out;
}

function toEntry(payload: ApiEntry[], term: string): WordEntry | null {
  const senses: WordSense[] = [];
  const seen = new Set<string>();

  for (const entry of payload) {
    for (const meaning of entry.meanings ?? []) {
      for (const def of meaning.definitions ?? []) {
        const definition = def.definition?.trim();
        if (!definition || seen.has(definition)) continue;
        seen.add(definition);
        senses.push({
          partOfSpeech: meaning.partOfSpeech ?? '',
          definition,
          example: def.example?.trim() ?? '',
          synonyms: (def.synonyms ?? []).slice(0, 6),
        });
        if (senses.length >= MAX_SENSES) break;
      }
    }
  }

  if (!senses.length) return null;

  const word = payload.find((e) => e.word)?.word ?? term;
  const phonetic =
    payload.find((e) => e.phonetic)?.phonetic ??
    payload.flatMap((e) => e.phonetics ?? []).find((p) => p.text)?.text ??
    '';

  return {
    word,
    matchedFrom: '',
    phonetic,
    senses,
    sourceUrl:
      payload.find((e) => e.sourceUrls?.length)?.sourceUrls?.[0] ??
      `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`,
  };
}

async function fetchEntry(term: string, signal?: AbortSignal): Promise<WordEntry | null> {
  const res = await fetch(`${DICTIONARY_ROOT}${encodeURIComponent(term)}`, { signal });
  // 404 is the API's "no such word", which is a result and not a failure.
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Could not reach the dictionary (${res.status}).`);

  const json: unknown = await res.json();
  if (!Array.isArray(json)) return null;
  return toEntry(json as ApiEntry[], term);
}

/**
 * Looks a word up, returning `null` when the dictionary has no entry for it or
 * any of its de-inflected forms.
 */
export async function lookupWord(raw: string, signal?: AbortSignal): Promise<WordEntry | null> {
  const term = normalizeTerm(raw);
  if (!term) return null;

  for (const candidate of candidates(term)) {
    const entry = await fetchEntry(candidate, signal);
    if (entry) {
      // Tell the reader when we answered a different word than they highlighted,
      // so a wrong stem is visible rather than quietly misleading.
      return { ...entry, matchedFrom: candidate === term ? '' : term };
    }
  }

  return null;
}
