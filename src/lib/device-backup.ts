import type { DeviceData, JournalEntry } from "./device-store";
const invalid = () => {
  throw Error(
    "Bản sao không đúng định dạng hoặc vượt giới hạn. Dữ liệu hiện tại chưa thay đổi.",
  );
};
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return invalid();
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number, required = true) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    return invalid();
  return value;
}
function date(value: unknown) {
  const result = text(value, 30);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(result) ||
    !Number.isFinite(Date.parse(result))
  )
    return invalid();
  return result;
}
function slug(value: unknown) {
  const result = text(value, 100);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) return invalid();
  return result;
}
function records(value: unknown) {
  const entries = Object.entries(object(value));
  if (entries.length > 1000) return invalid();
  return Object.fromEntries(
    entries.map(([key, value]) => {
      const row = object(value);
      return [slug(key), { title: text(row.title, 200), date: date(row.date) }];
    }),
  );
}
export function validateDeviceData(value: unknown): DeviceData {
  const data = object(value);
  if (
    data.version !== 1 ||
    !Array.isArray(data.favorites) ||
    data.favorites.length > 1000 ||
    !Array.isArray(data.journal) ||
    data.journal.length > 50
  )
    return invalid();
  const favorites = data.favorites.map((id) => {
    const result = text(id, 36);
    if (!/^[a-f0-9-]{36}$/i.test(result)) return invalid();
    return result;
  });
  if (new Set(favorites).size !== favorites.length) return invalid();
  const journal: JournalEntry[] = data.journal.map((value) => {
    const row = object(value);
    const id = text(row.id, 36);
    if (!/^[a-f0-9-]{36}$/i.test(id)) return invalid();
    const image = text(row.image, 1_500_000, false);
    if (
      image &&
      !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/]+=*$/.test(image)
    )
      return invalid();
    return {
      id,
      slug: slug(row.slug),
      title: text(row.title, 200),
      character: text(row.character, 100),
      lesson: text(row.lesson, 1000),
      image,
      date: date(row.date),
    };
  });
  if (new Set(journal.map((v) => v.id)).size !== journal.length)
    return invalid();
  return {
    version: 1,
    favorites,
    journal,
    started: records(data.started),
    finished: records(data.finished),
    activities: records(data.activities),
  };
}
export function parseDeviceBackup(raw: string): DeviceData {
  if (raw.length > 5 * 1024 * 1024) return invalid();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return invalid();
  }
  return validateDeviceData(value);
}
