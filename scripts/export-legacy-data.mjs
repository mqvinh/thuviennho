import { PGlite } from "@electric-sql/pglite";
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const source = path.resolve(option("--database", ".data/little-readers"));
const media = path.resolve(option("--media", ".data/media"));
const output = path.resolve(option("--out", ".data/sites-transfer"));
if (output === source || output.startsWith(source + path.sep)) throw new Error("Export must be outside the source database.");
await mkdir(path.join(output, "media"), { recursive: true });
const db = new PGlite(source);
await db.waitReady;
try {
  const tables = (await db.query("select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name")).rows;
  const snapshot = { version: 1, exportedAt: new Date().toISOString(), tables: {} };
  for (const { table_name: name } of tables) {
    if (!/^[a-z_]+$/.test(name)) throw new Error("Unexpected table name.");
    const columns = (await db.query("select column_name,data_type,udt_name,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position", [name])).rows;
    const primaryKeys = (await db.query("select a.attname from pg_index i join pg_attribute a on a.attrelid=i.indrelid and a.attnum=any(i.indkey) where i.indrelid=$1::regclass and i.indisprimary order by a.attnum", [name])).rows.map(row => row.attname);
    const rows = (await db.query(`select * from "${name}"${primaryKeys.length ? ` order by ${primaryKeys.map(key => `"${key}"`).join(",")}` : ""}`)).rows;
    snapshot.tables[name] = { columns, primaryKeys, rows };
    console.log(`${name}: ${rows.length} rows`);
  }
  const files = [];
  for (const entry of await readdir(media, { withFileTypes: true })) {
    if (!entry.isFile()) throw new Error(`Unexpected media directory: ${entry.name}`);
    const bytes = await readFile(path.join(media, entry.name));
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    await copyFile(path.join(media, entry.name), path.join(output, "media", entry.name));
    const copied = await readFile(path.join(output, "media", entry.name));
    if (createHash("sha256").update(copied).digest("hex") !== sha256) throw new Error("Media copy verification failed.");
    files.push({ key: entry.name, path: `/media/${entry.name}`, size: bytes.length, sha256 });
  }
  files.sort((a, b) => a.key.localeCompare(b.key));
  const snapshotText = JSON.stringify(snapshot, null, 2) + "\n";
  await writeFile(path.join(output, "snapshot.json"), snapshotText);
  await writeFile(path.join(output, "manifest.json"), JSON.stringify({ version: 1, exportedAt: snapshot.exportedAt, databaseSha256: createHash("sha256").update(snapshotText).digest("hex"), tableCounts: Object.fromEntries(Object.entries(snapshot.tables).map(([name, table]) => [name, table.rows.length])), media: files }, null, 2) + "\n");
  console.log(`Exported ${tables.length} tables and ${files.length} verified media files to ${output}`);
} finally {
  await db.close();
}
