import { PGlite } from "@electric-sql/pglite";
import { readFile, mkdir, rm } from "node:fs/promises";
import { scryptSync } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
const dir = path.resolve(process.cwd(), ".data", "automated-tests");
if (path.dirname(dir) !== path.resolve(process.cwd(), ".data") || path.basename(dir) !== "automated-tests") throw new Error("Unsafe test cleanup path.");
const stateDir = path.join(dir,"d1-state");
const legacyDir = path.join(dir,"legacy");
await rm(dir, { recursive: true, force: true });
await mkdir(dir, { recursive: true });
const db = new PGlite(legacyDir);
await db.waitReady;
await db.exec("create table if not exists library_migrations (name text primary key)");
for (const file of [
  "local.sql",
  "002_local_features.sql",
  "003_local_catalog.sql",
  "004_local_operations.sql",
  "005_more_stories.sql",
  "006_user_profiles.sql",
  "007_site_settings_visibility.sql",
  "008_optional_story_themes.sql",
  "009_site_description.sql",
  "010_draft_vocabulary.sql",
  "011_user_avatars_story_dates.sql",
  "012_theme_icons.sql",
]) {
  await db.exec(await readFile(`database/${file}`, "utf8"));
  await db.query("insert into library_migrations(name) values($1)", [file]);
}
// A multi-page published catalogue exists only in this isolated test database.
await db.query("update stories set is_published=true,review_status='published' where id in (select id from stories where review_status='draft' order by slug limit 16)");
for (const [username, role] of [
  ["test-admin", "admin"],
  ["test-teacher", "teacher"],
  ["other-teacher", "teacher"],
]) {
  const salt = "test-only-fixed-salt";
  const hash = scryptSync("Test-password-123!", salt, 64).toString("hex");
  await db.query(
    "insert into teacher_users(username,password_hash,role) values($1,$2,$3)",
    [username, `${salt}:${hash}`, role],
  );
}
const legacySalt = "legacy-test-only-salt";
await db.query("insert into teacher_users(username,password_hash,role) values($1,$2,'teacher')", ["legacy-teacher", `${legacySalt}:${scryptSync("test-password-123", legacySalt, 64).toString("hex")}`]);
await db.close();
await mkdir(path.join(dir,"media"),{recursive:true});
const transferDir=path.join(dir,"transfer");
const result=spawnSync(process.execPath,["scripts/export-legacy-data.mjs","--database",legacyDir,"--media",path.join(dir,"media"),"--out",transferDir],{stdio:"inherit"});
if(result.status!==0) throw new Error("Test data export failed.");
const {openLocalPlatform}=await import("../scripts/lib/local-platform.mjs");
const {applyMigrations,importTransfer}=await import("../scripts/lib/data-transfer.mjs");
const platform=await openLocalPlatform(stateDir);
try {await applyMigrations(platform.env.DB);await importTransfer(platform.env,transferDir);} finally {await platform.dispose();}
const child = spawn(
  process.execPath,
  process.env.LITTLE_READERS_TEST_RUNTIME === "workers"
    ? ["node_modules/wrangler/bin/wrangler.js", "dev", "--port", "3100", "--persist-to", stateDir]
    : ["node_modules/next/dist/bin/next", "dev", "--port", "3100"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      LITTLE_READERS_STATE_DIR: stateDir,
      LITTLE_READERS_TEST: "1",
      OPENAI_API_KEY: "",
      OPENAI_MODEL: "",
    },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
