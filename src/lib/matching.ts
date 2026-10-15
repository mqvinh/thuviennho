import type { Word } from "./library";

export type MatchingLanguage = "en" | "vi";
export type MatchingProgress = {
  plays: number;
  firstTry: number;
  mistakes: number;
  lastMistakes: number;
  lastPlayed: string;
};
export type MatchingHistory = Record<string, MatchingProgress>;
const normalize = (value: string) => value.normalize("NFKC").trim().toLocaleLowerCase("en").replace(/\s+/g, " ");

export function matchingReady(word: Pick<Word, "word_vi" | "word_en" | "illustration_path">) {
  return !!word.word_vi.trim() && !!word.word_en.trim() && !!word.illustration_path?.startsWith("/") && !word.illustration_path.startsWith("//");
}

// Scope by story/favorites before deduplicating: a duplicate in another story
// must not hide a word that belongs to the selected story.
export function uniqueMatchingWords(words: Word[]) {
  const english = new Set<string>(), vietnamese = new Set<string>(), pictures = new Set<string>();
  return words.filter(word => {
    if (!matchingReady(word)) return false;
    const en = normalize(word.word_en), vi = normalize(word.word_vi), image = word.illustration_path!;
    if (english.has(en) || vietnamese.has(vi) || pictures.has(image)) return false;
    english.add(en); vietnamese.add(vi); pictures.add(image);
    return true;
  });
}

// At most three rounds of four. Redistribute the last singleton so an ordinary
// round always offers a real choice. One pair is allowed only for retry practice.
export function matchingRounds(words: Word[], practice = false): Word[][] {
  const deck = uniqueMatchingWords(words).slice(0, 12);
  if (deck.length < (practice ? 1 : 2)) return [];
  const rounds: Word[][] = [];
  for (let i = 0; i < deck.length; i += 4) rounds.push(deck.slice(i, i + 4));
  if (rounds.length > 1 && rounds.at(-1)!.length === 1) rounds.at(-1)!.unshift(rounds.at(-2)!.pop()!);
  return rounds;
}

export function recordMatchingWord(previous: MatchingProgress | undefined, mistakes: number, now = Date.now()): MatchingProgress {
  return {
    plays: (previous?.plays ?? 0) + 1,
    firstTry: (previous?.firstTry ?? 0) + Number(mistakes === 0),
    mistakes: (previous?.mistakes ?? 0) + mistakes,
    lastMistakes: mistakes,
    lastPlayed: new Date(now).toISOString(),
  };
}
