import assert from "node:assert/strict";
import { test } from "node:test";
import { matchingReady, uniqueMatchingWords, matchingRounds, recordMatchingWord } from "../src/lib/matching.ts";
import { parseDeviceBackup } from "../src/lib/device-backup.ts";

const word = (id, extra = {}) => ({ id: String(id), story_slug: "test-story", story_title: "Truyện", word_vi: "Từ " + id, word_en: "word " + id, meaning_vi: "Nghĩa", example_vi: "Ví dụ", illustration_path: `/images/${id}.png`, pronunciation_path: null, ...extra });
const legacy = () => ({ version: 1, favorites: [], journal: [], started: {}, finished: {}, activities: {} });
const now = Date.parse("2026-10-15T12:00:00.000Z");

test("matching uses shared vocabulary images and allows words without pronunciation", () => {
  assert.equal(matchingReady(word(1)), true);
  for (const extra of [{ illustration_path: null }, { illustration_path: "//elsewhere.test/a.png" }, { word_vi: " " }, { word_en: "" }]) assert.equal(matchingReady(word(1, extra)), false);
});

test("a round never includes duplicate English, Vietnamese or picture choices", () => {
  const original = word(1, { word_en: "water bottle" });
  const rows = [original, word(2, { word_en: " Water   Bottle " }), word(3, { word_vi: original.word_vi }), word(4, { illustration_path: original.illustration_path }), word(5)];
  assert.deepEqual(uniqueMatchingWords(rows).map(word => word.id), ["1", "5"]);
  const scoped = rows.map(word => ({ ...word, story_slug: word.id === "2" ? "another-story" : "test-story" })).filter(word => word.story_slug === "another-story");
  assert.equal(uniqueMatchingWords(scoped)[0].id, "2", "Filtering by story happens before deduplication");
});

test("a short session has 2–4 pairs per round, at most three rounds, and no repeated words", () => {
  for (let count = 2; count <= 40; count++) {
    const rounds = matchingRounds(Array.from({ length: count }, (_, index) => word(index)));
    assert.ok(rounds.length >= 1 && rounds.length <= 3);
    assert.ok(rounds.every(round => round.length >= 2 && round.length <= 4));
    assert.equal(rounds.flat().length, Math.min(12, count));
    assert.equal(new Set(rounds.flat().map(word => word.id)).size, Math.min(12, count));
  }
  assert.deepEqual(matchingRounds([word(1)]), []);
  assert.equal(matchingRounds([word(1)], true).flat().length, 1, "A single missed word can still be practiced");
  assert.deepEqual(matchingRounds([]), []);
});

test("first-try scoring retains mistakes even after the eventual correct match", () => {
  const first = recordMatchingWord(undefined, 2, now);
  assert.deepEqual(first, { plays: 1, firstTry: 0, mistakes: 2, lastMistakes: 2, lastPlayed: new Date(now).toISOString() });
  const second = recordMatchingWord(first, 0, now + 1000);
  assert.equal(second.plays, 2); assert.equal(second.firstTry, 1);
  assert.equal(second.mistakes, 2); assert.equal(second.lastMistakes, 0);
  assert.equal(first.plays, 1, "Previous history is not mutated");
});

test("old backups remain valid and matching does not change the Flashcard schedule", () => {
  const flashcards = { "test-story:book:sach": { attempts: 1, correct: 1, streak: 1, lastReviewed: new Date(now).toISOString(), dueAt: new Date(now + 86400000).toISOString() } };
  const old = { ...legacy(), flashcards }, original = JSON.stringify(old);
  const parsed = parseDeviceBackup(original);
  assert.deepEqual(parsed.matching, {});
  const withGame = { ...parsed, matching: { "en:test-story:book:sach": recordMatchingWord(undefined, 1, now), "vi:test-story:book:sach": recordMatchingWord(undefined, 0, now) } };
  const restored = parseDeviceBackup(JSON.stringify(withGame));
  assert.deepEqual(restored, withGame);
  assert.deepEqual(restored.flashcards, flashcards);
  assert.equal(JSON.stringify(old), original);
  assert.deepEqual(parseDeviceBackup(JSON.stringify(legacy())).matching, {});
});

test("invalid matching backup entries are rejected before restore", () => {
  const good = recordMatchingWord(undefined, 0, now);
  for (const value of [{ ...good, plays: 0 }, { ...good, firstTry: 2 }, { ...good, mistakes: 1 }, { ...good, lastMistakes: -1 }, { ...good, lastPlayed: "today" }, { ...good, plays: 1.5 }]) {
    assert.throws(() => parseDeviceBackup(JSON.stringify({ ...legacy(), matching: { "en:test-story:book:sach": value } })));
  }
  assert.throws(() => parseDeviceBackup(JSON.stringify({ ...legacy(), matching: null })));
  assert.throws(() => parseDeviceBackup(JSON.stringify({ ...legacy(), matching: { "invalid-key": good } })));
});
