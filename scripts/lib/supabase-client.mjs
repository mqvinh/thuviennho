// Server-side transport. Never import this module from a client component.
const mediaKey = /^[a-f0-9-]+\.(png|jpg|webp|mp3|wav|ogg)$/;
const aliases = { "audio/mp3": "audio/mpeg", "audio/x-wav": "audio/wav", "application/ogg": "audio/ogg" };
const mediaTypes = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg" };

function literal(value) {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && !value.includes("\0")) return "E'" + value.replaceAll("\\", "\\\\").replaceAll("'", "''") + "'";
  throw new Error("Unsupported SQL parameter.");
}

// Only the application's fixed SQL templates enter here. Replacements are made
// once, outside literals/comments; user values cannot become SQL syntax.
export function compilePostgres(sql, values = []) {
  sql = sql.replace(/strftime\('%Y-%m-%dT%H:%M:%fZ','now'(?:,'\+(\d+) (minutes|hours)')?\)/g, (_, amount, unit) =>
    `to_char((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')${amount ? ` + interval '${amount} ${unit}'` : ""}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`);
  let returning = false;
  const compiled = sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|--[^\n]*|\/\*[\s\S]*?\*\/|\?[1-9]\d*|\breturning\b/gi, token => {
    if (token.toLowerCase() === "returning") returning = true;
    if (!token.startsWith("?")) return token;
    const index = Number(token.slice(1)) - 1;
    if (index >= values.length) throw new Error("Missing SQL parameter.");
    return literal(values[index]);
  });
  return { sql: compiled, returns_rows: /^\s*select\b/i.test(sql) || returning };
}

export function createSupabaseBindings({ url, key, bucket = "little-readers-media", fetch: transport = globalThis.fetch }) {
  if (!url || !key) throw new Error("Configure SUPABASE_URL and SUPABASE_SECRET_KEY on the server. Vercel no longer needs Cloudflare D1/R2.");
  const endpoint = new URL(url);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
  if ((endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && loopback)) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== "/") throw new Error("SUPABASE_URL must be an HTTPS project origin.");
  let legacy = false;
  if (!key.startsWith("sb_secret_")) {
    try { legacy = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role === "service_role"; } catch {}
    if (!legacy) throw new Error("Use a Supabase secret key or legacy service_role key, never an anon/publishable key.");
  }
  if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(bucket)) throw new Error("Invalid SUPABASE_MEDIA_BUCKET.");
  const origin = endpoint.origin;
  async function request(route, options = {}, missing = false) {
    const headers = new Headers(options.headers);
    headers.set("apikey", key);
    if (legacy) headers.set("Authorization", `Bearer ${key}`);
    const response = await transport(origin + route, { ...options, headers, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000) });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (missing && (response.status === 404 || error.code === "not_found" || error.error === "not_found" || /^(object not found|bucket not found|the resource was not found)$/i.test(error.message || ""))) return null;
      // Do not log SQL parameters, request bodies, connection strings or keys.
      throw new Error(`Supabase (${error.code || response.status}): ${error.message || error.error || "Request failed."}`);
    }
    return response;
  }
  async function rpc(statements) {
    if (!statements.length) return [];
    if (statements.some(statement => !(statement instanceof Statement))) throw new Error("Cannot mix database connections.");
    const response = await request("/rest/v1/rpc/library_batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statements: statements.map(({ sql, values }) => compilePostgres(sql, values)) }) });
    const result = await response.json();
    if (!Array.isArray(result) || result.length !== statements.length || result.some(item => !item.success)) throw new Error("Invalid Supabase database response.");
    return result;
  }
  class Statement {
    constructor(sql, values = []) { this.sql = sql; this.values = values; }
    bind(...values) { return new Statement(this.sql, values); }
    async all() { return (await rpc([this]))[0]; }
    async run() { return this.all(); }
    async first(column) { const row = (await this.all()).results[0] ?? null; return column === undefined || row === null ? row : row[column]; }
  }
  function objectRoute(key) { if (!mediaKey.test(key)) throw new Error("Invalid media key."); return bucket + "/" + key; }
  const media = {
    async get(key) {
      const response = await request("/storage/v1/object/authenticated/" + objectRoute(key), {}, true);
      return response ? { body: response.body, arrayBuffer: () => response.arrayBuffer(), httpMetadata: { contentType: response.headers.get("Content-Type") } } : null;
    },
    async put(key, bytes, options = {}) {
      if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Media files must not exceed 5 MB.");
      const supplied = options.httpMetadata?.contentType;
      const type = aliases[supplied] || supplied || mediaTypes[key.split(".").pop()];
      if (!Object.values(mediaTypes).includes(type)) throw new Error("Unsupported media type.");
      return (await request("/storage/v1/object/" + objectRoute(key), { method: "POST", headers: { "Content-Type": type, "x-upsert": "false" }, body: bytes })).json();
    },
    async list({ cursor } = {}) {
      const offset = cursor ? Number(cursor) : 0;
      if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("Invalid media cursor.");
      const response = await request("/storage/v1/object/list/" + bucket, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefix: "", limit: 1000, offset, sortBy: { column: "name", order: "asc" } }) });
      const items = await response.json();
      if (!Array.isArray(items) || items.some(item => !mediaKey.test(item.name))) throw new Error("Unexpected object in the media bucket.");
      return { objects: items.map(item => ({ key: item.name })), truncated: items.length === 1000, cursor: items.length === 1000 ? String(offset + items.length) : undefined };
    },
    async ensureBucket() {
      const response = await request("/storage/v1/bucket/" + bucket, {}, true);
      if (response) {
        const current = await response.json();
        if (current.public) throw new Error("The media bucket must be private. Disable Public bucket before importing.");
        return;
      }
      await request("/storage/v1/bucket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: bucket, name: bucket, public: false, file_size_limit: 5 * 1024 * 1024, allowed_mime_types: Object.values(mediaTypes) }) });
    },
  };
  return { DB: { dialect: "postgres", prepare: sql => new Statement(sql), batch: rpc }, MEDIA: media };
}
