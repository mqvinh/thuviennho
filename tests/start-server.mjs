import { PGlite } from "@electric-sql/pglite";
import { readFile, mkdir, rm } from "node:fs/promises";
import { scryptSync } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
const dir = path.join(process.cwd(), ".data", "automated-tests");
await rm(dir, { recursive: true, force: true });
await mkdir(dir, { recursive: true });
const db = new PGlite(dir);
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
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--port", "3100"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      LITTLE_READERS_DATA_DIR: dir,
      LITTLE_READERS_TEST: "1",
      OPENAI_API_KEY: "",
      OPENAI_MODEL: "",
    },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
