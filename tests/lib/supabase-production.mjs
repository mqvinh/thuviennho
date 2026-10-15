import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { digest } from "../../scripts/lib/data-transfer.mjs";

export async function productionSmoke({ env, url, key, username, password, snapshot, manifest }) {
  const frontendUrl = "http://localhost:3106";
  const child = spawn(process.execPath, ["--experimental-loader", "./tests/deny-wrangler-loader.mjs", "node_modules/next/dist/bin/next", "start", "--hostname", "localhost", "--port", "3106"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production", VERCEL: "1", LITTLE_READERS_TEST: "1", SUPABASE_URL: url, SUPABASE_SECRET_KEY: key, SUPABASE_MEDIA_BUCKET: "little-readers-media", LITTLE_READERS_BACKEND_URL: "", LITTLE_READERS_BACKEND_TOKEN: "", OPENAI_API_KEY: "" },
  });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  try {
    let ready = false;
    for (let index = 0; index < 90; index++) {
      if (child.exitCode !== null) throw new Error(output.slice(-3000));
      try { const response = await fetch(frontendUrl, { signal: AbortSignal.timeout(3000) }); ready = response.status === 200; await response.arrayBuffer(); } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    assert.ok(ready, output.slice(-3000));
    const published = snapshot.tables.stories.rows.find(row => row.is_published && row.is_visible && row.cover_image_path?.startsWith("/media/"));
    for (const route of ["/", "/nghe-sach", "/tu-vung", "/thu-tai", "/truyen/" + published.slug, "/doc/" + published.slug]) {
      const response = await fetch(frontendUrl + route);
      assert.equal(response.status, 200, route);
      assert.match(await response.text(), /Thư Viện|Little Readers/i);
    }
    const cover = await fetch(frontendUrl + published.cover_image_path);
    assert.equal(cover.status, 200);
    assert.equal(digest(new Uint8Array(await cover.arrayBuffer())), manifest.media.find(file => "/media/" + file.key === published.cover_image_path).sha256);
    const login = await fetch(frontendUrl + "/api/teacher/login", { method: "POST", headers: { "Content-Type": "application/json", Origin: frontendUrl }, body: JSON.stringify({ username, password }) });
    assert.equal(login.status, 200, await login.text());
    const cookie = login.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    async function post(action, body, status = 200) {
      const response = await fetch(frontendUrl + "/api/teacher/" + action, { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json", Origin: frontendUrl }, body: JSON.stringify(body) });
      assert.equal(response.status, status, await response.text());
    }
    await post("accounts", { action: "profile", full_name: "Supabase remote test", email: "supabase-test@example.com" });
    assert.equal(await env.DB.prepare("SELECT full_name FROM teacher_users WHERE username=?1").bind(username).first("full_name"), "Supabase remote test");
    const png = await readFile("public/images/themes/book.png");
    const upload = await fetch(frontendUrl + "/api/teacher/upload", { method: "POST", headers: { Cookie: cookie, "Content-Type": "image/png", Origin: frontendUrl }, body: png });
    assert.equal(upload.status, 200);
    const imagePath = (await upload.json()).path;
    assert.equal((await fetch(frontendUrl + imagePath)).status, 404);
    const privateImage = await fetch(frontendUrl + imagePath, { headers: { Cookie: cookie } });
    assert.equal(privateImage.status, 200);
    assert.equal(digest(new Uint8Array(await privateImage.arrayBuffer())), digest(png));
    const audio = Buffer.from("ID3\u0004\u0000\u0000supabase-audio-test");
    const audioUpload = await fetch(frontendUrl + "/api/teacher/upload", { method: "POST", headers: { Cookie: cookie, "Content-Type": "audio/mp3", Origin: frontendUrl }, body: audio });
    assert.equal(audioUpload.status, 200);
    const audioPath = (await audioUpload.json()).path;
    const savedAudio = await fetch(frontendUrl + audioPath, { headers: { Cookie: cookie } });
    assert.equal(digest(new Uint8Array(await savedAudio.arrayBuffer())), digest(audio));
    const oversize = await fetch(frontendUrl + "/api/teacher/upload", { method: "POST", headers: { Cookie: cookie, "Content-Type": "image/png", Origin: frontendUrl }, body: new Uint8Array(4 * 1024 * 1024 + 1) });
    assert.equal(oversize.status, 413);

    const slug = "supabase-preservation-test";
    const draft = { slug, title_vi: "Truyện thử", title_en: "Test story", cover_image_path: imagePath, sentences: [{ text_vi: "Câu hai", text_en: "Second", audio_en_path: audioPath }, { text_vi: "Câu một", text_en: "First" }], vocabulary: [{ word_vi: "hai", word_en: "two" }, { word_vi: "một", word_en: "one" }], questions: [{ kind: "order", question_vi: "Thứ tự?", options: ["Hai", "Một"], correct_order: [1, 0] }] };
    await post("save", draft);
    const stored = await env.DB.prepare("SELECT id FROM stories WHERE slug=?1").bind(slug).first();
    assert.equal(await env.DB.prepare("SELECT text_vi FROM story_sentences WHERE story_id=?1 AND sequence_no=1").bind(stored.id).first("text_vi"), "Câu hai");
    assert.equal(await env.DB.prepare("SELECT word_en FROM vocabulary WHERE story_id=?1 AND sequence_no=1").bind(stored.id).first("word_en"), "two");
    await post("status", { slug, status: "published", reviewed: true, expected_status: "draft" });
    const publishedPage = await fetch(frontendUrl + "/doc/" + slug);
    assert.equal(publishedPage.status, 200);
    assert.match(await publishedPage.text(), /Truyện thử/);
    assert.equal((await fetch(frontendUrl + imagePath)).status, 200);
    await post("visibility", { slug, is_visible: false });
    assert.equal(await env.DB.prepare("SELECT is_visible FROM stories WHERE id=?1").bind(stored.id).first("is_visible"), false);
    // A streamed Next.js notFound response keeps HTTP 200 after the shell.
    // Verify that the story is withheld and the not-found UI is rendered.
    const hiddenPage = await fetch(frontendUrl + "/doc/" + slug);
    const hiddenText = await hiddenPage.text();
    assert.ok([200, 404].includes(hiddenPage.status));
    assert.match(hiddenText, /name="robots" content="noindex"/);
    assert.doesNotMatch(hiddenText, /Truyện thử/);
    await post("status", { slug, status: "draft", expected_status: "draft" }, 409);
    await post("delete", { slug });
    assert.equal(await env.DB.prepare("SELECT 1 FROM story_sentences WHERE story_id=?1").bind(stored.id).first(), null);
    assert.equal(await env.DB.prepare("SELECT 1 FROM reading_answers a JOIN reading_questions q ON q.id=a.question_id WHERE q.story_id=?1").bind(stored.id).first(), null);
    const admin = await fetch(frontendUrl + "/admin/truyen", { headers: { Cookie: cookie } });
    assert.equal(admin.status, 200); await admin.arrayBuffer();
    assert.doesNotMatch(output, /Wrangler must not be loaded|ERR_MODULE_NOT_FOUND|Missing DB\/MEDIA/);
    console.log("Production Next/Vercel passed public pages, original media, legacy-password login, private image/audio upload, ordered story save, publication/visibility and cascade delete, with Wrangler blocked.");
  } finally {
    if (child.exitCode === null) await new Promise(resolve => { child.once("exit", resolve); child.kill("SIGTERM"); });
  }
}
