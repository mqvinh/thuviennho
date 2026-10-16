"use client";
import { parseDeviceBackup, validateDeviceData } from "./device-backup";
import { useSyncExternalStore } from "react";
import type { FlashcardHistory } from "./flashcards";
import type { MatchingHistory } from "./matching";
import type { SequenceHistory } from "./sequencing";
import type { DailyHistory } from "./daily-learning";
export type JournalEntry = {
  id: string;
  slug: string;
  title: string;
  character: string;
  lesson: string;
  image: string;
  date: string;
};
export type DeviceData = {
  version: 1;
  favorites: string[];
  started: Record<string, { title: string; date: string }>;
  finished: Record<string, { title: string; date: string }>;
  activities: Record<string, { title: string; date: string }>;
  journal: JournalEntry[];
  flashcards: FlashcardHistory;
  matching: MatchingHistory;
  sequencing: SequenceHistory;
  daily?: DailyHistory;
};
const key = "little-readers-device-v1";
const empty: DeviceData = {
  version: 1,
  favorites: [],
  started: {},
  finished: {},
  activities: {},
  journal: [],
  flashcards: {},
  matching: {},
  sequencing: {},
};
const server = JSON.stringify(empty);
function snapshot() {
  try {
    return localStorage.getItem(key) ?? server;
  } catch {
    return "unavailable";
  }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("library-device-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("library-device-change", callback);
  };
}
function parse(raw: string): DeviceData | null {
  try {
    return parseDeviceBackup(raw);
  } catch {
    return null;
  }
}
export function useDeviceData() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => server);
  return { data: parse(raw) ?? empty, available: parse(raw) !== null };
}
export function changeDeviceData(change: (data: DeviceData) => DeviceData) {
  const data = parse(snapshot());
  if (!data)
    throw Error(
      "Không đọc được dữ liệu thiết bị. Hãy cho phép lưu dữ liệu hoặc xóa dữ liệu cũ trong Hành trình đọc sách.",
    );
  const next = validateDeviceData(change(data));
  try {
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event("library-device-change"));
  } catch {
    throw Error(
      "Chưa lưu được trên thiết bị. Bộ nhớ có thể đã đầy; em có thể xóa bớt sản phẩm trong nhật ký.",
    );
  }
}
export function clearDeviceData() {
  try {
    localStorage.removeItem(key);
    window.dispatchEvent(new Event("library-device-change"));
  } catch {
    throw Error("Trình duyệt chưa cho phép xóa dữ liệu.");
  }
}
export function recordActivity(
  kind: "started" | "finished" | "activities",
  slug: string,
  title: string,
) {
  changeDeviceData((data) => ({
    ...data,
    [kind]: {
      ...data[kind],
      [slug]: Object.hasOwn(data[kind], slug)
        ? data[kind][slug]
        : { title, date: new Date().toISOString() },
    },
  }));
}

export function restoreDeviceData(value: DeviceData) {
  const data = validateDeviceData(value);
  try {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new Event("library-device-change"));
  } catch {
    throw Error(
      "Chưa khôi phục được. Trình duyệt có thể không đủ bộ nhớ; dữ liệu hiện tại chưa thay đổi.",
    );
  }
}
