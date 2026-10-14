import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { readFile, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import worker from "../backend/worker.mjs";
import { createRemoteBindings } from "../scripts/lib/remote-client.mjs";
import { openLocalPlatform } from "../scripts/lib/local-platform.mjs";
import { applyMigrations, importTransfer, verifyTransfer, loadTransfer, digest } from "../scripts/lib/data-transfer.mjs";

const directory = path.resolve(".data/remote-backend-tests", randomUUID());
await mkdir(directory, { recursive: true });
const platform = await openLocalPlatform(path.join(directory, "state"));
const token = randomBytes(32).toString("hex");
const env = { ...platform.env, BACKEND_TOKEN: token };
const server = createServer(async (incoming, outgoing) => {
  try {
    const method = incoming.method || "GET";
    const request = new Request("http://127.0.0.1" + incoming.url, {
      method, headers: incoming.headers,
      ...(method !== "GET" && method !== "HEAD" ? { body: Readable.toWeb(incoming), duplex: "half" } : {}),
    });
    const response = await worker.fetch(request, env);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body).pipe(outgoing);
    else outgoing.end();
  } catch { outgoing.writeHead(500); outgoing.end("Test transport failed."); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = "http://127.0.0.1:" + server.address().port;
let frontend;
const source = process.argv.includes("--from") ? process.argv[process.argv.indexOf("--from") + 1] : ".data/sites-transfer";
try {
  assert.throws(() => createRemoteBindings({ url, token: "short" }), /Configure/);
  assert.throws(() => createRemoteBindings({ url: "http://example.com", token }), /HTTPS/);
  assert.throws(() => createRemoteBindings({ url: "https://user:pass@example.com", token }), /HTTPS/);
  assert.throws(() => createRemoteBindings({ url: "https://example.com?token=unsafe", token }), /HTTPS/);
  for (const route of ["/v1/health", "/v1/media", "/v1/media/aa.png"]) {
    const response = await fetch(url + route);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await response.json(), { error: "Unauthorized." });
  }
  const unauthorized = await fetch(url + "/v1/db/batch", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ statements: [{ sql: "CREATE TABLE unauthorized_write(id TEXT)", values: [] }] }),
  });
  assert.equal(unauthorized.status, 401);
  assert.equal(await env.DB.prepare("SELECT name FROM sqlite_master WHERE name='unauthorized_write'").first(), null);
  const invalid = await fetch(url + "/v1/db/batch", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ statements: [{ sql: "SELECT ?1", values: [{ invalid: true }] }] }),
  });
  assert.equal(invalid.status, 400);
  console.log("Backend rejects unauthenticated database/media access and malformed parameters.");

  const bindings = createRemoteBindings({ url, token });
  await applyMigrations(bindings.DB);
  await importTransfer(bindings, source);
  const { snapshot, manifest } = await loadTransfer(source);
  assert.equal(await importTransfer(bindings, source), false);
  await verifyTransfer(bindings, source);

  const id = randomUUID();
  await bindings.DB.prepare("INSERT INTO reading_themes(id,slug,name_vi,name_en) VALUES(?1,?2,'Original','Original')").bind(id, "remote-" + id).run();
  await assert.rejects(() => bindings.DB.batch([
    bindings.DB.prepare("UPDATE reading_themes SET name_vi='Changed' WHERE id=?1").bind(id),
    bindings.DB.prepare("INSERT INTO transaction_guards(id,valid) VALUES(?1,0)").bind(id),
  ]), /CHECK constraint failed/);
  assert.equal(await bindings.DB.prepare("SELECT name_vi FROM reading_themes WHERE id=?1").bind(id).first("name_vi"), "Original");
  assert.equal(await bindings.DB.prepare("SELECT id FROM transaction_guards WHERE id=?1").bind(id).first(), null);
  assert.deepEqual(await bindings.DB.prepare("SELECT ?1 AS first,?2 AS second").bind("value", null).raw({ columnNames: true }), [["first", "second"], ["value", null]]);
  await bindings.DB.prepare("DELETE FROM reading_themes WHERE id=?1").bind(id).run();
  console.log("HTTP backend preserved native D1 atomic rollback, parameters and raw column order.");

  const missing = await bindings.MEDIA.get(randomUUID() + ".png");
  assert.equal(missing, null);
  const published = snapshot.tables.stories.rows.find(row => row.is_published && row.is_visible && row.cover_image_path?.startsWith("/media/"));
  assert.ok(published, "The preserved dataset must include a published cover for the production smoke test.");
  const file = manifest.media.find(file => "/media/" + file.key === published.cover_image_path);
  assert.ok(file);
  const bytes = await readFile(path.join(source, "media", file.key));
  const response = await fetch(url + "/v1/media/" + file.key, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(digest(new Uint8Array(await response.arrayBuffer())), file.sha256);
  assert.equal(digest(bytes), file.sha256);

  // A second snapshot cannot overwrite an occupied database.
  const otherSource = path.join(directory, "other-transfer");
  const { cp, writeFile } = await import("node:fs/promises");
  await cp(source, otherSource, { recursive: true });
  const other = JSON.parse(await readFile(path.join(otherSource, "snapshot.json"), "utf8"));
  other.exportedAt = new Date(Date.now() + 1000).toISOString();
  const otherText = JSON.stringify(other, null, 2) + "\n";
  await writeFile(path.join(otherSource, "snapshot.json"), otherText);
  await writeFile(path.join(otherSource, "manifest.json"), JSON.stringify({ ...manifest, databaseSha256: digest(otherText) }));
  await assert.rejects(() => importTransfer(bindings, otherSource), /Refusing to overwrite/);
  console.log("Preserved every original row and media checksum; replay and conflicting imports are prevented.");

  if (process.argv.includes("--next")) {
    const username = "vercel-test-" + randomUUID().slice(0, 8);
    const password = "Vercel-test-123!";
    const salt = "isolated-vercel-test-salt";
    await bindings.DB.prepare("INSERT INTO teacher_users(id,username,password_hash,role) VALUES(?1,?2,?3,'admin')").bind(randomUUID(), username, `${salt}:${scryptSync(password, salt, 64).toString("hex")}`).run();
    const frontendPort = 3105;
    // NextURL normalizes every loopback address to localhost. Use that origin
    // so the fixture observes the same CSRF checks as the local browser.
    const frontendUrl = "http://localhost:" + frontendPort;
    frontend = spawn(process.execPath, ["--experimental-loader", "./tests/deny-wrangler-loader.mjs", "node_modules/next/dist/bin/next", "start", "--hostname", "localhost", "--port", String(frontendPort)], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_ENV: "production", VERCEL: "1", LITTLE_READERS_TEST: "1", LITTLE_READERS_BACKEND_URL: url, LITTLE_READERS_BACKEND_TOKEN: token, OPENAI_API_KEY: "", OPENAI_MODEL: "" },
    });
    let output = "";
    frontend.stdout.on("data", chunk => { output += chunk; });
    frontend.stderr.on("data", chunk => { output += chunk; });
    let ready = false;
    for (let index = 0; index < 90; index++) {
      if (frontend.exitCode !== null) throw new Error("Production Next server exited: " + output.slice(-3000));
      try { const response = await fetch(frontendUrl, { signal: AbortSignal.timeout(3000) }); ready = response.status === 200; await response.arrayBuffer(); } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    assert.ok(ready, "Production Next server did not open: " + output.slice(-3000));
    for (const route of ["/", "/nghe-sach", "/tu-vung", "/thu-tai", "/truyen/" + published.slug, "/doc/" + published.slug]) {
      const response = await fetch(frontendUrl + route);
      assert.equal(response.status, 200, route);
      assert.match(await response.text(), /Thư Viện|Little Readers/i);
    }
    const publicCover = await fetch(frontendUrl + published.cover_image_path);
    assert.equal(publicCover.status, 200);
    assert.equal(digest(new Uint8Array(await publicCover.arrayBuffer())), file.sha256);
    const login = await fetch(frontendUrl + "/api/teacher/login", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: frontendUrl }, body: JSON.stringify({ username, password }),
    });
    assert.equal(login.status, 200, "Legacy password verification on Vercel");
    const cookie = login.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    const accounts = await fetch(frontendUrl + "/api/teacher/accounts", { headers: { Cookie: cookie } });
    assert.equal(accounts.status, 200);
    assert.ok((await accounts.json()).users.some(user => user.username === username));
    const profile = await fetch(frontendUrl + "/api/teacher/accounts", {
      method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json", Origin: frontendUrl },
      body: JSON.stringify({ action: "profile", full_name: "Vercel remote test", email: "vercel-test@example.com" }),
    });
    assert.equal(profile.status, 200);
    assert.equal(await bindings.DB.prepare("SELECT full_name FROM teacher_users WHERE username=?1").bind(username).first("full_name"), "Vercel remote test");
    const png = await readFile("public/images/themes/book.png");
    const upload = await fetch(frontendUrl + "/api/teacher/upload", {
      method: "POST", headers: { Cookie: cookie, "Content-Type": "image/png", Origin: frontendUrl }, body: png,
    });
    assert.equal(upload.status, 200);
    const uploadedPath = (await upload.json()).path;
    assert.equal((await fetch(frontendUrl + uploadedPath)).status, 404);
    const uploadedImage = await fetch(frontendUrl + uploadedPath, { headers: { Cookie: cookie } });
    assert.equal(uploadedImage.status, 200);
    assert.equal(digest(new Uint8Array(await uploadedImage.arrayBuffer())), digest(png));
    const audio = Buffer.from("ID3\u0004\u0000\u0000test-audio-transport");
    const audioUpload = await fetch(frontendUrl + "/api/teacher/upload", {
      method: "POST", headers: { Cookie: cookie, "Content-Type": "audio/mp3", Origin: frontendUrl }, body: audio,
    });
    assert.equal(audioUpload.status, 200);
    const audioPath = (await audioUpload.json()).path;
    const uploadedAudio = await fetch(frontendUrl + audioPath, { headers: { Cookie: cookie } });
    assert.equal(uploadedAudio.status, 200);
    assert.equal(digest(new Uint8Array(await uploadedAudio.arrayBuffer())), digest(audio));
    const oversize = await fetch(frontendUrl + "/api/teacher/upload", {
      method: "POST", headers: { Cookie: cookie, "Content-Type": "image/png", Origin: frontendUrl }, body: new Uint8Array(4 * 1024 * 1024 + 1),
    });
    assert.equal(oversize.status, 413);
    assert.match((await oversize.json()).error, /4 MB/);
    const adminPage = await fetch(frontendUrl + "/admin/truyen", { headers: { Cookie: cookie } });
    assert.equal(adminPage.status, 200);
    await adminPage.arrayBuffer();
    assert.doesNotMatch(output, /Wrangler must not be loaded|ERR_MODULE_NOT_FOUND|Missing DB\/MEDIA/);
    console.log("Production Next/Vercel opened six public pages, unchanged R2 media, admin login, guarded profile update and private image/audio upload with Wrangler blocked.");
  }
} finally {
  if (frontend && frontend.exitCode === null) {
    await new Promise(resolve => { frontend.once("exit", resolve); frontend.kill("SIGTERM"); });
  }
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await platform.dispose();
}
