import assert from "node:assert/strict";
import { test } from "node:test";
import { flashcardKey, flashcardReady, pictureOptions, learningDeck, reviewWord, dueWords } from "../src/lib/flashcards.ts";
import { parseDeviceBackup } from "../src/lib/device-backup.ts";

const word = (id, en = id) => ({ id, story_slug: "test-story", story_title: "Truyện", word_en: en, word_vi: "Từ " + en, meaning_vi: "Nghĩa", example_vi: "Ví dụ", illustration_path: `/images/${id}.png`, pronunciation_path: `/audio/${id}.mp3` });
const now = Date.parse("2026-10-15T05:00:00.000Z");
const oldBackup = () => ({ version: 1, favorites: ["00000000-0000-4000-a000-000000000001"], started: {}, finished: {}, activities: {}, journal: [{ id: "00000000-0000-4000-a000-000000000002", slug: "test-story", title: "Nhật ký cũ", character: "Bạn", lesson: "Một bài học", image: "", date: new Date(now).toISOString() }] });

test("progress follows the word through editor ID changes", () => {
  const original = word("a", "water bottle");
  assert.equal(flashcardKey(original), flashcardKey({ ...original, id: "new-row-id" }));
  assert.equal(flashcardKey(original), flashcardKey({ ...original, word_en: " Water   Bottle " }));
  assert.notEqual(flashcardKey(original), flashcardKey({ ...original, story_slug: "another-story" }));
});
test("picture choices exclude duplicate meanings, translations and images", () => {
  const target = word("a", "leaf");
  const pool = [target, word("b", "Leaf"), { ...word("c"), word_vi: target.word_vi }, { ...word("d"), illustration_path: target.illustration_path }, word("e"), word("f"), word("g"), { ...word("h"), pronunciation_path: null }];
  for (let i = 0; i < 20; i++) {
    const options = pictureOptions(target, pool);
    assert.equal(options.length, 4);
    assert.equal(options.filter(item => item.id === target.id).length, 1);
    assert.equal(new Set(options.map(item => item.word_en.toLowerCase())).size, 4);
    assert.equal(new Set(options.map(item => item.word_vi)).size, 4);
    assert.equal(new Set(options.map(item => item.illustration_path)).size, 4);
    assert.ok(!options.some(item => ["b", "c", "d", "h"].includes(item.id)));
  }
  assert.equal(flashcardReady({ ...target, illustration_path: "//external.test/leaf.png" }), false);
  assert.equal(flashcardReady({ ...target, pronunciation_path: null }), false);
});
test("review intervals advance 1, 3, 7 and 14 days and reset after mistakes", () => {
  let progress, time = now;
  for (const [index, interval] of [1, 3, 7, 14].entries()) {
    progress = reviewWord(progress, true, time);
    assert.equal(progress.streak, index + 1);
    const expectedLocalMidnight = Math.floor((time + 7 * 3600000) / 86400000) * 86400000 - 7 * 3600000;
    assert.equal(Date.parse(progress.dueAt), expectedLocalMidnight + interval * 86400000);
    const sameDay = reviewWord(progress, true, time + 1000);
    assert.equal(sameDay.streak, progress.streak, "Repeating in the same day does not skip review stages");
    assert.equal(sameDay.dueAt, progress.dueAt);
    time = Date.parse(progress.dueAt) + 8 * 3600000;
  }
  const wrong = reviewWord(progress, false, time);
  assert.equal(wrong.streak, 0);
  assert.equal(wrong.correct, 4);
  assert.equal(wrong.attempts, 5);
  assert.equal(reviewWord(wrong, true, time + 1000).streak, 1);
});
test("due and unseen words precede future reviews and incomplete media", () => {
  const a = word("a"), b = word("b"), c = word("c"), d = { ...word("d"), illustration_path: null };
  const history = { [flashcardKey(a)]: reviewWord(undefined, true, now - 86400000), [flashcardKey(b)]: reviewWord(undefined, true, now) };
  assert.deepEqual(dueWords([a, b, c], history, now), [a]);
  assert.deepEqual(learningDeck([b, c, d, a], history, 3, now, () => .3).map(item => item.id), ["a", "c", "b"]);
});
test("old backups retain journal and favorites; new backups round-trip review progress", () => {
  const old = oldBackup(), original = JSON.stringify(old);
  const parsed = parseDeviceBackup(original);
  assert.deepEqual(parsed.journal, old.journal);
  assert.deepEqual(parsed.favorites, old.favorites);
  assert.deepEqual(parsed.flashcards, {});
  const data = { ...parsed, flashcards: { [flashcardKey(word("a"))]: reviewWord(undefined, true, now) } };
  assert.deepEqual(parseDeviceBackup(JSON.stringify(data)), data);
  assert.equal(JSON.stringify(old), original);
});
test("malformed progress is rejected without changing existing backup data", () => {
  const valid = reviewWord(undefined, true, now);
  for (const invalid of [{ ...valid, attempts: -1 }, { ...valid, correct: 99 }, { ...valid, streak: 5 }, { ...valid, dueAt: "tomorrow" }, { ...valid, lastReviewed: valid.dueAt }]) {
    assert.throws(() => parseDeviceBackup(JSON.stringify({ ...oldBackup(), flashcards: { [flashcardKey(word("a"))]: invalid } })));
  }
  assert.throws(() => parseDeviceBackup(JSON.stringify({ ...oldBackup(), flashcards: null })));
});
