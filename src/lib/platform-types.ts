import type { D1Result } from "@cloudflare/workers-types";

export type LibrarySqlValue = string | number | boolean | null;
export interface LibraryStatement {
  bind(...values: LibrarySqlValue[]): LibraryStatement;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}
export interface LibraryDatabaseBinding {
  dialect?: "postgres";
  prepare(sql: string): LibraryStatement;
  batch<T = unknown>(statements: LibraryStatement[]): Promise<D1Result<T>[]>;
}
export interface LibraryMediaBinding {
  put(key: string, bytes: Uint8Array, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream<Uint8Array>; arrayBuffer(): Promise<ArrayBuffer> } | null>;
}
export type LibraryBindings = { DB: LibraryDatabaseBinding; MEDIA: LibraryMediaBinding };
