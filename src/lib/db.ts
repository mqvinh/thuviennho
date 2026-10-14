import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const dataDir =
  process.env.LITTLE_READERS_DATA_DIR ||
  path.join(process.cwd(), ".data", "little-readers");
type DatabaseState = typeof globalThis & {
  littleReadersDb?: PGlite;
  littleReadersDbReady?: Promise<PGlite>;
};
const state = globalThis as DatabaseState;
export async function getDb(): Promise<PGlite> {
  if (state.littleReadersDb) return state.littleReadersDb;
  if (state.littleReadersDbReady) return state.littleReadersDbReady;
  state.littleReadersDbReady = (async () => {
    await mkdir(path.dirname(dataDir), { recursive: true });
    const db = new PGlite(dataDir);
    try {
      await db.waitReady;
      await db.exec(
        "create table if not exists library_migrations (name text primary key)",
      );
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
        const sql = await readFile(
          path.join(process.cwd(), "database", file),
          "utf8",
        );
        await db.transaction(async (tx) => {
          if (
            (
              await tx.query("select 1 from library_migrations where name=$1", [
                file,
              ])
            ).rows.length
          )
            return;
          await tx.exec(sql);
          await tx.query("insert into library_migrations(name) values($1)", [
            file,
          ]);
        });
      }
      state.littleReadersDb = db;
      return db;
    } catch (error) {
      await db.close();
      throw error;
    }
  })();
  try {
    return await state.littleReadersDbReady;
  } catch (error) {
    state.littleReadersDbReady = undefined;
    throw error;
  }
}
