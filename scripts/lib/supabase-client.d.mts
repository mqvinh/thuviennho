import type { LibraryBindings } from "../../src/lib/platform-types";
export function createSupabaseBindings(options: { url?: string; key?: string; bucket?: string; fetch?: typeof globalThis.fetch }): LibraryBindings;
