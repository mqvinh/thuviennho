import assert from "node:assert/strict";
import { test } from "node:test";
import { createDailyPlan, dailyCandidates, dailyProgress, learningDate, learningStars, recordDailyQuiz, recordDailyReading, recordDailyWord } from "../src/lib/daily-learning.ts";
import { parseDeviceBackup } from "../src/lib/device-backup.ts";
import { flashcardKey } from "../src/lib/flashcards.ts";

const now = Date.parse("2026-10-16T01:00:00.000Z"), day = learningDate(now);
const empty = () => parseDeviceBackup(JSON.stringify({ version: 1, favorites: [], started: {}, finished: {}, activities: {}, journal: [] }));
const story = (slug, estimated_minutes = 5) => ({ slug, estimated_minutes });
const wordsFor = slug => [1, 2, 3, 4].map(i => ({ id: `${slug}-${i}`, story_slug: slug, word_en: `word${i}`, word_vi: `tu${i}`, illustration_path: `/images/${i}.svg`, pronunciation_path: `/audio/${i}.mp3` }));
const questionsFor = slug => [1, 2, 3, 4].map(i => ({ id: `${slug}-q${i}`, story_slug: slug }));
const stories = [story("read"), story("far", 15), story("best"), story("incomplete", 9)];
const words = stories.flatMap(s => wordsFor(s.slug)), questions = stories.flatMap(s => questionsFor(s.slug));
function planned() { const data = empty(); data.daily = { [day]: createDailyPlan(stories, words, questions, data, now, "best") }; return data; }

test("Vietnam learning day changes exactly at midnight, independently of machine timezone", () => {
  assert.equal(learningDate(Date.parse("2026-10-15T16:59:59.999Z")), "2026-10-15");
  assert.equal(learningDate(Date.parse("2026-10-15T17:00:00.000Z")), "2026-10-16");
});
test("selection is deterministic, prefers unread short stories, and needs 3 distinct ready words and questions", () => {
  const data = empty(); data.finished.read = { title: "Read", date: new Date(now).toISOString() };
  const eligibleWords = words.filter(w => w.story_slug !== "incomplete" || w.id.endsWith("1"));
  const plan = createDailyPlan(stories, eligibleWords, questions, data, now);
  assert.equal(plan.storySlug, "best");
  assert.deepEqual(createDailyPlan(stories, eligibleWords, questions, data, now), plan);
  assert.equal(dailyCandidates(stories, eligibleWords, questions).length, 4);
  assert.equal(createDailyPlan(stories, [], questions, data, now), null);
  const supplemented = createDailyPlan(stories, eligibleWords, questions, data, now, "incomplete");
  assert.equal(supplemented.storySlug, "incomplete"); assert.equal(supplemented.wordKeys.length, 3);
  assert.ok(supplemented.wordKeys.includes(flashcardKey(wordsFor("incomplete")[0])));
  assert.equal(createDailyPlan(stories, words, questions.filter(q => q.story_slug !== "incomplete"), data, now, "incomplete"), null);
  assert.equal(dailyCandidates([story("best")], Array(4).fill(wordsFor("best")[0]), questions).length, 0);
  const due = wordsFor("best")[3];
  data.flashcards[flashcardKey(due)] = { attempts: 1, correct: 1, streak: 1, lastReviewed: "2026-10-14T01:00:00.000Z", dueAt: "2026-10-15T01:00:00.000Z" };
  const duePlan = createDailyPlan(stories, words, questions, data, now, "best");
  assert.equal(duePlan.wordKeys[0], flashcardKey(due));
});
test("real matching actions award exactly one daily star and preserve legacy reading, games and word schedules", () => {
  const initial = planned(), plan = initial.daily[day];
  initial.finished.best = { title: "Already read", date: "2026-10-01T01:00:00.000Z" };
  let next = initial;
  assert.equal(dailyProgress(plan), 0);
  assert.equal(recordDailyReading(next, "other", now), next);
  next = recordDailyReading(next, "best", now);
  for (const key of plan.wordKeys) next = recordDailyWord(next, key, now);
  assert.equal(dailyProgress(next.daily[day]), 2);
  assert.equal(recordDailyQuiz(next, "2026-10-15", "best", plan.questionIds, now), next);
  assert.equal(recordDailyQuiz(next, day, "other", plan.questionIds, now), next);
  assert.equal(recordDailyQuiz(next, day, "best", plan.questionIds.slice(0, 2), now), next);
  next = recordDailyQuiz(next, day, "best", plan.questionIds, now);
  assert.equal(dailyProgress(next.daily[day]), 3); assert.equal(learningStars(next), 1);
  const earned = next;
  next = recordDailyReading(next, "best", now + 1);
  next = recordDailyWord(next, plan.wordKeys[0], now + 1);
  next = recordDailyQuiz(next, day, "best", plan.questionIds, now + 1);
  assert.equal(next, earned); assert.deepEqual(next.finished, initial.finished);
  assert.deepEqual(initial.daily[day].reviewedWords, []);
  assert.deepEqual(parseDeviceBackup(JSON.stringify(next)), next);
  assert.equal(recordDailyReading(next, "best", now + 86400000), next);
});
test("old backups round-trip without daily data and malformed daily rewards cannot overwrite progress", () => {
  const old = empty(); assert.deepEqual(parseDeviceBackup(JSON.stringify(old)), old);
  assert.equal(Object.hasOwn(old, "daily"), false);
  for (const corrupt of [
    data => { data.daily = null; },
    data => { data.daily[day].wordKeys[1] = data.daily[day].wordKeys[0]; },
    data => { data.daily[day].questionIds.pop(); },
    data => { data.daily[day].reviewedWords = ["other:word:tu"]; },
    data => { data.daily[day].awardedAt = new Date(now).toISOString(); },
    data => { data.daily[day].createdAt = "2026-10-15T01:00:00.000Z"; },
  ]) { const bad = structuredClone(planned()); corrupt(bad); assert.throws(() => parseDeviceBackup(JSON.stringify(bad))); }
});
