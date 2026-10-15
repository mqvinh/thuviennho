import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { aiSettingsBrowser } from "./ai-settings-browser.mjs";

export async function aiSettingsSmoke({ env, frontendUrl, cookie }) {
  const settingsUrl = frontendUrl + "/api/teacher/settings";
  const headers = { Cookie: cookie, Origin: frontendUrl, "Content-Type": "application/json" };
  const get = () => fetch(settingsUrl, { headers: { Cookie: cookie } });
  const post = (body, overrides = {}) => fetch(settingsUrl, { method: "POST", headers: { ...headers, ...overrides }, body: JSON.stringify(body) });
  const ai = { api_url: "https://ai-provider.example/v1/", model: "test-configured-model", api_key: "test-private-ai-key" };
  const original = await (await get()).json();
  assert.equal(original.ai.has_key, false);
  assert.equal(original.ai.schema_ready, true);
  const initialRow = await env.DB.prepare("SELECT * FROM site_settings WHERE id=true").first();
  const teacherId = randomUUID(), token = randomBytes(32).toString("hex");
  await env.DB.prepare("INSERT INTO teacher_users(id,username,password_hash,role) VALUES(?1,?1,'unused','teacher')").bind(teacherId).run();
  await env.DB.prepare("INSERT INTO teacher_sessions(token_hash,user_id,expires_at) VALUES(?1,?2,'2099-01-01T00:00:00Z')").bind(createHash("sha256").update(token).digest("hex"), teacherId).run();
  const teacherCookie = "library_teacher=" + token;
  try {
    assert.equal((await fetch(settingsUrl)).status, 401);
    assert.equal((await post({ ...original, ai }, { Cookie: "" })).status, 401);
    assert.equal((await fetch(settingsUrl, { headers: { Cookie: teacherCookie } })).status, 403);
    assert.equal((await post({ ...original, ai }, { Cookie: teacherCookie })).status, 403);
    assert.equal((await post({ ...original, ai }, { Origin: "https://untrusted.example" })).status, 403);
    const saved = await post({ ...original, ai });
    assert.equal(saved.status, 200);
    assert.ok(!(await saved.text()).includes(ai.api_key), "Save must not echo the key.");
    const configuredResponse = await get();
    assert.equal(configuredResponse.headers.get("cache-control"), "no-store");
    const configured = await configuredResponse.json();
    assert.deepEqual(configured.ai, { api_url: "https://ai-provider.example/v1/responses", model: ai.model, has_key: true, schema_ready: true });
    assert.ok(!JSON.stringify(configured).includes(ai.api_key), "Admin read must not expose the key.");
    const publicHtml = await (await fetch(frontendUrl)).text();
    assert.ok(!publicHtml.includes(ai.api_key) && !publicHtml.includes("ai-provider.example"), "Public settings must not expose AI credentials or endpoint.");
    const storedKey = () => env.DB.prepare("SELECT ai_api_key FROM site_settings WHERE id=true").first("ai_api_key");
    await post({ ...original, ai: { ...ai, api_key: "", model: "changed-model" } });
    assert.equal(await storedKey(), ai.api_key, "Blank key keeps the stored secret.");
    for (const api_url of ["http://ai-provider.example/v1", "https://user:pass@ai-provider.example/v1", "https://ai-provider.example/v1?key=secret", "https://ai-provider.example/v1#fragment", "invalid"]) {
      assert.equal((await post({ ...original, site_name: "Must not change", ai: { ...ai, api_url } })).status, 400);
      assert.equal((await (await get()).json()).site_name, original.site_name);
    }
    assert.equal((await post({ ...original, ai: { ...ai, api_key: "invalid\r\nkey" } })).status, 400);
    assert.equal((await post({ ...original, ai: { ...ai, clear_key: "false" } })).status, 400);
    assert.equal((await post({ ...original, ai: { ...ai, clear_key: true } })).status, 400);
    assert.equal((await post({ ...original, ai: { ...ai, api_key: "test-private-ai-key-replaced" } })).status, 200);
    assert.equal(await storedKey(), "test-private-ai-key-replaced");
    assert.equal((await post({ ...original, ai })).status, 200);
    await aiSettingsBrowser({ frontendUrl, cookie });
    const slug = "ai-settings-test-" + randomUUID().slice(0, 8);
    const theme_slug = await env.DB.prepare("SELECT slug FROM reading_themes LIMIT 1").first("slug");
    const generate = (nextSlug) => fetch(frontendUrl + "/api/teacher/ai", { method: "POST", headers: { ...headers, Cookie: teacherCookie }, body: JSON.stringify({ topic: "Sharing", keywords: "help", lesson: "kindness", slug: nextSlug, theme_slug, noStudentData: true }) });
    const generated = await generate(slug);
    assert.equal(generated.status, 200, "Generation should use the configured provider/model/key.");
    assert.equal((await generated.json()).draft.slug, slug);
    assert.equal(await env.DB.prepare("SELECT owner_id FROM stories WHERE slug=?1").bind(slug).first("owner_id"), teacherId);
    assert.equal((await post({ ...original, ai: { ...ai, api_key: "", model: "test-provider-error" } })).status, 200);
    const failed = await generate(slug + "-error");
    assert.equal(failed.status, 502);
    assert.ok(!(await failed.text()).includes(ai.api_key), "Provider errors must not echo secrets.");
    assert.equal((await post({ ...original, ai: { ...ai, api_key: "", clear_key: true } })).status, 200);
    assert.equal(await storedKey(), "");
    assert.equal((await (await get()).json()).ai.has_key, false);
    assert.equal((await generate(slug + "-disabled")).status, 503);
    assert.equal((await post({ ...original, site_name: "Legacy settings client", ai: undefined })).status, 200);
    assert.equal(await storedKey(), "");
    await env.DB.prepare("DELETE FROM stories WHERE slug=?1").bind(slug).run();
    console.log("Admin AI configuration passed permissions, URL validation, private key keep/replace/clear, provider integration and sanitized errors.");
  } finally {
    await env.DB.prepare("UPDATE site_settings SET site_name=?1,ai_api_url=?2,ai_api_key=?3,ai_model=?4 WHERE id=true").bind(initialRow.site_name, initialRow.ai_api_url, initialRow.ai_api_key, initialRow.ai_model).run();
    await env.DB.prepare("DELETE FROM teacher_users WHERE id=?1").bind(teacherId).run();
    await env.DB.prepare("DELETE FROM login_attempts WHERE key=?1").bind("ai:" + teacherId).run();
  }
}
