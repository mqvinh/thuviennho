import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 25000 });
const args = process.argv.slice(2), origin = new URL(args[0]).origin;
const directory = ".data/project-check/support", reports = [], processes = [];
const topics = [
  { slug: "flashcard", path: "/tro-choi/flashcard", title: "Flashcard từ vựng thông minh" },
  { slug: "ghep-tu-voi-hinh", path: "/tro-choi/ghep-tu-voi-hinh", title: "Ghép từ với hình" },
  { slug: "xep-tranh-ke-chuyen", path: "/tro-choi/xep-tranh-ke-chuyen", title: "Xếp tranh kể chuyện" },
  { slug: "hanh-trinh-doc-sach", path: "/hanh-trinh", title: "Hành trình đọc sách" },
];
const navigation = ["/", "/nghe-sach", "/tu-vung", "/thu-tai", "/tro-choi", "/nhat-ky", "/hanh-trinh", "/ho-tro"];
await mkdir(directory, { recursive: true });
let bypass;
if (args.includes("--protection-config")) {
  const raw = await readFile(args[args.indexOf("--protection-config") + 1]);
  const project = JSON.parse(raw.toString(raw[0] === 255 ? "utf16le" : "utf8").replace(/^\uFEFF/, ""));
  bypass = Object.keys(project.protectionBypass || {})[0]; assert.ok(bypass);
}
let server, browser;
try {
  server = await chromium.launchServer({ headless: true });
  const child = server.process();
  processes.push({ pid: child.pid, parentPid: process.pid, createdAt: new Date().toISOString(), port: Number(new URL(server.wsEndpoint()).port), profile: child.spawnargs.find(arg => arg.startsWith("--user-data-dir="))?.slice(16) });
  await writeFile(".data/support-owned-processes.json", JSON.stringify({ status: "running", processes }, null, 2));
  console.log(JSON.stringify({ processes }));
  browser = await chromium.connect(server.wsEndpoint());
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ baseURL: origin, viewport: mobile ? { width: 320, height: 740 } : { width: 1600, height: 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion: mobile ? "reduce" : "no-preference" });
    context.setDefaultTimeout(25000); context.setDefaultNavigationTimeout(90000);
    if (bypass) await context.route(origin + "/**", route => route.continue({ headers: { ...route.request().headers(), "x-vercel-protection-bypass": bypass } }));
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const activate = locator => mobile ? locator.tap() : locator.click();
    const helpButton = page.getByRole("button", { name: "Hỗ trợ trang này", exact: true });
    const dialog = page.getByRole("dialog", { name: "Hỗ trợ & hướng dẫn", exact: true });
    try {
      await page.goto("/ho-tro");
      await expect(page.locator(".help-guide-card")).toHaveCount(4);
      assert.deepEqual(await page.locator(".help-guide-card > a").evaluateAll(links => links.map(link => link.getAttribute("href"))), topics.map(topic => `/ho-tro/${topic.slug}`));
      await expect(helpButton).toHaveCount(0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `${directory}/hub-${mobile ? "mobile" : "desktop"}.png`, fullPage: true });
      if (!mobile) {
        const nav = page.getByRole("navigation", { name: "Các khu vực thư viện", exact: true });
        const more = nav.getByRole("button", { name: "Xem thêm", exact: true });
        for (const width of [761, 900, 1280, 1600]) {
          await page.setViewportSize({ width, height: 1000 });
          await expect(nav).toHaveAttribute("data-measured", "true");
          await expect.poll(async () => nav.evaluate(element => {
            const sizes = [...element.querySelector(".navigation-measure").children].map(child => child.getBoundingClientRect().width);
            const gap = parseFloat(getComputedStyle(element).columnGap);
            const total = sizes.slice(0, -1).reduce((sum, value) => sum + value, 0) + gap * (sizes.length - 2);
            let count = sizes.length - 1;
            if (total > element.clientWidth) { count = 0; let used = sizes.at(-1); for (const width of sizes.slice(0, -1)) { if (used + gap + width > element.clientWidth) break; used += gap + width; count++; } }
            return element.querySelectorAll(":scope > a").length === count;
          })).toBe(true);
          const direct = await nav.locator(":scope > a").evaluateAll(links => links.map(link => ({ href: link.getAttribute("href"), top: link.getBoundingClientRect().top, right: link.getBoundingClientRect().right })));
          assert.deepEqual(direct.map(link => link.href), navigation.slice(0, direct.length));
          assert.ok(direct.every(link => Math.abs(link.top - direct[0].top) < 2));
          const navBox = await nav.boundingBox();
          assert.ok(direct.every(link => link.right <= navBox.x + navBox.width + 1));
          if (direct.length < navigation.length) {
            await more.click();
            assert.deepEqual(await nav.locator(".navigation-more-panel a").evaluateAll(links => links.map(link => link.getAttribute("href"))), navigation.slice(direct.length));
            await expect(nav.locator(".navigation-more-panel a").last()).toHaveAttribute("href", "/ho-tro");
            await page.keyboard.press("Escape"); await expect(more).toBeFocused();
          } else await expect(more).toHaveCount(0);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        }
        await page.setViewportSize({ width: 900, height: 1000 });
        await expect(more).toBeVisible(); await more.focus(); await page.keyboard.press("ArrowDown");
        await expect(nav.locator(".navigation-more-panel a").first()).toBeFocused();
        await page.keyboard.press("End"); await expect(nav.locator(".navigation-more-panel a").last()).toBeFocused();
        await page.screenshot({ path: `${directory}/desktop-more.png` });
        await page.keyboard.press("Escape"); await more.click();
        await page.locator(".help-hub-heading").click(); await expect(more).toHaveAttribute("aria-expanded", "false");
        await more.click(); await nav.locator('.navigation-more-panel a[href="/ho-tro"]').click();
        await expect(more).toHaveAttribute("aria-expanded", "false");
        await page.setViewportSize({ width: 1280, height: 1000 });
      } else {
        const menu = page.getByRole("navigation", { name: "Menu chính trên di động", exact: true });
        await menu.getByRole("button", { name: "Thêm", exact: true }).tap();
        const links = page.locator(".mobile-more-items a");
        await expect(links.last()).toHaveAttribute("href", "/ho-tro");
        await expect(links.last()).toHaveAttribute("aria-current", "page");
        assert.equal(await page.locator(".floating-controls").evaluate(element => element.inert), true);
        await links.last().tap(); await expect(page.locator(".mobile-more-sheet")).toHaveCount(0);
      }
      reports.push({ mobile, hub: true, navigationOverflow: !mobile, mobileMore: mobile });
      console.log(JSON.stringify(reports.at(-1)));
      for (const topic of topics) {
        await page.goto(`/ho-tro/${topic.slug}`);
        await expect(page.locator(".help-article > h2")).toContainText(topic.title);
        await expect(helpButton).toHaveCount(0);
        if (mobile) {
          const list = page.locator(".help-page-layout").getByRole("button", { name: "Danh sách hướng dẫn", exact: true });
          await expect(page.locator(".help-page-layout .help-topics")).toBeHidden();
          await list.tap(); await expect(page.locator(".help-page-layout .help-topics a")).toHaveCount(4);
          await expect(page.locator(".help-page-layout .help-topic[aria-current='page']")).toContainText(topic.title);
          await list.tap();
        } else await expect(page.locator(".help-page-layout .help-topic[aria-current='page']")).toContainText(topic.title);
        await page.goto(topic.path);
        await expect(helpButton).toBeVisible();
        await activate(helpButton); await expect(dialog).toBeVisible();
        await expect(dialog.locator(".help-article > h2")).toContainText(topic.title);
        await expect(dialog.locator(".help-article > h2")).toBeFocused();
        assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
        const list = dialog.getByRole("button", { name: "Danh sách hướng dẫn", exact: true });
        if (mobile) {
          await expect(dialog.locator(".help-topics")).toBeHidden();
          await list.tap(); await expect(dialog.locator(".help-topics")).toBeVisible();
        }
        await expect(dialog.locator(".help-topic[aria-current='page']")).toContainText(topic.title);
        const another = topics.find(item => item.slug !== topic.slug);
        await activate(dialog.locator(".help-topics").getByRole("button", { name: another.title, exact: true }));
        await expect(dialog.locator(".help-article > h2")).toContainText(another.title);
        if (mobile) await expect(dialog.locator(".help-topics")).toBeHidden();
        await expect(dialog.getByRole("link", { name: "Mở hướng dẫn thành trang riêng", exact: true })).toHaveAttribute("href", `/ho-tro/${another.slug}`);
        await activate(dialog.getByRole("button", { name: "Đóng", exact: true }));
        await expect(dialog).toBeHidden(); await expect(helpButton).toBeFocused();
        assert.equal(await page.evaluate(() => document.body.style.overflow), "");
        await activate(helpButton); await expect(dialog.locator(".help-article > h2")).toContainText(topic.title);
        if (topic.slug === "flashcard") {
          assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth));
          await dialog.screenshot({ path: `${directory}/modal-${mobile ? "mobile" : "desktop"}.png` });
          // Native dialogs can tab into browser chrome (body becomes active),
          // but never into the underlying page.
          for (let i = 0; i < 16; i++) { await page.keyboard.press("Tab"); assert.ok(await dialog.evaluate(element => document.activeElement === document.body || element.contains(document.activeElement))); }
          await dialog.locator(".help-article > h2").focus();
        }
        await page.keyboard.press("Escape"); await expect(dialog).toBeHidden();
        await activate(helpButton); await page.mouse.click(2, 2); await expect(dialog).toBeHidden();
      }
      reports.push({ mobile, standalonePages: 4, contextualPages: 4, topicSelection: true, resetToCurrentPage: true, focusTrap: true, dismiss: ["button", "escape", "outside"] });
      console.log(JSON.stringify(reports.at(-1)));
      await page.goto("/tro-choi/xep-tranh-ke-chuyen");
      await page.locator(".sequence-story .button").first().click();
      await activate(page.locator(".sequence-bank .sequence-card-select").first());
      await activate(page.locator(".sequence-slot-target").first());
      const currentState = () => page.locator(".sequence-slot img").evaluateAll(images => images.map(image => image.getAttribute("src")));
      const before = await currentState(), saved = await page.evaluate(() => localStorage.getItem("little-readers-device-v1"));
      await activate(helpButton); await activate(dialog.getByRole("link", { name: "Mở Xếp tranh kể chuyện", exact: true }));
      await expect(dialog).toBeHidden();
      assert.deepEqual(await currentState(), before); assert.equal(await page.evaluate(() => localStorage.getItem("little-readers-device-v1")), saved);
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
      const topButton = page.getByRole("button", { name: "Lên đầu trang", exact: true });
      await expect(topButton).toBeVisible(); await expect(page.locator(".back-to-top")).toHaveCount(1);
      const topBox = await topButton.boundingBox(), helpBox = await helpButton.boundingBox();
      assert.ok(topBox.y + topBox.height <= helpBox.y - 5);
      if (mobile) assert.ok(helpBox.y + helpBox.height < (await page.locator(".mobile-bottom-nav").boundingBox()).y);
      await page.screenshot({ path: `${directory}/floating-${mobile ? "mobile" : "desktop"}.png` });
      if (!mobile) {
        const initial = await page.evaluate(() => scrollY); await topButton.click();
        const intermediate = await page.evaluate(() => new Promise(resolve => { const start = performance.now(); function sample(now) { if (now - start > 250) resolve(scrollY); else requestAnimationFrame(sample); } requestAnimationFrame(sample); }));
        assert.ok(intermediate > 0 && intermediate < initial);
        await expect.poll(() => page.evaluate(() => scrollY), { timeout: 7000 }).toBe(0);
      }
      for (const path of ["/tro-choi", "/nhat-ky", "/tu-vung", "/nghe-sach"]) { await page.goto(path); await expect(helpButton).toHaveCount(0); }
      assert.deepEqual(errors, []);
      reports.push({ mobile, gamePreserved: true, storageUnchanged: true, floatingOrder: true, smoothScroll: !mobile, onlySupportedPages: true, noConsoleErrors: true });
      console.log(JSON.stringify(reports.at(-1)));
    } catch (error) { await page.screenshot({ path: `${directory}/failure-${mobile ? "mobile" : "desktop"}.png`, fullPage: true }).catch(() => {}); throw error; }
    finally { await context.close(); }
  }
  const missing = await fetch(origin + "/ho-tro/khong-co-huong-dan", { headers: bypass ? { "x-vercel-protection-bypass": bypass } : {}, redirect: "error" });
  // Next.js keeps HTTP 200 if notFound() runs after streaming has started.
  // Both responses must show the not-found UI and prevent indexing.
  assert.ok([200, 404].includes(missing.status));
  const missingHtml = await missing.text();
  assert.ok(missingHtml.includes("Không tìm thấy trang"));
  assert.match(missingHtml, /<meta\b[^>]*name="robots"[^>]*content="noindex"/);
  await writeFile(".data/support-browser-check.json", JSON.stringify({ origin, checkedAt: new Date().toISOString(), reports, unknownGuideStatus: missing.status, unknownGuideNotFound: true }, null, 2));
} finally {
  try { await browser?.close(); }
  finally {
    await server?.close();
    const browserClosed = !server || server.process().exitCode !== null;
    await writeFile(".data/support-owned-processes.json", JSON.stringify({ processes, status: "finished", browserClosed }, null, 2));
    console.log(JSON.stringify({ browserClosed }));
  }
}
