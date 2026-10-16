import type { DeviceData } from "./device-store";
import type { Question, Story, Word } from "./library";
import { flashcardKey, flashcardReady, learningDeck } from "./flashcards";

export type DailyQuestion = Question & { story_slug: string };
export type DailyPlan = {
  storySlug: string;
  wordKeys: string[];
  questionIds: string[];
  createdAt: string;
  readAt?: string;
  reviewedWords: string[];
  answeredQuestions: string[];
  awardedAt?: string;
};
export type DailyHistory = Record<string, DailyPlan>;
// Daily tasks use the same Vietnamese learning day as spaced repetition.
export function learningDate(now = Date.now()) { return new Date(now + 7 * 3_600_000).toISOString().slice(0, 10); }
export function dailyProgress(plan?: DailyPlan) {
  return plan ? Number(!!plan.readAt) + Number(plan.wordKeys.every(key => plan.reviewedWords.includes(key))) + Number(plan.questionIds.every(id => plan.answeredQuestions.includes(id))) : 0;
}
export function learningStars(data: Pick<DeviceData, "daily">) { return Object.values(data.daily ?? {}).filter(plan => !!plan.awardedAt).length; }
function hash(text: string) { let value = 0; for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0; return value; }
export function dailyCandidates(stories: Story[], words: Word[], questions: DailyQuestion[]) {
  if (new Set(words.filter(flashcardReady).map(flashcardKey)).size < 3) return [];
  return stories.filter(story => new Set(questions.filter(question => question.story_slug === story.slug).map(question => question.id)).size >= 3);
}
export function createDailyPlan(stories: Story[], words: Word[], questions: DailyQuestion[], data: DeviceData, now = Date.now(), preferredSlug?: string): DailyPlan | null {
  const day = learningDate(now);
  const candidates = dailyCandidates(stories, words, questions).sort((a, b) =>
    Number(Object.hasOwn(data.finished, a.slug)) - Number(Object.hasOwn(data.finished, b.slug)) ||
    Math.abs(a.estimated_minutes - 5) - Math.abs(b.estimated_minutes - 5) || hash(`${day}:${a.slug}`) - hash(`${day}:${b.slug}`) || a.slug.localeCompare(b.slug));
  const story = preferredSlug ? candidates.find(story => story.slug === preferredSlug) : candidates[0];
  if (!story) return null;
  let seed = hash(`${day}:${story.slug}`);
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const pool = [...new Map(words.filter(flashcardReady).map(word => [flashcardKey(word), word])).values()];
  const selected = learningDeck(pool.filter(word => word.story_slug === story.slug), data.flashcards, 3, now, random);
  // Existing stories may have only one illustrated word. Fill the remaining
  // places from the shared vocabulary, preserving spaced-repetition priority.
  const selectedKeys = new Set(selected.map(flashcardKey));
  selected.push(...learningDeck(pool.filter(word => !selectedKeys.has(flashcardKey(word))), data.flashcards, 3 - selected.length, now, random));
  return {
    storySlug: story.slug, wordKeys: selected.map(flashcardKey),
    questionIds: [...new Set(questions.filter(question => question.story_slug === story.slug).map(question => question.id))].slice(0, 3),
    createdAt: new Date(now).toISOString(), reviewedWords: [], answeredQuestions: [],
  };
}
function updateToday(data: DeviceData, update: (plan: DailyPlan) => DailyPlan, now: number): DeviceData {
  const day = learningDate(now), plan = data.daily?.[day];
  if (!plan) return data;
  const next = update(plan);
  if (next === plan) return data;
  if (dailyProgress(next) === 3 && !next.awardedAt) next.awardedAt = new Date(now).toISOString();
  return { ...data, daily: { ...data.daily, [day]: next } };
}
export function recordDailyReading(data: DeviceData, slug: string, now = Date.now()) {
  return updateToday(data, plan => plan.storySlug === slug && !plan.readAt ? { ...plan, readAt: new Date(now).toISOString() } : plan, now);
}
export function recordDailyWord(data: DeviceData, key: string, now = Date.now()) {
  return updateToday(data, plan => plan.wordKeys.includes(key) && !plan.reviewedWords.includes(key) ? { ...plan, reviewedWords: [...plan.reviewedWords, key] } : plan, now);
}
export function recordDailyQuiz(data: DeviceData, day: string, slug: string, ids: string[], now = Date.now()) {
  if (day !== learningDate(now)) return data;
  return updateToday(data, plan => plan.storySlug === slug && plan.questionIds.every(id => ids.includes(id)) && plan.answeredQuestions.length < 3 ? { ...plan, answeredQuestions: [...plan.questionIds] } : plan, now);
}
