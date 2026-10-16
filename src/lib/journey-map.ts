import type { DeviceData } from "./device-store";
import type { Story, Theme } from "./library";

export type JourneyStory = Pick<Story, "slug" | "title_vi" | "theme_slug" | "theme_vi" | "cover_image_path">;
export type Landmark = "tree" | "cottage" | "flowers" | "bridge" | "windmill" | "lighthouse";
export const landmarks: { kind: Landmark; name: string }[] = [
  { kind: "tree", name: "Cây ước mơ" }, { kind: "cottage", name: "Ngôi nhà nhỏ" },
  { kind: "flowers", name: "Vườn hoa" }, { kind: "bridge", name: "Cầu tình bạn" },
  { kind: "windmill", name: "Cối xay gió" }, { kind: "lighthouse", name: "Ngọn hải đăng" },
];
export const regionStyles = [
  { name: "Đảo sẻ chia", icon: "💗", land: "#dbe8b8", edge: "#bad29b", accent: "#c97b85", kind: "flowers" },
  { name: "Làng ấm áp", icon: "🏡", land: "#f5e4ba", edge: "#dfc995", accent: "#bf8658", kind: "cottage" },
  { name: "Rừng xanh", icon: "🌳", land: "#d6e8ba", edge: "#abc78b", accent: "#6f965c", kind: "tree" },
  { name: "Đồi nắng mai", icon: "☀️", land: "#ede6b7", edge: "#d3cc91", accent: "#b48e3b", kind: "windmill" },
  { name: "Vịnh tình bạn", icon: "🌈", land: "#e7dcdf", edge: "#c9bacb", accent: "#9d83af", kind: "bridge" },
  { name: "Đảo tri thức", icon: "📚", land: "#d4e4da", edge: "#accabd", accent: "#5c91a0", kind: "lighthouse" },
] as const;
export type JourneyRegion = { slug: string; title: string; icon_path: string | null; style: typeof regionStyles[number]; stories: JourneyStory[] };

function hash(text: string) { let value = 0; for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0; return value; }
export function landmarkFor(slug: string) { return landmarks[hash(slug) % landmarks.length]; }
function styleFor(slug: string, title: string) {
  const text = `${slug} ${title}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
  const index = /se.chia|long.tot/.test(text) ? 0 : /gia.dinh/.test(text) ? 1 : /thien.nhien/.test(text) ? 2 : /thoi.quen/.test(text) ? 3 : /tinh.ban/.test(text) ? 4 : /truong.hoc/.test(text) ? 5 : hash(slug) % regionStyles.length;
  return regionStyles[index];
}
export function journeyRegions(stories: JourneyStory[], themes: Theme[]): JourneyRegion[] {
  const regions = new Map<string, JourneyRegion>();
  for (const theme of themes) regions.set(theme.slug, { slug: theme.slug, title: theme.name_vi, icon_path: theme.icon_path, style: styleFor(theme.slug, theme.name_vi), stories: [] });
  for (const story of stories) {
    const slug = story.theme_slug ?? "chua-phan-chu-de";
    if (!regions.has(slug)) regions.set(slug, { slug, title: story.theme_vi || "Chưa phân chủ đề", icon_path: null, style: styleFor(slug, story.theme_vi), stories: [] });
    const region = regions.get(slug)!;
    if (!region.stories.some(item => item.slug === story.slug)) region.stories.push(story);
  }
  return [...regions.values()];
}
export function storyState(data: Pick<DeviceData, "started" | "finished">, slug: string) {
  return Object.hasOwn(data.finished, slug) ? "finished" : Object.hasOwn(data.started, slug) ? "started" : "new";
}
// One storage write records both steps. Reading again preserves the first date
// and never awards another location for the same story.
export function finishJourneyStory(data: DeviceData, slug: string, title: string, date = new Date().toISOString()) {
  const unlocked = !Object.hasOwn(data.finished, slug);
  return { unlocked, data: { ...data,
    started: Object.hasOwn(data.started, slug) ? data.started : { ...data.started, [slug]: { title, date } },
    finished: unlocked ? { ...data.finished, [slug]: { title, date } } : data.finished,
  } };
}
