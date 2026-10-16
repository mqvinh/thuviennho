import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, expect as baseExpect } from "@playwright/test";

const expect = baseExpect.configure({ timeout: 20000 });
const args = process.argv.slice(2), origin = new URL(args[0]).origin;
const directory = ".data/project-check/journey-map", processes = [], reports = [];
const key = "little-readers-device-v1";
const empty = () => ({ version: 1, favorites: [], started: {}, finished: {}, activities: {}, journal: [], flashcards: {}, matching: {}, sequencing: {} });
let bypass;
if (args.includes("--protection-config")) {
  const project = JSON.parse(await readFile(args[args.indexOf("--protection-config") + 1], "utf8"));
  bypass = Object.keys(project.protectionBypass || {})[0]; assert.ok(bypass);
}
await mkdir(directory, { recursive: true });
let server, browser;
try {
  server = await chromium.launchServer({ headless: true });
  const child = server.process();
  processes.push({ pid: child.pid, parentPid: process.pid, createdAt: new Date().toISOString(), port: Number(new URL(server.wsEndpoint()).port), profile: child.spawnargs.find(arg => arg.startsWith("--user-data-dir="))?.slice(16) });
  await writeFile(".data/journey-map-owned-processes.json", JSON.stringify({ status: "running", processes }, null, 2));
  console.log(JSON.stringify({ processes }));
  browser = await chromium.connect(server.wsEndpoint());
  const stories = [], errors = [];
  let saved;
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ baseURL: origin, viewport: mobile ? { width: 320, height: 740 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion: "reduce", acceptDownloads: true });
    if (bypass) await context.route(origin + "/**", route => route.continue({ headers: { ...route.request().headers(), "x-vercel-protection-bypass": bypass } }));
    const page = await context.newPage();
    page.setDefaultTimeout(20000); page.setDefaultNavigationTimeout(90000);
    page.on("pageerror", error => errors.push(error.message));
    const activate = locator => mobile ? locator.tap() : locator.click();
    const updateProgress = value => page.evaluate(({ key, value }) => { localStorage.setItem(key, JSON.stringify(value)); dispatchEvent(new Event("library-device-change")); }, { key, value });
    const progress = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    const checkDestinations = async () => {
      const issues = await page.locator(".journey-scene-board").evaluateAll(boards => boards.flatMap(board => {
        const frame = board.getBoundingClientRect(), stops = [...board.querySelectorAll(".journey-map-stop")];
        return stops.flatMap((stop, index) => {
          const box = stop.getBoundingClientRect(), problems = [];
          if (box.left < frame.left || box.right > frame.right || box.top < frame.top || box.bottom > frame.bottom) problems.push("Destination clipped: " + stop.dataset.story);
          for (const other of stops.slice(index + 1)) {
            const next = other.getBoundingClientRect();
            if (Math.min(box.right, next.right) - Math.max(box.left, next.left) > 1 && Math.min(box.bottom, next.bottom) - Math.max(box.top, next.top) > 1) problems.push("Overlapping destinations: " + stop.dataset.story + ", " + other.dataset.story);
          }
          return problems;
        });
      }));
      assert.deepEqual(issues, []);
    };
    try {
      await page.goto("/hanh-trinh");
      const map = page.locator(".journey-map");
      await expect(map).toHaveAttribute("aria-busy", "false");
      const pickers = map.locator(".journey-region-picker button");
      assert.ok(await pickers.count() >= 6);
      if (!mobile) {
        await expect(map.locator(".journey-world")).toBeVisible();
        await map.locator(".journey-world").screenshot({ path: `${directory}/world-desktop.png` });
        const count = await pickers.count();
        for (let index = 0; index < count; index++) {
          await activate(pickers.nth(index));
          await expect(pickers.nth(index)).toHaveAttribute("aria-pressed", "true");
          const group = await map.locator(".journey-map-stop").evaluateAll(buttons => buttons.map(button => ({ slug: button.dataset.story, title: button.querySelector(".journey-stop-story").textContent, state: button.dataset.state })));
          assert.ok(group.every(story => story.state === "new"));
          await checkDestinations();
          stories.push(...group);
        }
        assert.equal(new Set(stories.map(story => story.slug)).size, stories.length);
        assert.ok(stories.length >= 10);
        await expect(map.locator(".journey-map-count strong")).toHaveText(`0 / ${stories.length}`);
        const sample = stories[0];
        await page.goto(`/doc/${sample.slug}`);
        const start = page.getByRole("button", { name: "Ghi nhận bắt đầu đọc", exact: true });
        await start.click();
        const started = await progress();
        assert.ok(started.started[sample.slug]); assert.equal(started.finished[sample.slug], undefined);
        await page.getByRole("button", { name: "Em đã đọc xong", exact: true }).click();
        await expect(page.locator(".journey-unlock")).toBeVisible();
        const first = await progress();
        assert.equal(first.started[sample.slug].date, started.started[sample.slug].date);
        await page.getByRole("button", { name: "Đã đọc xong 🌟", exact: true }).click();
        assert.deepEqual(await progress(), first);
        await expect(page.locator(".journey-unlock")).toHaveCount(1);
        await page.locator(".journey-unlock").screenshot({ path: `${directory}/reading-unlock.png` });
        await page.getByRole("link", { name: "Xem địa điểm vừa mở →", exact: true }).click();
        await expect(page.locator(`.journey-map-stop[data-story="${sample.slug}"]`)).toHaveAttribute("data-state", "finished");
        await expect(page.locator(`.journey-map-stop[data-story="${sample.slug}"]`)).toHaveAttribute("aria-pressed", "true");
        await expect(page.locator("#journey-stop-title")).toHaveText(sample.title);
        await expect(page.locator(".journey-map-milestone.is-unlocked")).toHaveCount(1);
        assert.deepEqual(await progress(), first);
        saved = empty();
        saved.finished = Object.fromEntries(stories.slice(0, 10).map(story => [story.slug, { title: story.title, date: "2026-10-16T01:00:00.000Z" }]));
        saved.started[stories[10].slug] = { title: stories[10].title, date: "2026-10-16T00:00:00.000Z" };
        await updateProgress(saved);
        await expect(page.locator(".journey-map-count strong")).toHaveText(`10 / ${stories.length}`);
        await expect(page.locator(".journey-map-milestone.is-unlocked")).toHaveCount(3);
        const downloadPromise = page.waitForEvent("download");
        await page.getByRole("button", { name: "Tải bản sao nhật ký và tiến độ", exact: true }).click();
        const download = await downloadPromise;
        await download.saveAs(`${directory}/backup-test.json`);
        const downloaded = JSON.parse(await readFile(`${directory}/backup-test.json`, "utf8"));
        assert.deepEqual(downloaded, saved);
        await updateProgress(empty());
        await page.locator("#journey-backup").setInputFiles({ name: "journey-test.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(downloaded)) });
        await expect(page.locator(".journey-map-count strong")).toHaveText(`0 / ${stories.length}`);
        await page.getByRole("button", { name: "Khôi phục bản sao", exact: true }).click();
        await page.locator(".app-modal").getByRole("button", { name: "Tiếp tục", exact: true }).click();
        await expect(page.locator(".journey-map-count strong")).toHaveText(`10 / ${stories.length}`);
        assert.deepEqual(await progress(), saved);
        await page.goto(`/hanh-trinh?truyen=${stories[10].slug}`);
        await expect(page.locator(`.journey-map-stop[data-story="${stories[10].slug}"]`)).toHaveAttribute("data-state", "started");
        await page.locator(".journey-region").screenshot({ path: `${directory}/region-desktop.png` });
        for (const width of [761, 900, 1101, 1280, 1600]) { await page.setViewportSize({ width, height: 1000 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await checkDestinations(); }
        reports.push({ mobile, stories: stories.length, completion: true, rereadIdempotent: true, deepLink: true, milestones: true, backupRoundTrip: true });
      } else {
        await updateProgress(saved);
        await expect(map.locator(".journey-world")).toBeHidden();
        await expect(map.locator(".journey-map-count strong")).toHaveText(`10 / ${stories.length}`);
        for (let index = 0; index < await pickers.count(); index++) {
          await activate(pickers.nth(index));
          await expect(pickers.nth(index)).toHaveAttribute("aria-pressed", "true");
          const stop = map.locator(".journey-map-stop").first();
          if (await stop.count()) {
            const box = await stop.boundingBox(); assert.ok(box.width >= 44 && box.height >= 44);
            await activate(stop);
            await expect(page.locator("#journey-stop-title")).toBeFocused();
          }
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          await checkDestinations();
        }
        await page.goto(`/hanh-trinh?truyen=${stories[10].slug}`);
        await expect(page.locator(`.journey-map-stop[data-story="${stories[10].slug}"]`)).toHaveAttribute("aria-pressed", "true");
        await page.locator(".journey-map").screenshot({ path: `${directory}/map-mobile.png` });
        assert.deepEqual(await progress(), saved);
        reports.push({ mobile, themeSwitching: true, noOverflow: true, touchTargets: true, deepLink: true, progressPreserved: true });
      }
      await activate(page.getByRole("button", { name: "Hỗ trợ trang này", exact: true }));
      await expect(page.locator(".help-dialog")).toContainText("Khám phá bản đồ câu chuyện");
      await activate(page.locator(".help-dialog").getByRole("button", { name: "Đóng", exact: true }));
      console.log(JSON.stringify(reports.at(-1)));
    } catch (error) { await page.screenshot({ path: `${directory}/failure-${mobile ? "mobile" : "desktop"}.png`, fullPage: true }).catch(() => {}); throw error; }
    finally { await context.close(); }
  }
  assert.deepEqual(errors, []);
  await writeFile(".data/journey-map-check.json", JSON.stringify({ origin, checkedAt: new Date().toISOString(), reports, noPageErrors: true }, null, 2));
} finally {
  try { await browser?.close(); } finally {
    await server?.close();
    const browserClosed = !server || server.process().exitCode !== null;
    await writeFile(".data/journey-map-owned-processes.json", JSON.stringify({ status: "finished", processes, browserClosed }, null, 2));
    console.log(JSON.stringify({ browserClosed }));
  }
}
