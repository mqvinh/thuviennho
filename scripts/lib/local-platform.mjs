import { getPlatformProxy } from "wrangler";
import path from "node:path";

export function openLocalPlatform(state = process.env.LITTLE_READERS_STATE_DIR || ".wrangler/state") {
  // Wrangler CLI appends v3 to --persist-to; getPlatformProxy takes the final path.
  return getPlatformProxy({ configPath: "wrangler.jsonc", persist: { path: path.resolve(state,"v3") }, envFiles: [] });
}
