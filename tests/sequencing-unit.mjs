import assert from "node:assert/strict";
import { test } from "node:test";
import { validateSequenceCards, sequenceReady, placeSequenceCard, shuffledSequence, sequenceStars, recordSequenceGame } from "../src/lib/sequencing.ts";
import { parseDeviceBackup } from "../src/lib/device-backup.ts";
const cards = Array.from({ length: 4 }, (_, index) => ({ id: `00000000-0000-4000-a000-00000000000${index}`, text_vi: `Sự việc ${index}`, hint_vi: `Gợi ý ${index}`, image_path: `/media/00000000-0000-4000-a000-00000000000${index}.png`, audio_path: "" }));
const legacy = { version: 1, favorites: [], journal: [], started: {}, finished: {}, activities: {} };

test("only complete, distinct sets of four to six scenes are playable; incomplete drafts are allowed", () => {
  assert.ok(sequenceReady(cards));
  assert.deepEqual(validateSequenceCards([]), []);
  assert.deepEqual(validateSequenceCards([{ ...cards[0], text_vi: "", image_path: "" }])[0].text_vi, "");
  for (const value of [cards.slice(0, 3), [...cards, ...cards], cards.map((c, i) => i === 1 ? { ...c, image_path: cards[0].image_path } : c), cards.map(c => ({ ...c, hint_vi: "" }))]) assert.equal(sequenceReady(value), false);
  for (const value of [[{ ...cards[0], image_path: "https://example.com/p.png" }], [{ ...cards[0], audio_path: "/media/a.png" }], [{ ...cards[0], image_path: "/media/a.mp3" }], [{ ...cards[0], id: "bad" }], [cards[0], cards[0]], null]) assert.throws(() => validateSequenceCards(value));
});
test("shuffle never opens with the answer already in order and preserves every scene", () => {
  for (const random of [() => 0, () => .9999, Math.random]) {
    const shuffled = shuffledSequence(cards, random);
    assert.notDeepEqual(shuffled.map(c => c.id), cards.map(c => c.id));
    assert.deepEqual([...shuffled].sort((a, b) => a.id.localeCompare(b.id)), cards);
  }
});
test("placing, swapping and replacing never duplicate cards and cannot move correct slots", () => {
  const a = ["a", "b", null, null], locked = [true, false, false, false];
  assert.equal(placeSequenceCard(a, "a", 2, locked), a);
  assert.equal(placeSequenceCard(a, "c", 0, locked), a);
  assert.deepEqual(placeSequenceCard(a, "b", 2, locked), ["a", null, "b", null]);
  assert.deepEqual(placeSequenceCard(a, "c", 1, locked), ["a", "c", null, null]);
  assert.deepEqual(placeSequenceCard(["a", "b", "c", null], "b", 2, locked), ["a", "c", "b", null]);
  assert.deepEqual(a, ["a", "b", null, null]);
});
test("attempts and distinct hints determine stars while the best result is retained", () => {
  assert.equal(sequenceStars(1, 0), 3); assert.equal(sequenceStars(1, 1), 2);
  assert.equal(sequenceStars(3, 1), 2); assert.equal(sequenceStars(4, 0), 1); assert.equal(sequenceStars(1, 2), 1);
  const first = recordSequenceGame(undefined, 1, 0, 1000), second = recordSequenceGame(first, 5, 2, 2000);
  assert.equal(first.plays, 1); assert.equal(second.plays, 2); assert.equal(second.bestStars, 3); assert.equal(second.lastStars, 1);
});
test("new backups retain independent game results and old backups receive an empty sequence history", () => {
  const old = parseDeviceBackup(JSON.stringify(legacy)); assert.deepEqual(old.sequencing, {});
  const data = { ...old, sequencing: { "test-story": recordSequenceGame(undefined, 2, 1, 1000) } };
  assert.deepEqual(parseDeviceBackup(JSON.stringify(data)), data);
  assert.deepEqual(data.flashcards, {}); assert.deepEqual(data.matching, {});
});
test("invalid sequence histories cannot overwrite device data", () => {
  const valid = recordSequenceGame(undefined, 1, 0, 1000);
  for (const invalid of [null, { "test-story": { ...valid, bestStars: 4 } }, { "test-story": { ...valid, lastAttempts: 0 } }, { "test-story": { ...valid, lastHints: -1 } }, { "test-story": { ...valid, lastStars: 1 } }, { "test-story": { ...valid, plays: 1.5 } }, { "bad/key": valid }]) assert.throws(() => parseDeviceBackup(JSON.stringify({ ...legacy, sequencing: invalid })));
});
