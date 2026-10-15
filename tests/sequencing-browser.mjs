import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes, createHash } from "node:crypto";
import { chromium, expect as baseExpect } from "@playwright/test";
import { createSupabaseBindings } from "../scripts/lib/supabase-client.mjs";
const expect = baseExpect.configure({ timeout: 25000 });
const args = process.argv.slice(2), origin = new URL(args[0]).origin;
const { DB } = createSupabaseBindings({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, bucket: process.env.SUPABASE_MEDIA_BUCKET });
const stories = (await DB.prepare("SELECT slug,title_vi,sequence_cards FROM stories WHERE is_published=true AND is_visible=true ORDER BY slug").all()).results.filter(s => s.sequence_cards?.length >= 4);
assert.ok(stories.length >= 3);
const storageKey = "little-readers-device-v1", directory = ".data/project-check/sequencing";
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
await mkdir(directory, { recursive: true });
let bypass;
if (args.includes("--protection-config")) {
  const raw = await readFile(args[args.indexOf("--protection-config") + 1]);
  const project = JSON.parse(raw.toString(raw[0] === 255 ? "utf16le" : "utf8").replace(/^\uFEFF/, ""));
  bypass = Object.keys(project.protectionBypass || {})[0]; assert.ok(bypass);
}
let server, browser, sessionHash, testSlug;
const processes = [], checks = [];
try {
  const pictures = [...new Set(stories.flatMap(story => story.sequence_cards.map(card => card.image_path)))];
  await Promise.all(pictures.map(async path => {
    const response = await fetch(origin + path, { headers: bypass ? { "x-vercel-protection-bypass": bypass } : {}, redirect: "error" });
    assert.equal(response.status, 200, `Published scene must be public: ${path}`);
    assert.equal(response.headers.get("content-type"), "image/png");
    assert.ok((await response.arrayBuffer()).byteLength > 100);
  }));
  checks.push({ publicPictures: pictures.length });
  server = await chromium.launchServer({ headless: true });
  const child = server.process();
  processes.push({ pid: child.pid, parentPid: process.pid, createdAt: new Date().toISOString(), port: Number(new URL(server.wsEndpoint()).port), profile: child.spawnargs.find(arg => arg.startsWith("--user-data-dir="))?.slice(16) });
  await writeFile(".data/sequencing-owned-processes.json", JSON.stringify({ processes, status: "running" }, null, 2));
  console.log(JSON.stringify({ processes }));
  browser = await chromium.connect(server.wsEndpoint());
  for (const mobile of args.includes("--admin-only") ? [] : [false, true]) {
    const context = await browser.newContext({ baseURL: origin, viewport: mobile ? { width: 320, height: 740 } : { width: 1280, height: 1000 }, isMobile: mobile, hasTouch: mobile, acceptDownloads: true, reducedMotion: mobile ? "reduce" : "no-preference" });
    if (bypass) await context.route(origin + "/**", route => route.continue({ headers: { ...route.request().headers(), "x-vercel-protection-bypass": bypass } }));
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const activate = locator => mobile ? locator.tap() : locator.click();
    const story = stories[0], seed = { version: 1, favorites: [], started: { [story.slug]: { title: story.title_vi, date: "2026-10-14T01:00:00.000Z" } }, finished: {}, activities: {}, journal: [], flashcards: {}, matching: {} };
    const chip = id => page.locator(".sequence-card").filter({ has: page.locator(`img[src$="${story.sequence_cards.find(c => c.id === id).image_path}"]`) }).locator(".sequence-card-select");
    const slot = index => page.locator(".sequence-slot-target").nth(index);
    const fill = async (order, drag = false) => {
      for (const [i, card] of order.entries()) {
        if (drag && i === 0) {
          // Start the native gesture before scrolling to an offscreen target.
          // dragTo scrolls both endpoints before pressing and can miss the source.
          const source = chip(card.id), target = page.locator(".sequence-slot").nth(i);
          await source.scrollIntoViewIfNeeded(); const from = await source.boundingBox();
          await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
          await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 12, { steps: 6 });
          await target.scrollIntoViewIfNeeded(); const to = await target.boundingBox();
          await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
          await page.mouse.move(to.x + to.width / 2 + 1, to.y + to.height / 2 + 1); await page.mouse.up();
        }
        else { await activate(chip(card.id)); if (!mobile && i === 1) { await slot(i).focus(); await page.keyboard.press("Enter"); } else await activate(slot(i)); }
        await expect(page.locator(".sequence-slot .sequence-card")).toHaveCount(i + 1);
      }
    };
    try {
      await page.goto("/tro-choi"); await expect(page.locator(".game-card")).toHaveCount(3);
      await page.evaluate(({ key, seed }) => localStorage.setItem(key, JSON.stringify(seed)), { key: storageKey, seed });
      await page.locator('.game-card-link[href="/tro-choi/xep-tranh-ke-chuyen"]').click();
      const scope = page.getByRole("combobox", { name: "Bộ truyện", exact: true });
      await expect(scope).toBeEnabled(); await scope.selectOption("read");
      await expect(page.locator(".sequence-story")).toHaveCount(1);
      await expect(page.locator(".sequence-story h3")).toHaveText(story.title_vi);
      await page.locator(".sequence-story .button").click();
      await expect(page.locator(".sequence-slot")).toHaveCount(4);
      await expect(page.getByRole("button", { name: "Kiểm tra câu chuyện", exact: true })).toBeDisabled();
      await expect.poll(() => page.locator(".sequence-bank img").evaluateAll(images => images.length === 4 && images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
      const initial = await page.locator(".sequence-bank img").evaluateAll(images => images.map(image => new URL(image.src).pathname));
      assert.notDeepEqual(initial, story.sequence_cards.map(card => card.image_path));
      await page.evaluate(() => {
        window.__sequenceSpeech = [];
        Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { getVoices: () => [], speak: utterance => window.__sequenceSpeech.push({ text: utterance.text, lang: utterance.lang }), cancel: () => {} } });
      });
      await page.locator(".sequence-bank .sequence-audio").first().click();
      assert.equal(await page.evaluate(() => window.__sequenceSpeech[0].lang), "vi-VN");
      await activate(chip(story.sequence_cards[0].id)); await page.keyboard.press("Escape");
      await expect(page.locator(".sequence-card.is-selected")).toHaveCount(0);
      await page.locator(".sequence-slot").first().evaluate(element => { const transfer = new DataTransfer(); transfer.setData("text/plain", "outside"); element.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer })); });
      await expect(page.locator(".sequence-empty-slot")).toHaveCount(4);
      const wrong = [story.sequence_cards[1], story.sequence_cards[0], ...story.sequence_cards.slice(2)];
      await fill(wrong, !mobile);
      await page.getByRole("button", { name: "Kiểm tra câu chuyện", exact: true }).click();
      await expect(page.locator(".sequence-slot.is-correct")).toHaveCount(2);
      await expect(slot(2)).toBeDisabled();
      await expect(page.locator(".sequence-slot.is-correct .sequence-card-select").first()).toBeDisabled();
      await page.getByRole("button", { name: "Gợi ý", exact: true }).click();
      await expect(page.locator(".sequence-hint")).toContainText(story.sequence_cards[0].hint_vi);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.locator(".sequence-play").screenshot({ path: `${directory}/board-${mobile ? "mobile" : "desktop"}.png` });
      await activate(chip(story.sequence_cards[0].id)); await activate(slot(0));
      // Swapping the two wrong cards fixes both positions without duplicating a card.
      await page.getByRole("button", { name: "Kiểm tra câu chuyện", exact: true }).dblclick();
      await expect(page.locator(".sequence-results")).toBeVisible();
      await expect(page.getByRole("img", { name: "2 trên 3 sao", exact: true })).toBeVisible();
      const completed = await stored(page);
      assert.equal(completed.sequencing[story.slug].plays, 1);
      assert.equal(completed.sequencing[story.slug].lastAttempts, 2);
      assert.equal(completed.sequencing[story.slug].lastHints, 1);
      assert.deepEqual(completed.flashcards, seed.flashcards); assert.deepEqual(completed.matching, seed.matching);
      await page.getByRole("button", { name: "Xem lại diễn biến", exact: true }).click();
      assert.deepEqual(await stored(page), completed);
      if (mobile) assert.equal(await page.locator(".sequence-reveal").first().evaluate(element => getComputedStyle(element).animationName), "none");
      await expect.poll(() => page.locator(".sequence-timeline .game-image").evaluateAll(images => images.every(image => image.dataset.state === "loaded"))).toBe(true);
      await page.locator(".sequence-results").screenshot({ path: `${directory}/result-${mobile ? "mobile" : "desktop"}.png` });
      await page.getByRole("button", { name: "Chơi lại", exact: true }).click(); await fill(story.sequence_cards);
      await page.getByRole("button", { name: "Kiểm tra câu chuyện", exact: true }).click();
      const improved = await stored(page); assert.equal(improved.sequencing[story.slug].bestStars, 3); assert.equal(improved.sequencing[story.slug].plays, 2);
      await page.reload(); assert.deepEqual(await stored(page), improved);
      await page.goto("/hanh-trinh");
      const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Tải bản sao nhật ký và tiến độ", exact: true }).click();
      const stream = await (await download).createReadStream(), chunks = []; for await (const chunk of stream) chunks.push(chunk);
      const bytes = Buffer.concat(chunks), backup = JSON.parse(bytes.toString()); assert.deepEqual(backup.sequencing, improved.sequencing);
      await page.evaluate(key => localStorage.removeItem(key), storageKey); await page.reload();
      const input = page.getByLabel("Chọn bản sao nhật ký", { exact: true }); await expect(input).toBeEnabled();
      await input.setInputFiles({ name: "sequence-backup.json", mimeType: "application/json", buffer: bytes });
      await expect(page.locator(".journey-backup-preview")).toContainText("truyện có kết quả xếp tranh");
      await page.getByRole("button", { name: "Khôi phục bản sao", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Tiếp tục", exact: true }).click();
      await expect(page.getByText("Đã khôi phục bản sao trên thiết bị.", { exact: true })).toBeVisible(); assert.deepEqual(await stored(page), backup);
      await page.goto("/tro-choi/xep-tranh-ke-chuyen");
      await scope.selectOption("read"); await page.locator(".sequence-story .button").click();
      await page.getByRole("button", { name: "Gợi ý", exact: true }).click(); await page.getByRole("button", { name: "Xếp lại từ đầu", exact: true }).click();
      await expect(page.locator(".matching-progress")).toContainText("1 gợi ý");
      await expect(page.getByRole("button", { name: "Kiểm tra câu chuyện", exact: true })).toBeDisabled();
      if (!mobile) {
        await fill(story.sequence_cards); const before = await stored(page);
        await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException("Full", "QuotaExceededError"); }; });
        await page.getByRole("button", { name: "Kiểm tra câu chuyện", exact: true }).click();
        await expect(page.locator(".flashcard-saved")).toHaveCount(0); await expect(page.locator(".flashcard-message")).toContainText("Kết quả chưa lưu được");
        assert.deepEqual(await stored(page), before);
      }
      assert.deepEqual(errors, []);
      checks.push({ mobile, tap: true, drag: !mobile, keyboard: !mobile, hints: true, stars: true, locks: true, backupRestore: true, replayNoDuplicate: true, vietnameseSpeechControl: true });
      console.log(JSON.stringify(checks.at(-1)));
    } catch (error) { await page.screenshot({ path: `${directory}/failure-${mobile ? "mobile" : "desktop"}.png`, fullPage: true }).catch(() => {}); throw error; }
    finally { await context.close(); }
  }
  // Use a short-lived session and a private draft; no regular account credentials
  // are read and none of the existing published stories are edited by this QA.
  const admin = await DB.prepare("SELECT id FROM teacher_users WHERE role='admin' AND is_active=true ORDER BY id LIMIT 1").first();
  const token = randomBytes(32).toString("hex"); sessionHash = createHash("sha256").update(token).digest("hex");
  await DB.prepare("INSERT INTO teacher_sessions(token_hash,user_id,expires_at) VALUES(?1,?2,?3)").bind(sessionHash, admin.id, new Date(Date.now() + 15 * 60000).toISOString()).run();
  const context = await browser.newContext({ baseURL: origin });
  if (bypass) await context.route(origin + "/**", route => route.continue({ headers: { ...route.request().headers(), "x-vercel-protection-bypass": bypass } }));
  const apiHeaders = bypass ? { "x-vercel-protection-bypass": bypass } : {};
  const contentFor = slug => context.request.get(`/api/teacher/content?slug=${slug}`, { headers: apiHeaders });
  const adminPage = await context.newPage();
  try {
    await context.addCookies([{ name: "library_teacher", value: token, domain: new URL(origin).hostname, path: "/", httpOnly: true, secure: true, sameSite: "Strict" }]);
    const content = await (await contentFor(stories[0].slug)).json();
    testSlug = "sequence-qa-" + Date.now();
    const draft = { ...content, slug: testSlug, title_vi: "Bộ tranh kiểm thử riêng", sequence_cards: [...content.sequence_cards, ...stories[1].sequence_cards.slice(0, 2)] };
    const post = body => context.request.post("/api/teacher/save", { headers: { ...apiHeaders, Origin: origin }, data: body });
    assert.equal((await post(draft)).status(), 200);
    assert.equal((await post({ ...draft, sequence_cards: [{ ...draft.sequence_cards[0], image_path: "/media/00000000-0000-4000-a000-999999999999.png" }] })).status(), 403);
    assert.equal((await post({ ...draft, sequence_cards: [{ ...draft.sequence_cards[0], audio_path: "/media/a.png" }] })).status(), 400);
    const { sequence_cards: unused, ...oldClient } = draft; void unused;
    assert.equal((await post(oldClient)).status(), 200);
    const retained = await (await contentFor(testSlug)).json(); assert.deepEqual(retained.sequence_cards, draft.sequence_cards);
    const page = adminPage; await page.goto(`/admin/bien-tap?slug=${testSlug}`);
    const items = page.locator('[data-item-group="sequence_cards"]'); await expect(items).toHaveCount(6);
    await expect(page.getByRole("button", { name: "Thêm thẻ tranh", exact: true })).toBeDisabled();
    const toggle = items.first().locator(".editor-item-toggle");
    if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await items.first().getByRole("textbox", { name: /^Gợi ý về diễn biến/ }).fill("Gợi ý được biên tập lại.");
    await items.first().locator(".drag-handle").focus(); await page.keyboard.press("ArrowDown");
    await items.last().getByRole("button", { name: /^Xóa / }).click(); await expect(items).toHaveCount(5);
    await page.setViewportSize({ width: 390, height: 844 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await items.nth(1).screenshot({ path: `${directory}/editor-mobile.png` });
    await page.getByRole("button", { name: "Lưu bản nháp", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Đã lưu bản nháp thành công");
    const saved = await (await contentFor(testSlug)).json();
    assert.equal(saved.sequence_cards.length, 5); assert.equal(saved.sequence_cards[1].id, draft.sequence_cards[0].id); assert.equal(saved.sequence_cards[1].hint_vi, "Gợi ý được biên tập lại.");
    checks.push({ admin: true, sixCards: true, reorderSave: true, omittedFieldPreserved: true, mediaOwnership: true, mediaTypeValidation: true });
    console.log(JSON.stringify(checks.at(-1)));
  } catch (error) { await adminPage.screenshot({ path: `${directory}/failure-admin.png`, fullPage: true }).catch(() => {}); throw error; }
  finally { await context.close(); }
  await writeFile(".data/sequencing-browser-check.json", JSON.stringify({ origin, checkedAt: new Date().toISOString(), checks }, null, 2));
} finally {
  try { await browser?.close(); }
  finally {
    await server?.close();
    try {
      if (testSlug) await DB.prepare("DELETE FROM stories WHERE slug=?1 AND title_vi=?2").bind(testSlug, "Bộ tranh kiểm thử riêng").run();
      if (sessionHash) await DB.prepare("DELETE FROM teacher_sessions WHERE token_hash=?1").bind(sessionHash).run();
    } finally {
      const browserClosed = !server || server.process().exitCode !== null;
      await writeFile(".data/sequencing-owned-processes.json", JSON.stringify({ processes, status: "finished", browserClosed }, null, 2));
      console.log(JSON.stringify({ browserClosed }));
    }
  }
}
