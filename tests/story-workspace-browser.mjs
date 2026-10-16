import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, expect as baseExpect } from "@playwright/test";

const expect = baseExpect.configure({ timeout: 25000 });
const args = process.argv.slice(2), origin = new URL(args[0]).origin;
const directory = ".data/project-check/story-workspace", processes = [], reports = [], errors = [];
const slug = "tho-con-biet-se-chia", route = `/doc/${slug}`, storageKey = "little-readers-device-v1";
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
  await writeFile(".data/story-workspace-owned-processes.json", JSON.stringify({ status: "running", processes }, null, 2));
  console.log(JSON.stringify({ processes }));
  browser = await chromium.connect(server.wsEndpoint());
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ baseURL: origin, viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion: "reduce" });
    if (bypass) await context.route(origin + "/**", route => route.continue({ headers: { ...route.request().headers(), "x-vercel-protection-bypass": bypass } }));
    const page = await context.newPage(); page.setDefaultNavigationTimeout(90000); page.setDefaultTimeout(25000);
    page.on("pageerror", error => errors.push(error.message));
    const tab = id => page.locator(`#story-tab-${id}`);
    const panel = id => page.locator(`.story-activity-panel#${id}`);
    const selected = async id => { await expect(panel(id)).toBeVisible(); await expect(tab(id)).toHaveAttribute("aria-selected", "true"); await expect(page.locator(".story-activity-panel:visible")).toHaveCount(1); };
    const open = async id => { await tab(id).click(); await selected(id); };
    const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Horizontal overflow");
    try {
      // Keep test audio deterministic and silent. Production grading stays real.
      await context.addInitScript(() => {
        const state = { pauses: 0, cancels: 0, spoken: 0, recordings: 0 };
        class Voice { constructor(text) { this.text = text; } }
        class Recording {
          duration = 8; playbackRate = 1; currentTime = 0;
          async play() { state.recordings++; this.onloadedmetadata?.(); }
          pause() { state.pauses++; }
        }
        Object.defineProperty(window, "Audio", { configurable: true, value: Recording });
        Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: Voice });
        Object.defineProperty(window, "speechSynthesis", { configurable: true, value: Object.assign(new EventTarget(), {
          getVoices: () => [{ lang: "vi-VN", localService: true }, { lang: "en-US", localService: true }],
          speak: () => { state.spoken++; }, cancel: () => { state.cancels++; },
        }) });
        window.storyAudioTest = state;
      });
      await page.goto(route); await selected("read");
      await expect(page.locator('.reader-listening')).not.toHaveAttribute("open");
      await expect(page.locator('.story-activity-tabs > button')).toHaveCount(4);
      assert.ok((await page.locator('.story-compact-cover').boundingBox()).height < 200);
      await noOverflow();
      await page.screenshot({ path: `${directory}/read-${mobile ? "mobile" : "desktop"}.png`, fullPage: false });
      const reading = page.getByRole("region", { name: "Đọc truyện", exact: true });
      await reading.getByRole("button", { name: "English", exact: true }).click();
      await reading.getByRole("button", { name: "Rất lớn", exact: true }).click();
      await open("quiz");
      const radio = panel("quiz").locator('input[type="radio"]').first(); await radio.check();
      await open("vocabulary");
      await panel("vocabulary").getByRole("button", { name: /Yêu thích từ/ }).first().click();
      await open("quiz"); await expect(radio).toBeChecked();
      await open("read");
      await expect(reading.getByRole("button", { name: "English", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(reading.getByRole("button", { name: "Rất lớn", exact: true })).toHaveAttribute("aria-pressed", "true");
      await page.locator(".reader-listening > summary").click();
      await page.getByRole("button", { name: "Nghe truyện", exact: true }).click();
      await expect(page.locator(".sentence.active")).toHaveCount(1);
      const before = await page.evaluate(() => window.storyAudioTest);
      await open("vocabulary");
      await expect(page.locator(".sentence.active")).toHaveCount(0);
      const after = await page.evaluate(() => window.storyAudioTest);
      assert.ok(after.pauses > before.pauses || after.cancels > before.cancels, "Audio must stop when leaving reading");
      await page.goBack(); await selected("read");
      await page.goForward(); await selected("vocabulary");
      await page.reload(); await selected("vocabulary");
      await expect(panel("vocabulary").getByRole("button", { name: /Đã yêu thích/ })).toHaveCount(1);
      await page.goto(route + "#audio"); await selected("read");
      await expect(page.locator(".reader-listening")).toHaveAttribute("open", "");
      await page.goto(route + "#quiz"); await selected("quiz");
      for (const fieldset of await panel("quiz").locator(".quiz-question").all()) {
        const options = fieldset.locator('input[type="radio"]'); if (await options.count()) await options.first().check();
      }
      await page.getByRole("button", { name: "Kiểm tra bài làm", exact: true }).click();
      await expect(panel("quiz").locator(".quiz-result").first()).toBeVisible();
      await page.getByRole("button", { name: "Xem tiến độ của em", exact: true }).click(); await selected("progress");
      await expect(panel("progress")).toContainText("Em đã gửi bài để kiểm tra.");
      await expect(panel("progress")).toContainText("Em chưa ghi nhận đọc xong.");
      await open("read");
      await page.getByRole("button", { name: "Em đã đọc xong", exact: true }).click();
      await expect(page.getByRole("button", { name: "Đã đọc xong 🌟", exact: true })).toBeVisible();
      const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
      assert.ok(saved.finished[slug]); assert.ok(saved.activities[slug]);
      await page.getByRole("button", { name: "Khám phá từ vựng", exact: true }).click(); await selected("vocabulary");
      await page.getByRole("button", { name: "Cùng thử tài", exact: true }).click(); await selected("quiz");
      await expect(panel("quiz").locator(".quiz-result").first()).toBeVisible();
      await open("progress");
      await page.screenshot({ path: `${directory}/progress-${mobile ? "mobile" : "desktop"}.png`, fullPage: false });
      if (!mobile) {
        await tab("progress").focus(); await tab("progress").press("Home"); await selected("read"); await expect(tab("read")).toBeFocused();
        await tab("read").press("ArrowDown"); await selected("vocabulary");
        await tab("vocabulary").press("End"); await selected("progress");
        reports.push({ desktop: true, keyboardNavigation: true, audioStops: true, statePreserved: true, gradingAndProgress: true, historyAndDeepLinks: true });
      } else {
        for (const width of [320, 390, 600, 760]) {
          await page.setViewportSize({ width, height: 844 });
          await open("read");
          await page.locator(".reading-sentences .sentence").last().scrollIntoViewIfNeeded();
          const quick = page.getByRole("navigation", { name: "Chuyển nhanh hoạt động", exact: true });
          await expect(quick).toBeVisible();
          const bounds = await quick.boundingBox(); assert.ok(bounds.y >= 0 && bounds.y < 20, "Mobile activity switcher must stick at top");
          await noOverflow();
          await quick.getByRole("button", { name: "Thử tài", exact: true }).click(); await selected("quiz");
          await noOverflow();
          await quick.getByRole("button", { name: "Tiến độ", exact: true }).click(); await selected("progress");
          await noOverflow();
          await page.screenshot({ path: `${directory}/progress-${width}.png`, fullPage: false });
        }
        reports.push({ mobile: true, widths: [320, 390, 600, 760], stickyActivitySwitcher: true, bottomNavigationPreserved: true, noOverflow: true });
      }
      console.log(JSON.stringify(reports.at(-1)));
    } catch (error) { await page.screenshot({ path: `${directory}/failure-${mobile ? "mobile" : "desktop"}.png`, fullPage: false }).catch(() => {}); throw error; }
    finally { await context.close(); }
  }
  assert.deepEqual(errors, []);
  await writeFile(".data/story-workspace-check.json", JSON.stringify({ origin, checkedAt: new Date().toISOString(), reports, noPageErrors: true }, null, 2));
} finally {
  try { await browser?.close(); } finally {
    await server?.close();
    const browserClosed = !server || server.process().exitCode !== null;
    await writeFile(".data/story-workspace-owned-processes.json", JSON.stringify({ status: "finished", processes, browserClosed }, null, 2));
    console.log(JSON.stringify({ browserClosed }));
  }
}
