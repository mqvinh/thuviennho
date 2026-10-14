import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createRemoteBindings } from "../../scripts/lib/remote-client.mjs";
import type { LibraryBindings } from "./platform-types";
export type { LibraryBindings } from "./platform-types";

export async function getLibraryBindings(): Promise<LibraryBindings> {
  // Vercel must use durable remote resources, never Wrangler's local emulator.
  if (process.env.VERCEL === "1" || process.env.LITTLE_READERS_BACKEND_URL || process.env.LITTLE_READERS_BACKEND_TOKEN) {
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
