import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, expect as baseExpect } from "@playwright/test";

const expect = baseExpect.configure({ timeout: 25000 });
const args = process.argv.slice(2), origin = new URL(args[0]).origin;
const directory = ".data/project-check/discovery", processes = [], reports = [], errors = [];
const key = "little-readers-device-v1";
const empty = () => ({ version: 1, favorites: [], started: {}, finished: {}, activities: {}, journal: [], flashcards: {}, matching: {}, sequencing: {} });
const today = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
let bypass, server, browser;
if (args.includes("--protection-config")) {
  const project = JSON.parse(await readFile(args[args.indexOf("--protection-config") + 1], "utf8"));
  bypass = Object.keys(project.protectionBypass || {})[0]; assert.ok(bypass);
}
await mkdir(directory, { recursive: true });
try {
  server = await chromium.launchServer({ headless: true });
  const child = server.process();
  processes.push({ pid: child.pid, parentPid: process.pid, createdAt: new Date().toISOString(), port: Number(new URL(server.wsEndpoint()).port), profile: child.spawnargs.find(arg => arg.startsWith("--user-data-dir="))?.slice(16) });
  await writeFile(".data/discovery-owned-processes.json", JSON.stringify({ status: "running", processes }, null, 2));
  console.log(JSON.stringify({ processes }));
  browser = await chromium.connect(server.wsEndpoint());
  let earned;
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ baseURL: origin, viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion: "reduce", acceptDownloads: true });
    if (bypass) await context.route(origin + "/**", route => route.continue({ headers: { ...route.request().headers(), "x-vercel-protection-bypass": bypass } }));
    const page = await context.newPage();
    page.setDefaultTimeout(25000); page.setDefaultNavigationTimeout(90000);
    page.on("pageerror", error => errors.push(error.message));
    const activate = locator => mobile ? locator.tap() : locator.click();
    const progress = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    const updateProgress = value => page.evaluate(({ key, value }) => { localStorage.setItem(key, JSON.stringify(value)); dispatchEvent(new Event("library-device-change")); }, { key, value });
    const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Horizontal overflow");
    try {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "Hôm nay, mình khám phá gì?", exact: true })).toBeVisible();
      await expect(page.locator(".daily-learning")).toHaveAttribute("aria-busy", "false");
      await expect(page.locator(".daily-task")).toHaveCount(3);
      await expect(page.locator(".discovery-stories .story-card")).toHaveCount(4);
      let data = await progress(), plan = data.daily[today()];
      assert.ok(plan); assert.equal(plan.wordKeys.length, 3); assert.equal(plan.questionIds.length, 3);
      await page.reload(); await expect(page.locator(".daily-task")).toHaveCount(3);
      assert.deepEqual((await progress()).daily[today()], plan);
      if (!mobile) {
        await expect(page.locator(".navigation > a").first()).toHaveAttribute("href", "/");
        await expect(page.locator(".navigation > a").first()).toHaveAttribute("aria-current", "page");
        await page.screenshot({ path: `${directory}/home-desktop.png`, fullPage: true });
        // The change control appears when the library has more than one eligible story.
        const canChoose = await page.locator(".daily-story-picker summary").count();
        if (canChoose) {
          await page.locator(".daily-story-picker summary").click();
          const select = page.locator(".daily-story-picker select");
          const alternative = await select.locator("option").evaluateAll((items, slug) => items.find(item => item.value !== slug)?.value, plan.storySlug);
          assert.ok(alternative);
          await select.selectOption(alternative);
          await page.locator(".daily-story-picker").getByRole("button", { name: "Đổi truyện", exact: true }).click();
          await expect(page.locator('[data-task="read"] a')).toHaveAttribute("href", `/doc/${alternative}`);
          plan = (await progress()).daily[today()];
          assert.equal(plan.storySlug, alternative);
        }
        await page.locator('[data-task="read"] a').click();
        await expect(page.locator('a[href="/tu-sach"]').first()).toBeVisible();
        await page.getByRole("button", { name: "Ghi nhận bắt đầu đọc", exact: true }).click();
        await page.getByRole("button", { name: "Em đã đọc xong", exact: true }).click();
        await expect(page.getByRole("link", { name: /Đã xong nhiệm vụ đọc/ })).toBeVisible();
        await page.getByRole("link", { name: /Đã xong nhiệm vụ đọc/ }).click();
        await expect(page.locator(".daily-task.is-complete")).toHaveCount(1);
        // Switching part way through must require an explicit confirmation.
        if (canChoose) {
          await page.locator(".daily-story-picker summary").click();
          await page.locator(".daily-story-picker select").selectOption(data.daily[today()].storySlug);
          await page.locator(".daily-story-picker").getByRole("button", { name: "Đổi truyện", exact: true }).click();
          await expect(page.locator(".app-modal")).toContainText("Lịch ôn từ và tiến độ đọc trước đây vẫn được giữ");
          await page.locator(".app-modal").getByRole("button", { name: "Hủy", exact: true }).click();
          assert.equal((await progress()).daily[today()].storySlug, plan.storySlug);
        }
        await page.locator('[data-task="words"] button').click();
        for (let i = 0; i < 3; i++) {
          await expect(page.locator(".daily-word-card .game-image")).toHaveAttribute("data-state", "loaded");
          await expect(page.getByRole("button", { name: "Đã nhớ", exact: true })).toBeDisabled();
          await page.locator(".daily-word-card").click();
          await page.getByRole("button", { name: i === 0 ? "Cần ôn thêm" : "Đã nhớ", exact: true }).click();
        }
        await expect(page.locator(".daily-task.is-complete")).toHaveCount(2);
        assert.equal(Object.keys((await progress()).flashcards).length, 3);
        await page.reload(); await expect(page.locator(".daily-task.is-complete")).toHaveCount(2);
        await page.locator('[data-task="quiz"] button').click();
        await expect(page.locator(".quiz-question")).toHaveCount(3);
        const payload = [];
        for (const fieldset of await page.locator(".quiz-question").all()) {
          const radios = fieldset.locator('input[type="radio"]');
          if (await radios.count()) { await radios.first().check(); payload.push({ id: await radios.first().getAttribute("name"), value: 0 }); }
          else { const buttons = fieldset.locator(".quiz-order-list button"); assert.ok(await buttons.count()); }
        }
        await page.getByRole("button", { name: "Kiểm tra bài làm", exact: true }).click();
        await expect(page.locator(".quiz-result")).toHaveCount(3);
        await expect(page.locator(".daily-task.is-complete")).toHaveCount(3);
        await expect(page.locator(".daily-congratulations")).toBeVisible();
        earned = await progress(); assert.ok(earned.daily[today()].awardedAt);
        assert.equal(Object.keys(earned.activities).length, 0, "3 daily questions must not mark the complete story quiz done");
        await page.getByRole("button", { name: "Làm lại", exact: true }).click();
        for (const fieldset of await page.locator(".quiz-question").all()) { const radio = fieldset.locator('input[type="radio"]'); if (await radio.count()) await radio.first().check(); }
        await page.getByRole("button", { name: "Kiểm tra bài làm", exact: true }).click();
        await expect(page.locator(".quiz-result")).toHaveCount(3);
        assert.deepEqual((await progress()).daily, earned.daily);
        // Exercise server validation, including unknown/duplicate/missing IDs.
        if (payload.length === 3) {
          const post = body => page.evaluate(async body => { const response = await fetch("/api/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { status: response.status, body: await response.json() }; }, body);
          assert.equal((await post({ slug: plan.storySlug, daily: true, answers: payload.slice(0, 2) })).status, 400);
          assert.equal((await post({ slug: plan.storySlug, daily: true, answers: [payload[0], payload[0], payload[2]] })).status, 400);
          assert.equal((await post({ slug: plan.storySlug, daily: true, answers: [{ ...payload[0], id: "unknown" }, ...payload.slice(1)] })).status, 400);
          assert.equal((await post({ slug: plan.storySlug, daily: true, answers: payload.map(x => ({ ...x, value: -1 })) })).status, 400);
          assert.equal((await post({ slug: plan.storySlug, daily: true, answers: payload })).status, 200);
        }
        await page.screenshot({ path: `${directory}/earned-desktop.png`, fullPage: true });
        await page.goto("/hanh-trinh#sao-hoc-tap");
        await expect(page.locator(".learning-star-total")).toHaveText("1");
        const downloadPromise = page.waitForEvent("download");
        await page.getByRole("button", { name: "Tải bản sao nhật ký và tiến độ", exact: true }).click();
        await (await downloadPromise).saveAs(`${directory}/backup-test.json`);
        assert.deepEqual(JSON.parse(await readFile(`${directory}/backup-test.json`, "utf8")), earned);
        await updateProgress(empty());
        await page.locator("#journey-backup").setInputFiles({ name: "discovery-test.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(earned)) });
        await expect(page.locator(".journey-backup-preview")).toContainText("1 sao học tập");
        await page.getByRole("button", { name: "Khôi phục bản sao", exact: true }).click();
        await page.locator(".app-modal").getByRole("button", { name: "Tiếp tục", exact: true }).click();
        await expect(page.locator(".learning-star-total")).toHaveText("1");
        assert.deepEqual(await progress(), earned);
        // Normal full-story quiz retains its activity completion behavior.
        await page.goto(`/doc/${plan.storySlug}`);
        await page.getByRole("button", { name: "Đã đọc xong 🌟", exact: true }).click();
        assert.deepEqual((await progress()).daily, earned.daily);
        await expect(page.locator(".quiz-question").first()).toBeVisible();
        for (const fieldset of await page.locator(".quiz-question").all()) { const radio = fieldset.locator('input[type="radio"]'); if (await radio.count()) await radio.first().check(); }
        await page.getByRole("button", { name: "Kiểm tra bài làm", exact: true }).click();
        await expect(page.locator(".quiz-result").first()).toBeVisible();
        assert.ok((await progress()).activities[plan.storySlug]);
        assert.deepEqual((await progress()).daily, earned.daily);
        const fromFullQuiz = structuredClone(earned); delete fromFullQuiz.daily[today()].awardedAt; fromFullQuiz.daily[today()].answeredQuestions = [];
        await updateProgress(fromFullQuiz);
        await page.getByRole("button", { name: "Làm lại", exact: true }).click();
        for (const fieldset of await page.locator(".quiz-question").all()) { const radio = fieldset.locator('input[type="radio"]'); if (await radio.count()) await radio.first().check(); }
        await page.getByRole("button", { name: "Kiểm tra bài làm", exact: true }).click();
        await expect(page.locator(".quiz-result").first()).toBeVisible();
        assert.ok((await progress()).daily[today()].awardedAt, "Normal full-story practice must also count toward today's quiz task");
        await page.goto("/tu-sach");
        await expect(page.locator(".bookshelf .story-card")).toHaveCount(8);
        await expect(page.locator('.navigation > a[aria-current="page"]')).toHaveAttribute("href", "/tu-sach");
        const themeHref = await page.locator('.site-footer a[href^="/tu-sach?chu-de="]').first().getAttribute("href");
        assert.ok(themeHref);
        await page.goto(themeHref.replace("/tu-sach", "/"));
        await expect(page).toHaveURL(/\/tu-sach\?chu-de=/);
        await page.goto("/");
        const partial = structuredClone(earned); delete partial.daily;
        partial.started["tho-con-biet-se-chia"] = { title: "Truyện đọc dở", date: new Date().toISOString() }; delete partial.finished["tho-con-biet-se-chia"];
        await updateProgress(partial);
        await expect(page.locator(".discovery-continue")).toBeVisible();
        for (const width of [761, 900, 1101, 1280, 1600]) {
          await page.setViewportSize({ width, height: 1000 }); await noOverflow();
          await expect(page.locator(".navigation > a").first()).toHaveAttribute("href", "/");
        }
        reports.push({ mobile, stablePlan: true, reading: true, wordReview: true, quiz: true, singleStar: true, backupRoundTrip: true, legacyRoutes: true });
      } else {
        await updateProgress(earned);
        await expect(page.locator(".mobile-nav-tab")).toHaveCount(5);
        const tab = page.locator(".mobile-discovery-tab");
        await expect(tab).toHaveAttribute("aria-current", "page");
        await expect(tab).toHaveAttribute("aria-label", /3\/3 nhiệm vụ hôm nay, đã nhận một sao/);
        const box = await tab.locator(".mobile-nav-symbol").boundingBox(); assert.ok(box.width >= 56 && box.width <= 60);
        await expect(tab.locator(".mobile-daily-star")).toBeVisible();
        await page.screenshot({ path: `${directory}/home-mobile.png`, fullPage: true });
        await activate(page.getByRole("button", { name: "Thêm", exact: true }));
        for (const name of ["Nhật ký đọc sách", "Khu trò chơi", "Hành trình đọc sách", "Hỗ trợ"]) await expect(page.locator(".mobile-more-sheet").getByRole("link", { name: new RegExp(name) })).toBeVisible();
        await page.locator(".mobile-more-sheet").screenshot({ path: `${directory}/more-mobile.png` });
        await activate(page.getByRole("button", { name: "Đóng menu", exact: true }));
        for (const width of [320, 360, 390, 600, 760]) { await page.setViewportSize({ width, height: 844 }); await noOverflow(); const box = await tab.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= width); }
        await page.setViewportSize({ width: 320, height: 740 });
        await page.screenshot({ path: `${directory}/home-320.png`, fullPage: true });
        reports.push({ mobile, centralCompass: true, progressRing: true, moreMenu: true, noOverflow: true });
      }
      console.log(JSON.stringify(reports.at(-1)));
    } catch (error) { await page.screenshot({ path: `${directory}/failure-${mobile ? "mobile" : "desktop"}.png`, fullPage: true }).catch(() => {}); throw error; }
    finally { await context.close(); }
  }
  // Changing the Vietnamese date while a page is open must offer a fresh day.
  for (const scenario of ["midnight", "blocked-storage"]) {
    const context = await browser.newContext({ baseURL: origin, viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    if (bypass) await context.route(origin + "/**", route => route.continue({ headers: { ...route.request().headers(), "x-vercel-protection-bypass": bypass } }));
    const page = await context.newPage(); page.setDefaultNavigationTimeout(90000);
    page.on("pageerror", error => errors.push(error.message));
    try {
      if (scenario === "midnight") {
        await page.clock.install({ time: new Date("2026-10-16T16:59:50.000Z") });
        await page.goto("/");
        await expect(page.locator(".daily-task")).toHaveCount(3);
        await expect.poll(() => page.evaluate(key => Object.keys(JSON.parse(localStorage.getItem(key)).daily), key)).toEqual(["2026-10-16"]);
        await page.clock.fastForward(35000);
        await expect.poll(() => page.evaluate(key => Object.keys(JSON.parse(localStorage.getItem(key)).daily).sort(), key)).toEqual(["2026-10-16", "2026-10-17"]);
        await expect(page.locator(".daily-date")).toHaveText("17 tháng 10");
      } else {
        await context.addInitScript(() => { Storage.prototype.getItem = () => { throw new DOMException("Storage unavailable", "SecurityError"); }; });
        await page.goto("/");
        await expect(page.locator(".daily-notice")).toContainText("Chưa đọc được bộ nhớ thiết bị");
        await expect(page.locator(".daily-task")).toHaveCount(0);
        await expect(page.locator(".discovery-stories .story-card")).toHaveCount(4);
      }
      reports.push({ scenario, passed: true }); console.log(JSON.stringify(reports.at(-1)));
    } finally { await context.close(); }
  }
  assert.deepEqual(errors, []);
  await writeFile(".data/discovery-check.json", JSON.stringify({ origin, checkedAt: new Date().toISOString(), reports, noPageErrors: true }, null, 2));
} finally {
  try { await browser?.close(); } finally {
    await server?.close();
    const browserClosed = !server || server.process().exitCode !== null;
    await writeFile(".data/discovery-owned-processes.json", JSON.stringify({ status: "finished", processes, browserClosed }, null, 2));
    console.log(JSON.stringify({ browserClosed }));
  }
}
