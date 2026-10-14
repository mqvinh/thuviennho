import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
const origin = "http://localhost:3100";
const headers = { Origin: origin };
const password = "Test-password-123!";
const png = { name: "website.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=", "base64") };
async function login(request: APIRequestContext, username = "test-admin") {
  expect((await request.post("/api/teacher/login", { headers, data: { username, password } })).status()).toBe(200);
}
async function choose(page: Page, name: string) {
  await page.getByRole("dialog").getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
function story(slug: string) {
  return {
    slug, theme_slug: "kindness-sharing", title_vi: `Truyện ${slug}`, title_en: "Independent visibility",
    summary_vi: "Cùng đọc sách.", summary_en: "Read together.", reading_level: 1, estimated_minutes: 3,
    source_note: "Học liệu kiểm thử.", license_note: "Tự biên soạn.", cover_image_path: "",
    sentences: [{ text_vi: "Em đọc sách.", text_en: "I read a book.", audio_vi_path: "", audio_en_path: "" }],
    vocabulary: [{ word_vi: `từ-${slug}-fixture`, word_en: "book", meaning_vi: "Cuốn sách.", example_vi: "", pronunciation_path: "", illustration_path: "" }],
    questions: [1, 2, 3].map(n => ({ question_vi: `Câu hỏi ${n}`, question_en: "", kind: "choice", options: ["Có", "Không"], correct_option: 0, correct_order: [], explanation_vi: "Em đọc sách." })),
  };
}

test("website settings are admin only, update branding and favicon, and guard unsaved edits", async ({ page, playwright }) => {
  test.setTimeout(180_000);
  await login(page.request);
  const original = await (await page.request.get("/api/teacher/settings")).json();
  const teacher = await playwright.request.newContext({ baseURL: origin });
  const anonymous = await playwright.request.newContext({ baseURL: origin });
  try {
    expect((await anonymous.get("/api/teacher/settings")).status()).toBe(401);
    await login(teacher, "test-teacher");
    expect((await teacher.get("/api/teacher/settings")).status()).toBe(403);
    expect((await teacher.post("/api/teacher/settings", { headers, data: original })).status()).toBe(403);
    expect((await page.request.post("/api/teacher/settings", { headers, data: { ...original, site_name: " " } })).status()).toBe(400);
    expect((await page.request.post("/api/teacher/settings", { headers, data: { ...original, icon_path: "/media/00000000-0000-0000-0000-000000000000.png" } })).status()).toBe(400);
    expect((await page.request.post("/api/teacher/settings", { data: original })).status()).toBe(403);
    await page.goto("/admin/cai-dat");
    await expect(page.getByLabel("Tên website", { exact: true })).toHaveValue(original.site_name);
    await page.locator(".account-menu summary").click();
    await expect(page.locator(".account-dropdown").getByRole("link", { name: "Cài đặt website", exact: true })).toBeVisible();
    await page.locator(".account-menu summary").click();
    await page.getByLabel("Tên website", { exact: true }).fill("Thư viện Mật Ong");
    for (const label of ["Icon website", "Logo website"]) {
      await page.getByLabel(label, { exact: true }).setInputFiles(png);
      await expect(page.locator('.media-field[aria-busy="true"]')).toHaveCount(0);
      await expect(page.getByAltText(`${label} đã chọn`)).toBeVisible();
    }
    await page.getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Đã cập nhật thông tin website.");
    await choose(page, "Đã hiểu");
    await expect(page.locator(".brand-name")).toContainText("Thư viện Mật Ong");
    await expect(page).toHaveTitle("Thư viện Mật Ong");
    const saved = await (await page.request.get("/api/teacher/settings")).json();
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", saved.icon_path);
    await expect(page.locator(".brand-logo")).toHaveAttribute("src", saved.logo_path);
    expect((await anonymous.get(saved.icon_path)).status()).toBe(200);
    expect((await anonymous.get(saved.logo_path)).status()).toBe(200);
    await page.reload();
    await expect(page.getByLabel("Tên website", { exact: true })).toHaveValue(saved.site_name);
    await page.screenshot({ path: ".data/project-check/current-website-settings.png", fullPage: true, animations: "disabled" });
    await page.getByLabel("Tên website", { exact: true }).fill("Nội dung chưa lưu");
    await page.getByRole("link", { name: "← Quay lại", exact: true }).click();
    await choose(page, "Ở lại");
    await expect(page.getByLabel("Tên website", { exact: true })).toHaveValue("Nội dung chưa lưu");
    await page.getByRole("link", { name: "← Quay lại", exact: true }).click();
    await choose(page, "Rời trang không lưu");
    await expect(page).toHaveURL(/\/admin\/truyen$/);
    expect((await (await page.request.get("/api/teacher/settings")).json()).site_name).toBe(saved.site_name);
    await page.goto("/admin/cai-dat");
    await page.getByLabel("Tên website", { exact: true }).fill("Lưu trước khi rời trang");
    await page.getByRole("link", { name: "← Quay lại", exact: true }).click();
    await choose(page, "Lưu và tiếp tục");
    await expect(page).toHaveURL(/\/admin\/truyen$/);
    expect((await (await page.request.get("/api/teacher/settings")).json()).site_name).toBe("Lưu trước khi rời trang");
    await login(page.request, "test-teacher");
    await page.goto("/admin/tai-khoan");
    await page.locator(".account-menu summary").click();
    await expect(page.locator(".account-dropdown").getByRole("link", { name: "Cài đặt website", exact: true })).toHaveCount(0);
    await page.goto("/admin/cai-dat");
    await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
  } finally {
    await login(page.request);
    expect((await page.request.post("/api/teacher/settings", { headers, data: original })).status()).toBe(200);
    await teacher.dispose(); await anonymous.dispose();
  }
});

test("visibility preserves publication, restricts public content and media, and enforces ownership", async ({ page, playwright, browser }) => {
  test.setTimeout(240_000);
  const owner = await playwright.request.newContext({ baseURL: origin });
  const other = await playwright.request.newContext({ baseURL: origin });
  const publicContext = await browser.newContext(); const publicPage = await publicContext.newPage();
  try {
    await login(owner, "test-teacher"); await login(other, "other-teacher"); await login(page.request);
    const upload = await owner.post("/api/teacher/upload", { headers: { ...headers, "Content-Type": "image/png" }, data: png.buffer });
    const media = (await upload.json()).path;
    const draft = { ...story("visibility-independent"), cover_image_path: media };
    expect((await owner.post("/api/teacher/save", { headers, data: draft })).status()).toBe(200);
    expect((await owner.post("/api/teacher/visibility", { headers, data: { slug: draft.slug, is_visible: true } })).status()).toBe(200);
    expect((await other.post("/api/teacher/visibility", { headers, data: { slug: draft.slug, is_visible: false } })).status()).toBe(403);
    expect((await page.request.post("/api/teacher/visibility", { headers, data: { slug: draft.slug, is_visible: "false" } })).status()).toBe(400);
    expect((await page.request.post("/api/teacher/status", { headers, data: { slug: draft.slug, status: "published", reviewed: true } })).status()).toBe(200);
    await publicPage.goto(`${origin}/doc/${draft.slug}`);
    await expect(publicPage.locator("main h1")).toHaveText(draft.title_vi);
    const answers = await publicPage.locator(".quiz-question").evaluateAll(elements => elements.map(element => ({ id: element.querySelector("input")!.name, value: 0 })));
    expect((await publicContext.request.post(`${origin}/api/quiz`, { headers, data: { slug: draft.slug, answers } })).status()).toBe(200);
    expect((await publicContext.request.get(`${origin}${media}`)).status()).toBe(200);
    await page.goto("/admin/truyen");
    await page.getByLabel("Tên truyện", { exact: true }).fill(draft.title_vi);
    const row = page.locator(".stories-table tbody tr");
    await expect(row).toHaveCount(1);
    const checkbox = row.getByRole("checkbox", { name: `Hiển thị truyện ${draft.title_vi}`, exact: true });
    await expect(checkbox).toBeChecked(); await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked(); await expect(checkbox).toBeEnabled();
    await expect(row.locator(".status-badge")).toHaveText("Đã xuất bản");
    const stored = await (await page.request.get(`/api/teacher/content?slug=${draft.slug}`)).json();
    expect(stored.review_status).toBe("published"); expect(stored.is_published).toBe(true); expect(stored.is_visible).toBe(false);
    await page.route("**/api/teacher/visibility", route => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Chưa lưu được hiển thị. Hãy thử lại." }) }));
    await checkbox.click();
    await expect(page.getByRole("dialog")).toContainText("Chưa lưu được hiển thị.");
    await expect(checkbox).not.toBeChecked();
    await choose(page, "Đã hiểu");
    await page.unroute("**/api/teacher/visibility");
    await publicPage.goto(`${origin}/truyen/${draft.slug}`);
    await expect(publicPage.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
    await publicPage.goto(`${origin}/doc/${draft.slug}`);
    await expect(publicPage.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
    await publicPage.goto(`${origin}/`);
    await publicPage.getByLabel("Tìm tên truyện", { exact: true }).fill(draft.title_vi);
    await expect(publicPage.locator(".bookshelf .story-card")).toHaveCount(0);
    await publicPage.goto(`${origin}/tu-vung`);
    await expect(publicPage.getByRole("heading", { name: new RegExp(draft.vocabulary[0].word_vi) })).toHaveCount(0);
    expect((await publicContext.request.post(`${origin}/api/quiz`, { headers, data: { slug: draft.slug, answers } })).status()).toBe(400);
    expect((await publicContext.request.get(`${origin}${media}`)).status()).toBe(404);
    expect((await owner.get(media)).status()).toBe(200);
    await page.goto(`/admin/xem-thu/${draft.slug}`);
    await expect(page.getByRole("heading", { name: draft.title_vi, exact: true })).toBeVisible();
    // Neither approving again nor saving a revision resets the visibility choice.
    expect((await page.request.post("/api/teacher/status", { headers, data: { slug: draft.slug, status: "published", reviewed: true } })).status()).toBe(200);
    expect((await owner.post("/api/teacher/save", { headers, data: draft })).status()).toBe(200);
    const revision = await (await owner.get(`/api/teacher/content?slug=${draft.slug}`)).json();
    expect(revision.is_visible).toBe(false); expect(revision.review_status).toBe("draft");
    expect((await owner.post("/api/teacher/visibility", { headers, data: { slug: draft.slug, is_visible: true } })).status()).toBe(200);
    await publicPage.goto(`${origin}/truyen/${draft.slug}`);
    await expect(publicPage.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
    expect((await page.request.post("/api/teacher/status", { headers, data: { slug: draft.slug, status: "published", reviewed: true } })).status()).toBe(200);
    await publicPage.goto(`${origin}/doc/${draft.slug}`);
    await expect(publicPage.locator("main h1")).toHaveText(draft.title_vi);
    expect((await publicContext.request.get(`${origin}${media}`)).status()).toBe(200);
  } finally { await owner.dispose(); await other.dispose(); await publicContext.close(); }
});

test("admin publication succeeds with optional content unfinished after modal confirmation", async ({ page }) => {
  await login(page.request);
  const draft = { ...story("publication-requirements"), license_note: "Chờ giáo viên rà soát", questions: story("unused").questions.slice(0, 2) };
  expect((await page.request.post("/api/teacher/save", { headers, data: draft })).status()).toBe(200);
  await page.goto("/admin/truyen");
  await page.getByLabel("Tên truyện", { exact: true }).fill(draft.title_vi);
  await page.locator(".row-menu-trigger").click();
  await page.getByRole("button", { name: "Duyệt và xuất bản", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xuất bản", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Đã xuất bản.");
  await choose(page, "Đã hiểu");
  await expect(page.locator("tbody .status-badge")).toHaveText("Đã xuất bản");
  const saved = await (await page.request.get(`/api/teacher/content?slug=${draft.slug}`)).json();
  expect(saved.questions).toHaveLength(2); expect(saved.license_note).toBe(draft.license_note);
});

test("paired controls share dimensions and the visibility column stays centered on desktop and mobile", async ({ page }) => {
  test.setTimeout(180_000);
  await login(page.request);
  async function sameSize(labels: string[]) {
    const controls = labels.map(label => page.getByLabel(label, { exact: true }));
    for (const control of controls) await expect(control).toBeVisible({ timeout: 60_000 });
    const boxes = await Promise.all(controls.map(control => control.boundingBox()));
    expect(boxes.every(box => box?.height === 50)).toBe(true);
    expect(Math.max(...boxes.map(box => box!.y)) - Math.min(...boxes.map(box => box!.y))).toBeLessThan(1);
    expect(Math.max(...boxes.map(box => box!.width)) - Math.min(...boxes.map(box => box!.width))).toBeLessThan(1);
  }
  await page.goto("/admin/bien-tap-nguoi-dung");
  await sameSize(["Email", "Vai trò"]);
  await page.getByLabel("Email", { exact: true }).focus();
  expect(await page.getByLabel("Email", { exact: true }).evaluate(element => getComputedStyle(element).borderTopWidth)).toBe("1px");
  await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo({ top: 0, behavior: "instant" }); });
  await page.screenshot({ path: ".data/project-check/current-aligned-user-form.png", fullPage: true, animations: "disabled" });
  await page.goto("/admin/bien-tap");
  await sameSize(["Mã truyện (chữ thường, số, dấu -)", "Chủ đề"]);
  await sameSize(["Mức đọc", "Thời lượng (phút)"]);
  await page.goto("/admin/truyen");
  await sameSize(["Tên truyện", "Trạng thái", "Chủ đề", "Tác giả"]);
  const headings = page.locator(".stories-table thead th");
  await expect(headings.nth(3)).toHaveText("Hiển thị"); await expect(headings.nth(4)).toHaveText("Thao tác");
  async function centered() {
    const cells = page.locator(".stories-table tbody td.visibility-column");
    await expect(cells.first()).toBeVisible();
    const offsets = await cells.evaluateAll(elements => elements.map(element => {
      const cell = element.getBoundingClientRect(); const input = element.querySelector("input")!.getBoundingClientRect();
      return { x: Math.abs(cell.x + cell.width / 2 - input.x - input.width / 2), y: Math.abs(cell.y + cell.height / 2 - input.y - input.height / 2) };
    }));
    expect(offsets.every(offset => offset.x < 1 && offset.y < 1)).toBe(true);
    expect(await page.locator(".stories-table thead th.visibility-column").evaluate(element => getComputedStyle(element).textAlign)).toBe("center");
  }
  await centered();
  await page.screenshot({ path: ".data/project-check/current-story-visibility-desktop.png", fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await centered();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: ".data/project-check/current-story-visibility-mobile.png", fullPage: true, animations: "disabled" });
});
