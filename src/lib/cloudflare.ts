import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

export type LibraryBindings = { DB: D1Database; MEDIA: R2Bucket };

export async function getLibraryBindings(): Promise<LibraryBindings> {
  const { env } = await getCloudflareContext({ async: true });
  const bindings = env as unknown as LibraryBindings;
  if (!bindings.DB || !bindings.MEDIA) throw new Error("Missing DB/MEDIA bindings. Configure local emulation or hosted D1/R2.");
  return bindings;
}
