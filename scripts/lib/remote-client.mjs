// Server-only transport, shared by Next.js and the private migration tools.
// SQL writes are never retried automatically: each native D1 batch is atomic.
export function createRemoteBindings({ url, token, fetch: transport = globalThis.fetch }) {
  if (!url || !token || token.length < 32) {
    throw new Error("Configure LITTLE_READERS_BACKEND_URL and LITTLE_READERS_BACKEND_TOKEN (at least 32 characters) on the server.");
  }
  const endpoint = new URL(url);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
  if ((endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && loopback)) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== "/") {
    throw new Error("LITTLE_READERS_BACKEND_URL must be an HTTPS origin; HTTP is allowed only for local loopback tests.");
  }
  const origin = endpoint.origin;
  async function request(route, options = {}) {
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);
    const response = await transport(origin + route, {
      ...options, headers, cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(45_000),
    });
    if (response.status === 404 && options.method !== "PUT") return null;
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(`Library backend (${response.status}): ${payload?.error || "request failed"}`);
    }
    return response;
  }
  async function json(route, payload) {
    const response = await request(route, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!response) throw new Error("Library backend route is unavailable. Check the deployed backend version.");
    return response.json();
  }
  class Statement {
    constructor(sql, values = []) { this.sql = sql; this.values = values; }
    bind(...values) { return new Statement(this.sql, values); }
    async all() { return (await query([this]))[0]; }
    async run() { return this.all(); }
    async first(column) {
      const row = (await this.all()).results[0] ?? null;
      if (column === undefined || row === null) return row;
      if (!Object.hasOwn(row, column)) throw new Error(`Unknown result column: ${column}`);
      return row[column];
    }
    async raw(options = {}) {
      const result = await json("/v1/db/raw", { statement: { sql: this.sql, values: this.values }, columnNames: options.columnNames === true });
      return result.rows;
    }
  }
  async function query(statements) {
    if (statements.some(statement => !(statement instanceof Statement))) throw new Error("Cannot mix statements from different database connections.");
    if (!statements.length) return [];
    const payload = await json("/v1/db/batch", { statements: statements.map(({ sql, values }) => ({ sql, values })) });
    if (!Array.isArray(payload.results) || payload.results.length !== statements.length || payload.results.some(result => !result.success)) {
      throw new Error("Invalid database response from the library backend.");
    }
    return payload.results;
  }
  function mediaRoute(key) {
    if (!/^[a-f0-9-]+\.(png|jpg|webp|mp3|wav|ogg)$/.test(key)) throw new Error("Invalid media key.");
    return "/v1/media/" + encodeURIComponent(key);
  }
  return {
    DB: { prepare: sql => new Statement(sql), batch: query },
    MEDIA: {
      async get(key) {
        const response = await request(mediaRoute(key));
        if (!response) return null;
        return {
          body: response.body,
          arrayBuffer: () => response.arrayBuffer(),
          httpMetadata: { contentType: response.headers.get("Content-Type") || "application/octet-stream" },
          etag: response.headers.get("ETag"),
          size: Number(response.headers.get("Content-Length")),
        };
      },
      async put(key, bytes, options = {}) {
        const response = await request(mediaRoute(key), {
          method: "PUT", body: bytes,
          headers: { "X-Library-Metadata": encodeURIComponent(JSON.stringify(options)) },
        });
        if (!response) throw new Error("Library backend media route is unavailable.");
        return response.json();
      },
      async list(options = {}) {
        const params = new URLSearchParams();
        if (options.cursor) params.set("cursor", options.cursor);
        const response = await request("/v1/media" + (params.size ? "?" + params : ""));
        if (!response) throw new Error("Library backend media listing is unavailable.");
        return response.json();
      },
    },
  };
}
