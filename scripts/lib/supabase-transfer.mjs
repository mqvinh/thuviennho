import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { importOrder, loadTransfer, digest, normalizeValue } from "./data-transfer.mjs";

const booleanColumn = (table, name) => ["is_active", "is_published", "is_visible"].includes(name) || (table === "site_settings" && name === "id");
function targetValue(table, column, value) {
  if (value === null) return null;
  if (booleanColumn(table, column.column_name)) {
    if (![true, false, 1, 0].includes(value)) throw new Error("Invalid boolean in source snapshot.");
    return value === true || value === 1;
  }
  return normalizeValue(value, column);
}
function canonical(table, column, value) {
  return booleanColumn(table, column.column_name) && value !== null ? Number(value) : normalizeValue(value, column);
}
function guard(db, condition, values = []) {
  return db.prepare("INSERT INTO transaction_guards(id,valid) SELECT 'supabase-initial-import',CASE WHEN (" + condition + ") THEN 1 ELSE 0 END").bind(...values);
}
const cleanup = db => db.prepare("DELETE FROM transaction_guards WHERE id='supabase-initial-import'");

export async function checkSupabaseSchema(env) {
  const ready = await env.DB.prepare("SELECT name FROM platform_migrations WHERE name='001_library'").first();
  if (!ready) throw new Error("Run database/supabase/001_library.sql in the Supabase SQL Editor first.");
}

export async function verifySupabase(env, directory) {
  const { snapshot, manifest } = await loadTransfer(directory);
  for (const name of importOrder) {
    const table = snapshot.tables[name];
    const rows = (await env.DB.prepare(`SELECT * FROM ${name}${table.primaryKeys.length ? " ORDER BY " + table.primaryKeys.join(",") : ""}`).all()).results;
    const expected = table.rows.map(row => table.columns.map(column => canonical(name, column, row[column.column_name])));
    const actual = rows.map(row => table.columns.map(column => canonical(name, column, row[column.column_name])));
    if (digest(JSON.stringify(actual)) !== digest(JSON.stringify(expected))) throw new Error(`Data verification failed: ${name}. Values, IDs or order differ.`);
    console.log(`Verified ${name}: ${rows.length} rows`);
  }
  for (const file of manifest.media) {
    const object = await env.MEDIA.get(file.key);
    if (!object || digest(new Uint8Array(await object.arrayBuffer())) !== file.sha256) throw new Error(`Media verification failed: ${file.key}`);
  }
  console.log(`Verified every table value and ${manifest.media.length} original media SHA-256 checksums.`);
}

