import "server-only";
import { cache } from "react";
import { io } from "next/cache";
import { getDb } from "./db";

export type SiteSettings = {
  site_name: string;
  site_description: string;
  icon_path: string;
  logo_path: string;
};

// Deduplicate metadata/header/footer reads within one server render.
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  await io();
  const db = await getDb();
  return (await db.query<SiteSettings>(
    "select site_name,site_description,icon_path,logo_path from site_settings where id=true",
  )).rows[0];
});
