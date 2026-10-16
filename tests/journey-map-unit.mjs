import assert from "node:assert/strict";
import { test } from "node:test";
import { finishJourneyStory, journeyRegions, landmarkFor, storyState } from "../src/lib/journey-map.ts";
import { parseDeviceBackup } from "../src/lib/device-backup.ts";

const empty = () => parseDeviceBackup(JSON.stringify({ version: 1, favorites: [], started: {}, finished: {}, activities: {}, journal: [] }));
const story = (slug, theme_slug = "forest") => ({ slug, title_vi: slug, theme_slug, theme_vi: theme_slug ? "Thiên nhiên" : "Chưa phân chủ đề", cover_image_path: null });
const themes = [{ slug: "forest", name_vi: "Thiên nhiên", name_en: "Nature", icon_path: null }, { slug: "empty", name_vi: "Chủ đề mới", name_en: "New", icon_path: null }];

test("a completed story atomically starts reading, opens one place and preserves earlier progress on reread", () => {
  const before = empty(); before.favorites = ["word-one"];
  const first = finishJourneyStory(before, "story-one", "Truyện một", "2026-10-16T01:00:00.000Z");
  assert.equal(first.unlocked, true); assert.equal(storyState(first.data, "story-one"), "finished");
  assert.equal(first.data.started["story-one"].date, first.data.finished["story-one"].date);
  assert.deepEqual(before.finished, {}); assert.deepEqual(first.data.favorites, before.favorites);
  const second = finishJourneyStory(first.data, "story-one", "Tên sửa lại", "2026-10-17T01:00:00.000Z");
  assert.equal(second.unlocked, false); assert.deepEqual(second.data, first.data);
});

test("completion retains the original starting date and works with existing backup data", () => {
  const data = empty(); data.started["old-story"] = { title: "Truyện cũ", date: "2026-10-01T00:00:00.000Z" };
  const finished = finishJourneyStory(data, "old-story", "Truyện cũ", "2026-10-16T01:00:00.000Z").data;
  assert.equal(finished.started["old-story"].date, data.started["old-story"].date);
  assert.equal(storyState(data, "old-story"), "started"); assert.equal(storyState(data, "unread"), "new");
  const restored = parseDeviceBackup(JSON.stringify(finished));
  assert.equal(storyState(restored, "old-story"), "finished"); assert.deepEqual(restored, finished);
});

test("new themes, unassigned stories and empty regions remain available without losing or duplicating stories", () => {
  const stories = [story("one"), story("two", "unknown"), story("three", null), story("one")];
  const regions = journeyRegions(stories, themes);
  assert.deepEqual(regions.map(region => region.slug), ["forest", "empty", "unknown", "chua-phan-chu-de"]);
  assert.equal(regions[1].stories.length, 0);
  assert.deepEqual(regions.flatMap(region => region.stories.map(item => item.slug)), ["one", "two", "three"]);
  assert.deepEqual(journeyRegions([], []), []);
});

test("adding or sorting library stories preserves each existing landmark reward", () => {
  const first = landmarkFor("story-one");
  journeyRegions([story("new-story"), story("story-one")], themes);
  assert.deepEqual(landmarkFor("story-one"), first);
  assert.equal(journeyRegions([story("story-one")], themes)[0].style.name, "Rừng xanh");
});
