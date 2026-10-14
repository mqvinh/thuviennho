const mediaKey = /^[a-f0-9-]+\.(png|jpg|webp|mp3|wav|ogg)$/;
const mediaTypes = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg" };
const responseHeaders = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const reply = (payload, status = 200) => Response.json(payload, { status, headers: responseHeaders });

async function authorized(request, token) {
  const encoder = new TextEncoder();
  const [actual, expected] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(request.headers.get("Authorization") || "")),
    crypto.subtle.digest("SHA-256", encoder.encode(`Bearer ${token}`)),
  ]);
  const a = new Uint8Array(actual), b = new Uint8Array(expected);
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a[index] ^ b[index];
  return difference === 0;
}
class RequestError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
async function limitedBody(request, limit) {
  if (Number(request.headers.get("Content-Length")) > limit) throw new RequestError("Request is too large.", 413);
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader(), chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); throw new RequestError("Request is too large.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
function statement(db, input) {
  if (!input || typeof input.sql !== "string" || !input.sql.trim() || input.sql.length > 100_000 || !Array.isArray(input.values) || input.values.some(value => value !== null && typeof value !== "string" && !(typeof value === "number" && Number.isFinite(value)))) {
    throw new RequestError("Invalid SQL statement or parameters.");
  }
  return db.prepare(input.sql).bind(...input.values);
}
async function readJson(request) {
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) throw new RequestError("Expected a JSON request.");
  const bytes = await limitedBody(request, 8 * 1024 * 1024);
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new RequestError("Invalid JSON request."); }
}
function mediaMetadata(header) {
  if (!header || header.length > 8192) throw new RequestError("Invalid media metadata.");
  let input;
  try { input = JSON.parse(decodeURIComponent(header)); }
  catch { throw new RequestError("Invalid media metadata."); }
  const suppliedType = input?.httpMetadata?.contentType;
  const aliases = { "audio/mp3": "audio/mpeg", "audio/x-wav": "audio/wav", "application/ogg": "audio/ogg" };
  const contentType = aliases[suppliedType] || suppliedType;
  if (contentType !== undefined && !Object.values(mediaTypes).includes(contentType)) throw new RequestError("Unsupported media type.");
  const custom = input?.customMetadata;
  if (custom !== undefined && (!custom || Array.isArray(custom) || typeof custom !== "object" || Object.values(custom).some(value => typeof value !== "string"))) throw new RequestError("Invalid custom metadata.");
  return { httpMetadata: { contentType }, customMetadata: custom };
}
const worker = {
  async fetch(request, env) {
    if (typeof env.BACKEND_TOKEN !== "string" || env.BACKEND_TOKEN.length < 32 || !env.DB || !env.MEDIA) return reply({ error: "Backend configuration is incomplete." }, 503);
    if (!await authorized(request, env.BACKEND_TOKEN)) return reply({ error: "Unauthorized." }, 401);
    const url = new URL(request.url);
    try {
      if (url.pathname === "/v1/health" && request.method === "GET") return reply({ version: 1, database: true, media: true });
      if (url.pathname === "/v1/db/batch" && request.method === "POST") {
        const body = await readJson(request);
        if (!Array.isArray(body?.statements) || !body.statements.length || body.statements.length > 1000) throw new RequestError("Invalid statement batch.");
        // Native D1 executes the full batch in one transaction, including guards.
        const results = await env.DB.batch(body.statements.map(input => statement(env.DB, input)));
        return reply({ results });
      }
      if (url.pathname === "/v1/db/raw" && request.method === "POST") {
        const body = await readJson(request);
        return reply({ rows: await statement(env.DB, body?.statement).raw({ columnNames: body?.columnNames === true }) });
      }
      if (url.pathname === "/v1/media" && request.method === "GET") {
        return reply(await env.MEDIA.list({ cursor: url.searchParams.get("cursor") || undefined }));
      }
      if (url.pathname.startsWith("/v1/media/")) {
        const key = decodeURIComponent(url.pathname.slice("/v1/media/".length));
        if (!mediaKey.test(key)) throw new RequestError("Invalid media key.");
        if (request.method === "GET") {
          const object = await env.MEDIA.get(key);
          if (!object) return reply({ error: "Not found." }, 404);
          return new Response(object.body, { headers: {
            ...responseHeaders, "Content-Type": object.httpMetadata?.contentType || mediaTypes[key.split(".").pop()],
            "Content-Length": String(object.size), "ETag": object.httpEtag,
          } });
        }
        if (request.method === "PUT") {
          const metadata = mediaMetadata(request.headers.get("X-Library-Metadata"));
          metadata.httpMetadata.contentType ||= mediaTypes[key.split(".").pop()];
          const bytes = await limitedBody(request, 5 * 1024 * 1024);
          const object = await env.MEDIA.put(key, bytes, metadata);
          return reply({ key: object.key, size: object.size, etag: object.etag });
        }
      }
      return reply({ error: "Not found." }, 404);
    } catch (error) {
      return reply({ error: error instanceof Error ? error.message.slice(0, 1000) : "Backend request failed." }, error instanceof RequestError ? error.status : 500);
    }
  },
};
export default worker;
