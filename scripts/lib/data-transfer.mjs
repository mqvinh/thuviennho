import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

export const digest = bytes => createHash("sha256").update(bytes).digest("hex");
export const importOrder = ["reading_themes","teacher_users","stories","story_sentences","vocabulary","reading_questions","reading_answers","teacher_sessions","login_attempts","media_files","site_settings","library_migrations"];
const mime = {png:"image/png",jpg:"image/jpeg",webp:"image/webp",mp3:"audio/mpeg",wav:"audio/wav",ogg:"audio/ogg"};

export async function applyMigrations(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS d1_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,applied_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))").run();
  for (const name of (await readdir("database/d1/migrations")).filter(name=>name.endsWith(".sql")).sort()) {
    if (await db.prepare("SELECT name FROM d1_migrations WHERE name=?1").bind(name).first()) continue;
    const sql = await readFile(path.join("database/d1/migrations",name),"utf8");
    const statements = sql.replace(/^\s*--.*$/gm,"").split(";").map(sql=>sql.trim()).filter(Boolean).map(sql=>db.prepare(sql));
    await db.batch([...statements,db.prepare("INSERT INTO d1_migrations(name) VALUES(?1)").bind(name)]);
    console.log(`Applied ${name}`);
  }
  await db.prepare("CREATE TABLE IF NOT EXISTS data_imports(id TEXT PRIMARY KEY,imported_at TEXT NOT NULL)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS data_import_progress(id TEXT PRIMARY KEY,next_index INTEGER NOT NULL)").run();
}

export function normalizeValue(value,column) {
  if (value === null) return null;
  if (column.data_type === "boolean") return Number(value);
  if (column.data_type === "jsonb") return JSON.stringify(value);
  return value;
}

export async function loadTransfer(directory) {
  const text = await readFile(path.join(directory,"snapshot.json"),"utf8");
  const manifest = JSON.parse(await readFile(path.join(directory,"manifest.json"),"utf8"));
  if (manifest.version !== 1 || digest(text) !== manifest.databaseSha256) throw new Error("Snapshot checksum does not match manifest.");
  const snapshot = JSON.parse(text);
  if (snapshot.version !== 1 || Object.keys(snapshot.tables).some(name=>!importOrder.includes(name))) throw new Error("Unsupported snapshot schema.");
  for (const name of importOrder) {
    const table = snapshot.tables[name];
    if (!table || table.rows.length !== manifest.tableCounts[name]) throw new Error(`Snapshot count mismatch: ${name}`);
    if (table.columns.some(column=>!/^[a-z_]+$/.test(column.column_name))) throw new Error("Invalid column name.");
  }
  const keys = new Set();
  for (const file of manifest.media) {
    if (!/^[a-f0-9-]+\.(png|jpg|webp|mp3|wav|ogg)$/.test(file.key) || keys.has(file.key)) throw new Error("Invalid or duplicated media key.");
    keys.add(file.key);
    const bytes = await readFile(path.join(directory,"media",file.key));
    if (bytes.length !== file.size || digest(bytes) !== file.sha256) throw new Error(`Source media checksum mismatch: ${file.key}`);
  }
  for (const name of importOrder) {
    for (const row of snapshot.tables[name].rows) {
      for (const value of Object.values(row)) {
        if (typeof value === "string" && value.startsWith("/media/") && !keys.has(value.slice(7))) throw new Error(`Missing referenced media in ${name}.`);
      }
    }
  }
  return {snapshot,manifest};
}

export async function importTransfer(env,directory) {
  const {snapshot,manifest} = await loadTransfer(directory);
  if (await env.DB.prepare("SELECT id FROM data_imports WHERE id=?1").bind(manifest.databaseSha256).first()) {
    console.log("This snapshot was already imported. Existing data is left unchanged.");
    return false;
  }
  const progress = await env.DB.prepare("SELECT id,next_index FROM data_import_progress").first();
  if (progress && progress.id !== manifest.databaseSha256) throw new Error("Another snapshot import is unfinished; refusing to mix datasets.");
  if (!progress) {
    for (const name of importOrder) {
      if ((await env.DB.prepare(`SELECT count(*) AS total FROM ${name}`).first()).total) throw new Error(`Refusing to overwrite non-empty ${name}. Use an empty target for initial transfer.`);
    }
  }
  // Files precede records: an interrupted upload cannot create broken database references.
  for (const file of manifest.media) {
    const existing = await env.MEDIA.get(file.key);
    if (existing) {
      if (digest(new Uint8Array(await existing.arrayBuffer())) !== file.sha256) throw new Error(`Target media differs: ${file.key}`);
    } else await env.MEDIA.put(file.key,await readFile(path.join(directory,"media",file.key)),{httpMetadata:{contentType:mime[path.extname(file.key).slice(1)]},customMetadata:{sha256:file.sha256}});
  }
  const statements = [];
  for (const name of importOrder) {
    const {columns,rows} = snapshot.tables[name];
    const sql = `INSERT INTO ${name}(${columns.map(column=>column.column_name).join(",")}) VALUES(${columns.map((_,index)=>`?${index+1}`).join(",")})`;
    for (const row of rows) statements.push({sql,values:columns.map(column=>normalizeValue(row[column.column_name],column))});
  }
  if (!progress) await env.DB.prepare("INSERT INTO data_import_progress(id,next_index) VALUES(?1,0)").bind(manifest.databaseSha256).run();
  for (let index = progress?.next_index ?? 0; index < statements.length; index += 40) {
    const next = Math.min(index+40,statements.length);
    await env.DB.batch([...statements.slice(index,next).map(statement=>env.DB.prepare(statement.sql).bind(...statement.values)),env.DB.prepare("UPDATE data_import_progress SET next_index=?1 WHERE id=?2").bind(next,manifest.databaseSha256)]);
  }
  await env.DB.batch([
    env.DB.prepare("INSERT INTO data_imports(id,imported_at) VALUES(?1,?2)").bind(manifest.databaseSha256,new Date().toISOString()),
    env.DB.prepare("DELETE FROM data_import_progress WHERE id=?1").bind(manifest.databaseSha256),
  ]);
  await verifyTransfer(env,directory);
  return true;
}

export async function verifyTransfer(env,directory) {
  const {snapshot,manifest} = await loadTransfer(directory);
  for (const name of importOrder) {
    const table = snapshot.tables[name];
    const rows = (await env.DB.prepare(`SELECT * FROM ${name}${table.primaryKeys.length ? " ORDER BY "+table.primaryKeys.join(",") : ""}`).all()).results;
    const expected = table.rows.map(row=>table.columns.map(column=>normalizeValue(row[column.column_name],column)));
    const actual = rows.map(row=>table.columns.map(column=>row[column.column_name]));
    if (digest(JSON.stringify(actual)) !== digest(JSON.stringify(expected))) throw new Error(`Data verification failed for ${name}. Values, IDs or order differ.`);
    console.log(`Verified ${name}: ${rows.length} rows`);
  }
  if ((await env.DB.prepare("PRAGMA foreign_key_check").all()).results.length) throw new Error("Foreign key check failed.");
  for (const file of manifest.media) {
    const object = await env.MEDIA.get(file.key);
    if (!object || digest(new Uint8Array(await object.arrayBuffer())) !== file.sha256) throw new Error(`Target media verification failed: ${file.key}`);
  }
  console.log(`Verified all table values and ${manifest.media.length} media SHA-256 checksums.`);
}