export async function importSupabase(env, directory) {
  await checkSupabaseSchema(env);
  const { snapshot, manifest } = await loadTransfer(directory);
  const hash = manifest.databaseSha256;
  if (await env.DB.prepare("SELECT id FROM data_imports WHERE id=?1").bind(hash).first()) {
    console.log("This snapshot was already imported. Existing data is left unchanged.");
    return false;
  }
  const progress = await env.DB.prepare("SELECT id,next_index FROM data_import_progress").first();
  if (progress && progress.id !== hash) throw new Error("Another snapshot import is unfinished; refusing to mix datasets.");
  if (!progress) {
    for (const name of importOrder) if (await env.DB.prepare(`SELECT 1 FROM ${name} LIMIT 1`).first()) throw new Error(`Refusing to overwrite non-empty ${name}. Use an empty target for initial transfer.`);
  }
  await env.MEDIA.ensureBucket();
  // Upload originals first. An interrupted upload cannot leave broken story paths.
  for (const file of manifest.media) {
    const existing = await env.MEDIA.get(file.key);
    if (existing) {
      if (digest(new Uint8Array(await existing.arrayBuffer())) !== file.sha256) throw new Error(`Target media differs: ${file.key}`);
    } else await env.MEDIA.put(file.key, await readFile(path.join(directory, "media", file.key)));
  }
  if (!progress) await env.DB.batch([
    guard(env.DB, importOrder.map(name => `NOT EXISTS(SELECT 1 FROM ${name})`).join(" AND ") + " AND NOT EXISTS(SELECT 1 FROM data_import_progress) AND NOT EXISTS(SELECT 1 FROM data_imports)"),
    env.DB.prepare("INSERT INTO data_import_progress(id,next_index) VALUES(?1,0)").bind(hash), cleanup(env.DB),
  ]);
  const statements = [];
  for (const name of importOrder) {
    const { columns, rows } = snapshot.tables[name];
    const sql = `INSERT INTO ${name}(${columns.map(column => column.column_name).join(",")}) VALUES(${columns.map((_, index) => "?" + (index + 1)).join(",")})`;
    for (const row of rows) statements.push(env.DB.prepare(sql).bind(...columns.map(column => targetValue(name, column, row[column.column_name]))));
  }
  for (let index = progress?.next_index ?? 0; index < statements.length; index += 40) {
    const next = Math.min(index + 40, statements.length);
    await env.DB.batch([
      guard(env.DB, "EXISTS(SELECT 1 FROM data_import_progress WHERE id=?1 AND next_index=?2)", [hash, index]),
      ...statements.slice(index, next),
      env.DB.prepare("UPDATE data_import_progress SET next_index=?1 WHERE id=?2").bind(next, hash), cleanup(env.DB),
    ]);
  }
  await env.DB.batch([
    guard(env.DB, "EXISTS(SELECT 1 FROM data_import_progress WHERE id=?1 AND next_index=?2)", [hash, statements.length]),
    env.DB.prepare("INSERT INTO data_imports(id,imported_at) VALUES(?1,?2)").bind(hash, new Date().toISOString()),
    env.DB.prepare("DELETE FROM data_import_progress WHERE id=?1").bind(hash), cleanup(env.DB),
  ]);
  await verifySupabase(env, directory);
  return true;
}

export async function exportSupabase(env, directory) {
  await checkSupabaseSchema(env);
  await mkdir(path.join(directory, "media"), { recursive: true });
  const snapshot = { version: 1, exportedAt: new Date().toISOString(), tables: {} };
  // Read rows in one transaction; pause editing/uploads during a full backup.
  const tables = await env.DB.batch(importOrder.map(name => env.DB.prepare(`SELECT * FROM ${name}`)));
  for (const [index, name] of importOrder.entries()) {
    const info = (await env.DB.prepare("SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='little_readers' AND table_name=?1 ORDER BY ordinal_position").bind(name).all()).results;
    const primaryKeys = name === "reading_answers" ? ["question_id"] : name === "teacher_sessions" ? ["token_hash"] : name === "login_attempts" ? ["key"] : name === "media_files" ? ["path"] : name === "library_migrations" ? ["name"] : ["id"];
    const rows = tables[index].results.sort((a, b) => { for (const key of primaryKeys) { if (a[key] < b[key]) return -1; if (a[key] > b[key]) return 1; } return 0; });
    snapshot.tables[name] = { columns: info, primaryKeys, rows };
  }
  const media = [];
  let cursor;
  do {
    const listing = await env.MEDIA.list({ cursor });
    for (const { key } of listing.objects) {
      const object = await env.MEDIA.get(key);
      if (!object) throw new Error("Media changed during backup. Retry while editing/uploads are stopped.");
      const bytes = new Uint8Array(await object.arrayBuffer());
      await writeFile(path.join(directory, "media", key), bytes);
      media.push({ key, path: "/media/" + key, size: bytes.length, sha256: digest(bytes) });
    }
    cursor = listing.truncated ? listing.cursor : undefined;
  } while (cursor);
  media.sort((a, b) => a.key.localeCompare(b.key));
  const text = JSON.stringify(snapshot, null, 2) + "\n";
  await writeFile(path.join(directory, "snapshot.json"), text);
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify({ version: 1, exportedAt: snapshot.exportedAt, databaseSha256: digest(text), tableCounts: Object.fromEntries(Object.entries(snapshot.tables).map(([name, table]) => [name, table.rows.length])), media }, null, 2) + "\n");
  await loadTransfer(directory);
  console.log(`Exported Supabase backup: ${importOrder.length} tables, ${media.length} media files.`);
}
