import type { Word } from "./library";

export type FlashcardProgress = {
  attempts: number;
  correct: number;
  streak: number;
  lastReviewed: string;
  dueAt: string;
};
export type FlashcardHistory = Record<string, FlashcardProgress>;
const normalize = (text: string) => text.normalize("NFKC").trim().toLocaleLowerCase("en").replace(/\s+/g, " ");

// Content editors may recreate vocabulary row IDs. Progress follows the word
// in its story so that editing its illustration does not reset learning.
export function flashcardKey(word: Pick<Word, "story_slug" | "word_en" | "word_vi">) {
  return [word.story_slug, normalize(word.word_en), normalize(word.word_vi)].map(encodeURIComponent).join(":");
}
export function flashcardReady(word: Pick<Word, "word_vi" | "word_en" | "illustration_path" | "pronunciation_path">) {
  const localMedia = (value: string | null) => !!value?.startsWith("/") && !value.startsWith("//");
  return !!word.word_vi.trim() && !!word.word_en.trim() && localMedia(word.illustration_path) && localMedia(word.pronunciation_path);
}
export function shuffled<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function pictureOptions(target: Word, pool: Word[], random = Math.random) {
  const english = new Set([normalize(target.word_en)]);
  const vietnamese = new Set([normalize(target.word_vi)]);
  const images = new Set([target.illustration_path]);
  const alternatives = shuffled(pool, random).filter(word => {
    const en = normalize(word.word_en), vi = normalize(word.word_vi);
    if (!flashcardReady(word) || english.has(en) || vietnamese.has(vi) || images.has(word.illustration_path)) return false;
    english.add(en); vietnamese.add(vi); images.add(word.illustration_path);
    return true;
  }).slice(0, 3);
  return shuffled([target, ...alternatives], random);
}
const day = 86_400_000, offset = 7 * 60 * 60 * 1000;
function learningDay(time: number) { return Math.floor((time + offset) / day); }
export function reviewWord(previous: FlashcardProgress | undefined, correct: boolean, now = Date.now()): FlashcardProgress {
  const alreadyReviewedToday = previous && learningDay(Date.parse(previous.lastReviewed)) === learningDay(now);
  const streak = correct ? Math.min(4, alreadyReviewedToday ? Math.max(1, previous.streak) : (previous?.streak ?? 0) + 1) : 0;
  const interval = [1, 1, 3, 7, 14][streak];
  return {
    attempts: (previous?.attempts ?? 0) + 1,
    correct: (previous?.correct ?? 0) + Number(correct),
    streak,
    lastReviewed: new Date(now).toISOString(),
    dueAt: new Date((learningDay(now) + interval) * day - offset).toISOString(),
  };
}
export function dueWords(words: Word[], history: FlashcardHistory, now = Date.now()) {
  return words.filter(word => history[flashcardKey(word)] && Date.parse(history[flashcardKey(word)].dueAt) <= now);
}
export function learningDeck(words: Word[], history: FlashcardHistory, size = 10, now = Date.now(), random = Math.random) {
  return shuffled(words.filter(flashcardReady), random).sort((a, b) => {
    const priority = (word: Word) => {
      const progress = history[flashcardKey(word)];
      return !progress ? 1 : Date.parse(progress.dueAt) <= now ? 0 : 2;
    };
    return priority(a) - priority(b);
  }).slice(0, size);
}
