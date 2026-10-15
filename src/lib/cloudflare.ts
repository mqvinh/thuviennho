import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createRemoteBindings } from "../../scripts/lib/remote-client.mjs";
import { createSupabaseBindings } from "../../scripts/lib/supabase-client.mjs";
import type { LibraryBindings } from "./platform-types";
export type { LibraryBindings } from "./platform-types";

export async function getLibraryBindings(): Promise<LibraryBindings> {
  // Vercel uses Supabase. Local development retains its original D1/R2 state.
  if (process.env.VERCEL === "1" || process.env.SUPABASE_URL || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createSupabaseBindings({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, bucket: process.env.SUPABASE_MEDIA_BUCKET });
  }
  if (process.env.LITTLE_READERS_BACKEND_URL || process.env.LITTLE_READERS_BACKEND_TOKEN) {
    return createRemoteBindings({
      url: process.env.LITTLE_READERS_BACKEND_URL,
      token: process.env.LITTLE_READERS_BACKEND_TOKEN,
    });
  }
  const { env } = await getCloudflareContext({ async: true });
  const bindings = env as unknown as LibraryBindings;
  if (!bindings.DB || !bindings.MEDIA) throw new Error("Missing DB/MEDIA bindings. Configure local emulation or hosted D1/R2.");
  return bindings;
}
