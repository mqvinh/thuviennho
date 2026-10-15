import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { mkdir, readFile, cp, writeFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { createSupabaseBindings, compilePostgres } from "../scripts/lib/supabase-client.mjs";
import { importSupabase, verifySupabase, exportSupabase } from "../scripts/lib/supabase-transfer.mjs";
import { loadTransfer, digest } from "../scripts/lib/data-transfer.mjs";
import { productionSmoke } from "./lib/supabase-production.mjs";

const directory = path.resolve(".data/supabase-tests", randomUUID());
await mkdir(directory, { recursive: true });
const pg = new PGlite();
const schema = await readFile("database/supabase/001_library.sql", "utf8");
await pg.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;");
await pg.exec(schema);
await pg.exec(schema); // Setup is repeatable without replacing existing tables.
for (const role of ["anon", "authenticated"]) {
  await pg.exec("SET ROLE " + role);
  await assert.rejects(() => pg.query("SELECT public.library_batch('[]'::jsonb)"), /permission denied/);
  await assert.rejects(() => pg.query("SELECT * FROM little_readers.teacher_users"), /permission denied/);
  await pg.exec("RESET ROLE");
}
await pg.exec("SET ROLE service_role");
const key = "sb_secret_" + randomBytes(32).toString("hex");
const objects = new Map();
let bucket = false, interrupted = false;
const server = createServer(async (request, response) => {
  const reply = (status, payload) => { response.writeHead(status, { "Content-Type": "application/json" }); response.end(JSON.stringify(payload)); };
  if (request.headers.apikey !== key) return reply(401, { message: "Unauthorized" });
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  try {
    if (request.url === "/rest/v1/rpc/library_batch") {
      const { statements } = JSON.parse(bytes.toString());
      if (!interrupted && statements.some(item => /UPDATE data_import_progress SET next_index=80\b/.test(item.sql))) {
        interrupted = true;
        return reply(503, { message: "Simulated interrupted import" });
      }
      const result = await pg.query("SELECT public.library_batch($1::jsonb) AS result", [JSON.stringify(statements)]);
      return reply(200, result.rows[0].result);
    }
    if (request.url === "/storage/v1/bucket/little-readers-media") return reply(bucket ? 200 : 404, bucket ? { public: false } : { message: "Bucket not found" });
    if (request.url === "/storage/v1/bucket" && request.method === "POST") {
      assert.equal(JSON.parse(bytes.toString()).public, false);
      bucket = true; return reply(200, { name: "little-readers-media" });
    }
    if (request.url === "/storage/v1/object/list/little-readers-media") {
      const { offset, limit } = JSON.parse(bytes.toString());
      return reply(200, [...objects.keys()].sort().slice(offset, offset + limit).map(name => ({ name })));
    }
    const match = request.url.match(/^\/storage\/v1\/object\/(authenticated\/)?little-readers-media\/([^/]+)$/);
    if (match) {
      if (request.method === "POST" && !match[1]) {
        if (objects.has(match[2])) return reply(409, { message: "Object already exists" });
        objects.set(match[2], { bytes, contentType: request.headers["content-type"] });
        return reply(200, { Key: match[2] });
      }
      const object = objects.get(match[2]);
      if (!object) return reply(400, { code: "not_found", message: "Object not found" });
      response.writeHead(200, { "Content-Type": object.contentType }); response.end(object.bytes); return;
    }
    reply(404, { message: "Unknown test route" });
  } catch (error) { reply(error.code === "42501" ? 403 : 400, { code: error.code, message: error.message }); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = "http://127.0.0.1:" + server.address().port;
const env = createSupabaseBindings({ url, key });
const source = ".data/vercel-initial-transfer";
try {
  assert.throws(() => createSupabaseBindings({ url, key: "sb_publishable_invalid" }), /secret key/);
  assert.throws(() => createSupabaseBindings({ url: "http://example.com", key }), /HTTPS/);
  assert.equal((await fetch(url + "/rest/v1/rpc/library_batch", { method: "POST" })).status, 401);
  assert.equal((await fetch(url + "/storage/v1/object/authenticated/little-readers-media/a.png")).status, 401);
  const malicious = "Tiếng Việt \\' ; DELETE FROM teacher_users; -- ?2 returning $1\n'";
  const row = await env.DB.prepare("SELECT ?1 AS value,?1 AS repeated,?2 AS flag,?3 AS number,?4 AS empty,'?1 returning' AS fixed").bind(malicious, true, 3, null).first();
  assert.deepEqual(row, { value: malicious, repeated: malicious, flag: true, number: 3, empty: null, fixed: "?1 returning" });
  assert.equal(compilePostgres("SELECT '?1',?1 -- ?2", ["safe"]).sql, "SELECT '?1',E'safe' -- ?2");
  assert.throws(() => compilePostgres("SELECT ?1", [Infinity]), /Unsupported/);
  assert.throws(() => compilePostgres("SELECT ?1", ["a\0b"]), /Unsupported/);
  console.log("PostgreSQL permissions reject anon/authenticated callers; parameter escaping preserves Unicode and injection-shaped values.");

  await assert.rejects(() => importSupabase(env, source), /Simulated interrupted import/);
  assert.equal(await env.DB.prepare("SELECT next_index FROM data_import_progress").first("next_index"), 40);
  await importSupabase(env, source);
  assert.equal(await importSupabase(env, source), false);
  await verifySupabase(env, source);
  const { snapshot, manifest } = await loadTransfer(source);
  const backup = path.join(directory, "backup");
  await exportSupabase(env, backup);
  await verifySupabase(env, backup);
  const other = path.join(directory, "different-snapshot");
  await cp(source, other, { recursive: true });
  const changedText = JSON.stringify({ ...snapshot, exportedAt: new Date().toISOString() }, null, 2) + "\n";
  await writeFile(path.join(other, "snapshot.json"), changedText);
  await writeFile(path.join(other, "manifest.json"), JSON.stringify({ ...manifest, databaseSha256: digest(changedText) }));
  await assert.rejects(() => importSupabase(env, other), /Refusing to overwrite/);
  const id = randomUUID();
  await env.DB.prepare("INSERT INTO reading_themes(id,slug,name_vi,name_en) VALUES(?1,?1,'Original','Original')").bind(id).run();
  await assert.rejects(() => env.DB.batch([
    env.DB.prepare("UPDATE reading_themes SET name_vi='Changed' WHERE id=?1").bind(id),
    env.DB.prepare("INSERT INTO transaction_guards(id,valid) VALUES(?1,0)").bind(id),
  ]), /transaction_guards_valid_check/);
  assert.equal(await env.DB.prepare("SELECT name_vi FROM reading_themes WHERE id=?1").bind(id).first("name_vi"), "Original");
  await env.DB.prepare("DELETE FROM reading_themes WHERE id=?1").bind(id).run();
  console.log("Import resumed at its atomic checkpoint, preserved original values/media, refused overwrite and exported a verified backup.");

  if (process.argv.includes("--next")) {
    const username = "supabase-test-" + randomUUID().slice(0, 8), password = "Supabase-test-123!", salt = "isolated-supabase-test-salt";
    await env.DB.prepare("INSERT INTO teacher_users(username,password_hash,role) VALUES(?1,?2,'admin')").bind(username, `${salt}:${scryptSync(password, salt, 64).toString("hex")}`).run();
    await productionSmoke({ env, url, key, username, password, snapshot, manifest, source });
  }
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await pg.close();
}
