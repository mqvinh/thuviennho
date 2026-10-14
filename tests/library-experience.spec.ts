import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

const origin = "http://localhost:3100", headers = { Origin: origin }, password = "Test-password-123!";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=", "base64");
async function login(request: APIRequestContext, username = "test-admin") {
  expect((await request.post("/api/teacher/login", { headers, data: { username, password } })).status()).toBe(200);
}
async function acknowledge(page: Page) {
  await page.getByRole("dialog").getByRole("button", { name: "Đã hiểu", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
async function upload(request: APIRequestContext) {
  const response = await request.post("/api/teacher/upload", { headers: { ...headers, "Content-Type": "image/png" }, data: png });
  expect(response.status()).toBe(200); return (await response.json()).path as string;
}

test("newest-created stories lead the list while edits keep their original creation date", async ({ page }) => {
  await login(page.request);
  const older = { slug: "experience-older", title_vi: "A — Truyện tạo trước", title_en: "Older story" };
  const newer = { slug: "experience-newer", title_vi: "Z — Truyện tạo sau", title_en: "Newer story" };
  for (const data of [older, newer]) expect((await page.request.post("/api/teacher/save", { headers, data })).status()).toBe(200);
  const firstSaved = await (await page.request.get("/api/teacher/content?slug=" + older.slug)).json();
  expect(firstSaved.created_at).toBeTruthy();
  expect((await page.request.post("/api/teacher/save", { headers, data: { ...older, title_vi: "Truyện tạo trước được sửa sau" } })).status()).toBe(200);
  const edited = await (await page.request.get("/api/teacher/content?slug=" + older.slug)).json();
  expect(edited.created_at).toBe(firstSaved.created_at);
  const list = (await (await page.request.get("/api/teacher/content")).json()).stories;
  expect(list.slice(0, 2).map((story: { slug: string }) => story.slug)).toEqual([newer.slug, older.slug]);
  await page.goto("/admin/truyen");
  await expect(page.locator("tbody tr").first()).toContainText(newer.title_vi);
});

test("teachers withdraw pending reviews and admins unpublish with state-aware menus and stale-update protection", async ({ page, playwright }) => {
  const admin = await playwright.request.newContext({ baseURL: origin });
  try {
    await login(admin); await login(page.request, "test-teacher");
    const story = { slug: "experience-review", title_vi: "Truyện kiểm tra luồng duyệt", title_en: "Review workflow" };
    expect((await page.request.post("/api/teacher/save", { headers, data: story })).status()).toBe(200);
    await page.goto("/admin/truyen"); await page.getByLabel("Tên truyện", { exact: true }).fill(story.title_vi);
    await page.locator(".row-menu-trigger").click();
    await page.getByRole("button", { name: "Gửi duyệt", exact: true }).click(); await acknowledge(page);
    await expect(page.locator("tbody .status-badge")).toHaveText("Chờ duyệt");
    await page.locator(".row-menu-trigger").click();
    await expect(page.getByRole("button", { name: "Gửi duyệt", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Rút yêu cầu duyệt", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Rút yêu cầu duyệt", exact: true }).click(); await acknowledge(page);
    await expect(page.locator("tbody .status-badge")).toHaveText("Nháp");
    await page.locator(".row-menu-trigger").click(); await page.getByRole("button", { name: "Gửi duyệt", exact: true }).click(); await acknowledge(page);
    expect((await admin.post("/api/teacher/status", { headers, data: { slug: story.slug, status: "published", reviewed: true, expected_status: "pending" } })).status()).toBe(200);
    expect((await page.request.post("/api/teacher/status", { headers, data: { slug: story.slug, status: "draft", expected_status: "pending" } })).status()).toBe(403);
    await page.reload(); await page.getByLabel("Tên truyện", { exact: true }).fill(story.title_vi); await page.locator(".row-menu-trigger").click();
    await expect(page.locator(".row-dropdown").getByRole("button", { name: "Rút yêu cầu duyệt", exact: true })).toHaveCount(0);
    await login(page.request); await page.goto("/admin/truyen"); await page.getByLabel("Tên truyện", { exact: true }).fill(story.title_vi);
    await page.locator(".row-menu-trigger").click();
    await expect(page.getByRole("button", { name: "Duyệt và xuất bản", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Gỡ xuất bản", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Gỡ xuất bản", exact: true }).click(); await acknowledge(page);
    await expect(page.locator("tbody .status-badge")).toHaveText("Nháp");
    const saved = await (await page.request.get("/api/teacher/content?slug=" + story.slug)).json();
    expect(saved.is_published).toBe(false); expect(saved.is_visible).toBe(true);
    expect((await admin.post("/api/teacher/status", { headers, data: { slug: story.slug, status: "draft", expected_status: "published" } })).status()).toBe(409);
    await page.locator(".row-menu-trigger").click(); await expect(page.getByRole("button", { name: "Duyệt và xuất bản", exact: true })).toBeVisible();
  } finally { await admin.dispose(); }
});

test("admin-created avatars survive profile updates, remain private and can be replaced or removed", async ({ page, playwright }) => {
  await login(page.request);
  const member = await playwright.request.newContext({ baseURL: origin });
  const stranger = await playwright.request.newContext({ baseURL: origin });
  try {
    const image = await upload(page.request);
    await page.goto("/admin/bien-tap-nguoi-dung");
    await page.getByLabel("Tên đăng nhập", { exact: true }).fill("avatar-experience");
    await page.getByLabel("Mật khẩu cấp mới", { exact: true }).fill(password);
    await page.getByLabel("Ảnh đại diện", { exact: true }).setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: png });
    await expect(page.locator('.media-field[aria-busy="true"]')).toHaveCount(0);
    await expect(page.locator(".media-image img")).toBeVisible();
    await page.getByRole("button", { name: "Lưu người dùng", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/nguoi-dung\?saved=1$/); await acknowledge(page);
    const account = (await (await page.request.get("/api/teacher/accounts")).json()).users.find((user: { username: string }) => user.username === "avatar-experience");
    expect(account.avatar_path).toMatch(/^\/media\/.+\.png$/);
    await login(member, account.username); await login(stranger, "other-teacher");
    expect((await member.get(account.avatar_path)).status()).toBe(200);
    expect((await stranger.get(account.avatar_path)).status()).toBe(404);
    expect((await stranger.post("/api/teacher/accounts", { headers, data: { action: "profile", avatar_path: account.avatar_path } })).status()).toBe(403);
    expect((await member.post("/api/teacher/accounts", { headers, data: { action: "profile", full_name: "Tên mới", avatar_path: account.avatar_path } })).status()).toBe(200);
    expect((await member.post("/api/teacher/accounts", { headers, data: { action: "profile", avatar_path: image } })).status()).toBe(403);
    expect((await member.post("/api/teacher/accounts", { headers, data: { action: "profile", avatar_path: "https://example.com/avatar.png" } })).status()).toBe(400);
    await page.goto("/admin/bien-tap-nguoi-dung?id=" + account.id);
    await expect(page.locator(".media-image img")).toHaveAttribute("src", account.avatar_path);
    const update = { action: "update", id: account.id, username: account.username, full_name: "Tên mới", email: "", active: true, role: "teacher" };
    expect((await page.request.post("/api/teacher/accounts", { headers, data: update })).status()).toBe(200);
    expect((await (await page.request.get("/api/teacher/accounts")).json()).users.find((user: { id: string }) => user.id === account.id).avatar_path).toBe(account.avatar_path);
    await login(page.request, account.username); await page.goto("/admin/tai-khoan");
    const headerImage = page.locator(".account-avatar img");
    await expect(headerImage).toHaveAttribute("src", account.avatar_path);
    for (const width of [1280, 390]) { await page.setViewportSize({ width, height: 900 }); await expect(headerImage).toBeVisible(); expect(await headerImage.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0); }
    await page.getByLabel("Ảnh đại diện", { exact: true }).setInputFiles({ name: "replacement.png", mimeType: "image/png", buffer: png });
    await expect(page.locator('.media-field[aria-busy="true"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Lưu thông tin cá nhân", exact: true }).click(); await acknowledge(page);
    await expect(headerImage).not.toHaveAttribute("src", account.avatar_path);
    await page.getByRole("button", { name: "Bỏ tệp", exact: true }).click();
    await page.getByRole("button", { name: "Lưu thông tin cá nhân", exact: true }).click(); await acknowledge(page);
    await expect(headerImage).toHaveCount(0); await expect(page.locator(".account-avatar")).toHaveText("T");
  } finally { await member.dispose(); await stranger.dispose(); }
});
