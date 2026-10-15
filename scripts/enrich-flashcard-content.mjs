import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createSupabaseBindings } from "./lib/supabase-client.mjs";

const args = process.argv.slice(2), local = args.includes("--local"), apply = args.includes("--apply");
const manifest = JSON.parse(await readFile("content/flashcards/manifest.json", "utf8"));
const assets = new Map(manifest.map(asset => [asset.english, asset]));
const uuid = value => {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32);
  return [hex.slice(0, 8), hex.slice(8, 12), "5" + hex.slice(13, 16), "a" + hex.slice(17, 20), hex.slice(20)].join("-");
};
const digest = value => createHash("sha256").update(value).digest("hex");
let platform;
try {
  if (local) platform = await (await import("./lib/local-platform.mjs")).openLocalPlatform();
  const env = local ? platform.env : createSupabaseBindings({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, bucket: process.env.SUPABASE_MEDIA_BUCKET });
  const query = "SELECT v.*,s.owner_id FROM vocabulary v JOIN stories s ON s.id=v.story_id ORDER BY v.id";
  const before = (await env.DB.prepare(query).all()).results;
  const admin = await env.DB.prepare("SELECT id FROM teacher_users WHERE role='admin' AND is_active=true ORDER BY id LIMIT 1").first();
  assert.ok(admin, "An active media owner is required");
  const changes = [], files = new Map();
  for (const row of before) {
    const asset = assets.get(row.word_en.trim().toLowerCase());
    if (!asset) continue;
    for (const [column, source, extension] of [["illustration_path", asset.image, "png"], ["pronunciation_path", asset.audio, "mp3"]]) {
      if (row[column]?.trim()) continue;
      const key = uuid(`flashcard-v1:${row.id}:${column}`) + "." + extension;
      const path = "/media/" + key;
      files.set(key, { key, source, path, owner: row.owner_id || admin.id, type: extension === "png" ? "image/png" : "audio/mpeg" });
      changes.push({ id: row.id, column, path });
    }
  }
  console.log(JSON.stringify({ target: local ? "local" : "supabase", words: before.length, missingFieldsToFill: changes.length, apply }));
  if (apply && changes.length) {
    const directory = ".data/flashcard-content/" + (local ? "local" : "supabase") + "-" + new Date().toISOString().replaceAll(":", "-");
    await mkdir(directory, { recursive: true });
    await writeFile(directory + "/vocabulary-before.json", JSON.stringify(before, null, 2));
    const list = [...files.values()];
    for (let start = 0; start < list.length; start += 4) {
      await Promise.all(list.slice(start, start + 4).map(async file => {
        const bytes = await readFile("public" + file.source);
        const existing = await env.MEDIA.get(file.key);
        if (existing) assert.equal(digest(new Uint8Array(await existing.arrayBuffer())), digest(bytes), "An existing media object must not be replaced");
        else await env.MEDIA.put(file.key, bytes, { httpMetadata: { contentType: file.type } });
      }));
    }
    // Register owners and fill empty fields in one transaction after uploads.
    await env.DB.batch([
      ...list.map(file => env.DB.prepare("INSERT INTO media_files(path,owner_id) VALUES(?1,?2) ON CONFLICT(path) DO NOTHING").bind(file.path, file.owner)),
      ...changes.map(change => env.DB.prepare(`UPDATE vocabulary SET ${change.column}=?1 WHERE id=?2 AND (${change.column} IS NULL OR trim(${change.column})='')`).bind(change.path, change.id)),
    ]);
    const after = (await env.DB.prepare(query).all()).results;
    const unchanged = rows => rows.map(row => Object.fromEntries(Object.entries(row).filter(([name]) => !["illustration_path", "pronunciation_path"].includes(name))));
    assert.deepEqual(unchanged(after), unchanged(before), "All word IDs, text, ordering and story ownership are preserved");
    for (const row of before) for (const column of ["illustration_path", "pronunciation_path"]) {
      if (row[column]?.trim()) assert.equal(after.find(item => item.id === row.id)[column], row[column], "Existing media links are preserved");
    }
    assert.ok(changes.every(change => after.find(row => row.id === change.id)[change.column] === change.path), "Every added asset is linked to its original word");
    await writeFile(directory + "/vocabulary-after.json", JSON.stringify(after, null, 2));
    console.log(JSON.stringify({ updatedWords: new Set(changes.map(change => change.id)).size, addedMedia: files.size, preservedAllIdsAndText: true }));
  }
} finally { await platform?.dispose(); }
