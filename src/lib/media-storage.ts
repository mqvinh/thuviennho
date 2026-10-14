import "server-only";
import { getLibraryBindings } from "./cloudflare";

export async function putMedia(key: string, bytes: Uint8Array, contentType: string) {
  await (await getLibraryBindings()).MEDIA.put(key, bytes, { httpMetadata: { contentType } });
}
export async function readMedia(key: string) {
  return (await getLibraryBindings()).MEDIA.get(key);
}
