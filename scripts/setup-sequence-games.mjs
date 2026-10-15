import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createSupabaseBindings } from "./lib/supabase-client.mjs";
const apply = process.argv.includes("--apply"), local = process.argv.includes("--local");
const manifest = JSON.parse(await readFile("content/sequencing/manifest.json", "utf8"));
const uuid = value => { const h = createHash("sha256").update(value).digest("hex"); return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; };
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
let platform;
try {
  if (local) platform = await (await import("./lib/local-platform.mjs")).openLocalPlatform();
  const env = local ? platform.env : createSupabaseBindings({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, bucket: process.env.SUPABASE_MEDIA_BUCKET });
  const before = (await env.DB.prepare("SELECT * FROM stories ORDER BY id").all()).results;
  const sentences = (await env.DB.prepare("SELECT * FROM story_sentences ORDER BY story_id,sequence_no").all()).results;
  const words = (await env.DB.prepare("SELECT * FROM vocabulary ORDER BY id").all()).results;
  if (apply) {
    await mkdir(".data/sequence-games", { recursive: true });
    await writeFile(`.data/sequence-games/${local ? "local" : "supabase"}-before.json`, JSON.stringify({ stories: before, sentences, words }, null, 2));
    if (local) await (await import("./lib/data-transfer.mjs")).applyMigrations(env.DB);
    else {
      assert.ok(process.env.SUPABASE_ACCESS_TOKEN, "A project-scoped management token is needed to add the optional column.");
      const ref = new URL(process.env.SUPABASE_URL).hostname.split(".")[0];
      assert.match(ref, /^[a-z0-9]+$/);
      const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: await readFile("database/supabase/003_story_sequences.sql", "utf8") }), signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw Error(`Sequence schema update failed (HTTP ${response.status}).`);
    }
  }
  const admin = await env.DB.prepare("SELECT id FROM teacher_users WHERE role='admin' AND is_active=true ORDER BY id LIMIT 1").first();
  assert.ok(admin, "An active media owner is required.");
  const pending = [];
  for (const pack of manifest) {
    const story = before.find(story => story.slug === pack.slug);
    if (!story) continue;
    const cards = typeof story.sequence_cards === "string" ? JSON.parse(story.sequence_cards) : story.sequence_cards;
    if (cards?.length) continue; // Never replace a teacher's existing game.
    const next = pack.cards.map(card => {
      const sentence = sentences.find(row => row.story_id === story.id && row.sequence_no === card.sentence_no);
      assert.equal(sentence?.text_vi, card.text_vi, `Review the scene after story edits: ${story.slug}`);
      const id = uuid(`sequence-card-v1:${story.slug}:${card.sentence_no}`);
      return { id, text_vi: card.text_vi, hint_vi: card.hint_vi, image_path: `/media/${uuid(`sequence-image-v1:${story.slug}:${card.sentence_no}`)}.png`, audio_path: sentence.audio_vi_path || "" };
    });
    pending.push({ story, cards: next, source: pack.cards });
  }
  console.log(JSON.stringify({ target: local ? "local" : "supabase", apply, gamesToAdd: pending.length, scenes: pending.reduce((sum, item) => sum + item.cards.length, 0) }));
  if (apply && pending.length) {
    const statements = [], guardIds = [];
    for (const pack of pending) {
      for (const [index, card] of pack.cards.entries()) {
        const bytes = await readFile("public" + pack.source[index].image), key = card.image_path.slice(7);
        const existing = await env.MEDIA.get(key);
        if (existing) assert.equal(digest(new Uint8Array(await existing.arrayBuffer())), digest(bytes), "Existing media must not change.");
        else await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: "image/png" } });
        statements.push(env.DB.prepare("INSERT INTO media_files(path,owner_id) VALUES(?1,?2) ON CONFLICT(path) DO NOTHING").bind(card.image_path, pack.story.owner_id || admin.id));
      }
      const guardId = uuid(`sequence-seed-guard:${pack.story.id}`); guardIds.push(guardId);
      statements.unshift(env.DB.prepare("INSERT INTO transaction_guards(id,valid) SELECT ?1,CASE WHEN EXISTS(SELECT 1 FROM stories WHERE id=?2 AND sequence_cards=?3) THEN 1 ELSE 0 END").bind(guardId, pack.story.id, "[]"));
      statements.push(env.DB.prepare("UPDATE stories SET sequence_cards=?1 WHERE id=?2 AND sequence_cards=?3").bind(JSON.stringify(pack.cards), pack.story.id, "[]"));
    }
    statements.push(...guardIds.map(id => env.DB.prepare("DELETE FROM transaction_guards WHERE id=?1").bind(id)));
    await env.DB.batch(statements);
  }
  if (apply) {
    const after = (await env.DB.prepare("SELECT * FROM stories ORDER BY id").all()).results;
    const original = rows => rows.map(row => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "sequence_cards")));
    assert.deepEqual(original(after), original(before), "All original story fields and IDs are preserved.");
    assert.deepEqual((await env.DB.prepare("SELECT * FROM vocabulary ORDER BY id").all()).results, words, "Vocabulary and its media are unchanged.");
    assert.deepEqual((await env.DB.prepare("SELECT * FROM story_sentences ORDER BY story_id,sequence_no").all()).results, sentences, "Story text and narration are unchanged.");
    await writeFile(`.data/sequence-games/${local ? "local" : "supabase"}-after.json`, JSON.stringify(after, null, 2));
    console.log(JSON.stringify({ preservedOriginalData: true, gamesAdded: pending.length }));
  }
} finally { await platform?.dispose(); }
