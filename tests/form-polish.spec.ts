import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

const headers = { Origin: "http://localhost:3100" };
async function login(request: APIRequestContext, username = "test-admin") {
  expect((await request.post("/api/teacher/login", { headers, data: { username, password: "Test-password-123!" } })).status()).toBe(200);
}
async function acknowledge(page: Page) {
  await page.getByRole("dialog").getByRole("button", { name: "Đã hiểu", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
async function requiredMarkers(page: Page) {
  const controls = page.locator('form :is(input,select,textarea)[required]');
  for (const control of await controls.all()) {
    const marker = control.locator("xpath=ancestor::label").locator(".required-marker");
    await expect(marker).toHaveCount(1);
    expect(await marker.evaluate(element => getComputedStyle(element, "::after").content)).toBe('"*"');
    expect(await marker.evaluate(element => getComputedStyle(element).color)).toBe("rgb(180, 35, 24)");
  }
  await expect(page.locator("main form .required-marker")).toHaveCount(await controls.count());
}

test("story creation and publication require only the code and bilingual titles and preserve unfinished items", async ({ page }) => {
  test.setTimeout(180_000); await login(page.request);
  await page.goto("/admin/bien-tap");
  await expect(page.locator("main form")).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("main form [required]")).toHaveCount(3);
  await requiredMarkers(page);
  await page.getByLabel("Mã truyện (chữ thường, số, dấu -)", { exact: true }).fill("minimal-story-draft");
  await page.getByLabel("Tên tiếng Việt", { exact: true }).fill("Bản nháp tối thiểu");
  await page.getByLabel("Tên English", { exact: true }).fill("Minimal draft");
  await page.getByLabel("Thời lượng (phút)", { exact: true }).fill("");
  await page.getByRole("button", { name: "Thêm từ", exact: true }).click();
  await page.getByRole("button", { name: "Thêm từ", exact: true }).click();
  await page.getByRole("button", { name: "Thêm câu hỏi", exact: true }).click();
  await page.getByRole("button", { name: "Lưu bản nháp", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Đã lưu bản nháp thành công."); await acknowledge(page);
  const saved = await (await page.request.get("/api/teacher/content?slug=minimal-story-draft")).json();
  expect(saved.theme_slug).toBeNull(); expect(saved.estimated_minutes).toBe(5);
  expect(saved.source_note).toBe(""); expect(saved.license_note).toBe("");
  expect(saved.sentences[0].text_vi).toBe(""); expect(saved.vocabulary).toHaveLength(2);
  expect(saved.questions[0].options).toEqual(["", "", ""]);
  const minimal = { slug: "minimal-api-draft", title_vi: "Chỉ ba trường", title_en: "Only three fields" };
  expect((await page.request.post("/api/teacher/save", { headers, data: minimal })).status()).toBe(200);
  for (const key of ["slug", "title_vi", "title_en"]) expect((await page.request.post("/api/teacher/save", { headers, data: { ...minimal, [key]: " " } })).status()).toBe(400);
  const publish = () => page.request.post("/api/teacher/status", { headers, data: { slug: saved.slug, status: "published", reviewed: true } });
  expect((await publish()).status()).toBe(200);
  expect((await page.request.post("/api/teacher/status", { headers, data: { slug: minimal.slug, status: "published", reviewed: true } })).status()).toBe(200);
  await page.goto(`/doc/${minimal.slug}`);
  await expect(page.locator("main h1")).toHaveText(minimal.title_vi);
  await page.goto("/admin/bien-tap");
  await page.getByLabel("Mã truyện (chữ thường, số, dấu -)", { exact: true }).fill("minimal-direct-publication");
  await page.getByLabel("Tên tiếng Việt", { exact: true }).fill("Truyện chỉ có tên");
  await page.getByLabel("Tên English", { exact: true }).fill("A story with titles only");
  await page.getByRole("button", { name: "Xuất bản", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xuất bản", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/truyen$/);
  const published = await (await page.request.get("/api/teacher/content?slug=minimal-direct-publication")).json();
  expect(published.review_status).toBe("published");
});

test("website descriptions persist, render below the name, can be cleared and support saving before navigation", async ({ page }) => {
  test.setTimeout(180_000); await login(page.request);
  const original = await (await page.request.get("/api/teacher/settings")).json();
  try {
    expect(original.site_description).toBe("Little Readers · Cùng đọc mỗi ngày");
    expect((await page.request.post("/api/teacher/settings", { headers, data: { ...original, site_description: "x".repeat(301) } })).status()).toBe(400);
    const { site_description, ...legacy } = original; void site_description;
    expect((await page.request.post("/api/teacher/settings", { headers, data: legacy })).status()).toBe(200);
    expect((await (await page.request.get("/api/teacher/settings")).json()).site_description).toBe(original.site_description);
    await page.goto("/admin/cai-dat");
    const field = page.getByLabel("Mô tả website", { exact: true });
    await expect(field).toHaveValue(original.site_description, { timeout: 60_000 });
    await field.fill("Thư viện song ngữ lớp 2.\nCùng học mỗi ngày.");
    await page.getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Đã cập nhật thông tin website."); await acknowledge(page);
    await expect(page.locator(".brand-name small")).toHaveText("Thư viện song ngữ lớp 2. Cùng học mỗi ngày.");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Thư viện song ngữ lớp 2.\nCùng học mỗi ngày.");
    await page.goto("/hanh-trinh");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Thư viện song ngữ lớp 2.\nCùng học mỗi ngày.");
    await expect(page.locator(".brand-name small")).toHaveText("Thư viện song ngữ lớp 2. Cùng học mỗi ngày.");
    await page.goto("/admin/cai-dat");
    await page.reload(); await expect(field).toHaveValue("Thư viện song ngữ lớp 2.\nCùng học mỗi ngày.", { timeout: 60_000 });
    await field.fill(""); await page.getByRole("button", { name: "Lưu cài đặt", exact: true }).click(); await acknowledge(page);
    await expect(page.locator(".brand-name small")).toHaveCount(0);
    await field.fill("Mô tả được lưu trước khi rời trang.");
    await page.getByRole("link", { name: "← Quay lại", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Lưu và tiếp tục", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/truyen$/);
    expect((await (await page.request.get("/api/teacher/settings")).json()).site_description).toBe("Mô tả được lưu trước khi rời trang.");
  } finally { expect((await page.request.post("/api/teacher/settings", { headers, data: original })).status()).toBe(200); }
});

test("management forms share centered widths and required markers while login stays centered and topic actions use short labels", async ({ page }) => {
  test.setTimeout(240_000); await login(page.request);
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const route of ["bien-tap", "bien-tap-chu-de", "bien-tap-nguoi-dung", "tai-khoan", "cai-dat", "ai"]) {
      await page.goto(`/admin/${route}`);
      await expect(page.locator("main form")).toBeVisible({ timeout: 60_000 });
      const panel = page.locator(".management-form-page .panel").first(); const bounds = (await panel.boundingBox())!;
      expect(bounds.width).toBe(viewport.width === 1280 ? 1000 : 354);
      expect(Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2)).toBeLessThan(1);
      if (route === "tai-khoan") await page.getByLabel("Đổi mật khẩu", { exact: true }).check();
      await requiredMarkers(page);
      if (route === "tai-khoan") await page.getByLabel("Đổi mật khẩu", { exact: true }).uncheck();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (route === "tai-khoan" || route === "cai-dat") await page.screenshot({ path: `.data/project-check/polished-${route}-${viewport.width}.png`, fullPage: true, animations: "disabled" });
    }
  }
  expect(await page.locator(".account-menu summary").evaluate(element => getComputedStyle(element).borderTopWidth)).toBe("0px");
  await page.goto("/admin/chu-de"); await page.locator("tbody tr").first().locator(".row-menu-trigger").click();
  await expect(page.locator(".row-dropdown").getByRole("link")).toHaveText("Sửa");
  await expect(page.locator(".row-dropdown").getByRole("button")).toHaveText("Xóa");
  await page.goto("/nhat-ky"); await expect(page.locator(".journal-form")).toBeVisible(); await requiredMarkers(page);
  await page.request.post("/api/teacher/logout", { headers, data: {} }); await page.goto("/admin");
  await expect(page.locator(".login-panel button")).toBeEnabled({ timeout: 60_000 });
  const button = (await page.locator(".login-panel button").boundingBox())!, form = (await page.locator(".login-panel form").boundingBox())!;
  expect(Math.abs(button.x + button.width / 2 - (form.x + form.width / 2))).toBeLessThan(1);
  await requiredMarkers(page);
});

test("loading indicators actually rotate and back to top scrolls through intermediate positions", async ({ page }) => {
  test.setTimeout(180_000); await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: "no-preference" }); await page.goto("/");
  await expect(page.locator(".bookshelf .story-card")).toHaveCount(8, { timeout: 60_000 });
  await page.evaluate(() => {
    const observed = window as typeof window & { scrollSamples?: number[] };
    observed.scrollSamples = [];
    window.addEventListener("scroll", () => observed.scrollSamples!.push(window.scrollY));
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
  });
  await expect(page.getByRole("button", { name: "Lên đầu trang", exact: true })).toBeVisible();
  const start = await page.evaluate(() => { (window as typeof window & { scrollSamples: number[] }).scrollSamples = []; return scrollY; });
  await page.getByRole("button", { name: "Lên đầu trang", exact: true }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  const intermediate = await page.evaluate(initial => (window as typeof window & { scrollSamples: number[] }).scrollSamples.filter(value => value > 0 && value < initial), start);
  expect(intermediate.length).toBeGreaterThan(3);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await expect(page.getByRole("button", { name: "Lên đầu trang", exact: true })).toBeVisible();
  const reducedStart = await page.evaluate(() => { (window as typeof window & { scrollSamples: number[] }).scrollSamples = []; return scrollY; });
  await page.getByRole("button", { name: "Lên đầu trang", exact: true }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  expect(await page.evaluate(initial => (window as typeof window & { scrollSamples: number[] }).scrollSamples.filter(value => value > 0 && value < initial).length, reducedStart)).toBeGreaterThan(3);
  await login(page.request);
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/teacher/settings", async route => { await gate; await route.continue(); });
  try {
    await page.goto("/admin/cai-dat");
    const spinner = page.locator(".loading-center .loading-spinner").first(); await expect(spinner).toBeVisible({ timeout: 60_000 });
    for (const reducedMotion of ["no-preference", "reduce"] as const) {
      await page.emulateMedia({ reducedMotion });
      expect(await spinner.evaluate(element => getComputedStyle(element).animationPlayState)).toBe("running");
      const before = await spinner.evaluate(element => getComputedStyle(element).transform);
      await expect.poll(() => spinner.evaluate(element => getComputedStyle(element).transform)).not.toBe(before);
    }
  } finally { release(); }
  await expect(page.getByLabel("Tên website", { exact: true })).toBeVisible({ timeout: 60_000 });
  await page.unroute("**/api/teacher/settings");
});
