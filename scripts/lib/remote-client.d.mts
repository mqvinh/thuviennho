import type { LibraryBindings } from "../../src/lib/platform-types";

export function createRemoteBindings(options: {
  url?: string;
  token?: string;
  fetch?: typeof globalThis.fetch;
}): LibraryBindings;
