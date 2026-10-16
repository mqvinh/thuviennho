import { test, expect, type APIRequestContext } from "@playwright/test";
const origin = "http://localhost:3100";
const headers = { Origin: origin };
const password = "Test-password-123!";
async function login(request: APIRequestContext, username = "test-admin") {
  expect((await request.post("/api/teacher/login", { headers, data: { username, password } })).status()).toBe(200);
}

test("library shows eight stories per page, topic tabs and search without topic dropdown", async ({ page }) => {
  await page.goto("/tu-sach");
  const cards = page.locator(".bookshelf .story-card");
  await expect(cards).toHaveCount(8);
  await expect(page.getByRole("combobox", { name: "Mức đọc", exact: true })).toHaveCount(0);
  const firstTitle = await cards.first().locator("h3").textContent();
  await page.getByRole("button", { name: "Trang 2", exact: true }).click();
  await expect(cards).toHaveCount(8);
  await expect(cards.first().locator("h3")).not.toHaveText(firstTitle!);
  await expect(page.getByRole("combobox", { name: "Chủ đề", exact: true })).toHaveCount(0);
  const theme = page.locator(".shelf-tabs button").nth(1);
  await theme.click();
  const expectedTheme = await theme.textContent();
  for (const card of await cards.all()) await expect(card.locator(".eyebrow")).toContainText(expectedTheme!);
  expect(await cards.count()).toBeLessThanOrEqual(8);
  await page.locator(".shelf-tabs button").first().click();
  await expect(page.locator('.shelf-tabs button[aria-pressed="true"]')).toContainText("Tất cả sách");
  await expect(page.getByRole("button", { name: "Trang 1", exact: true })).toHaveAttribute("aria-current", "page");
  await page.getByLabel("Tìm tên truyện", { exact: true }).fill("Tho con biet se chia");
  await expect(cards).toHaveCount(1);
  await page.getByLabel("Tìm tên truyện", { exact: true }).fill("missing-story-xyz");
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await expect(cards).toHaveCount(8);
  await expect(page.locator('.shelf-tabs button[aria-pressed="true"]')).toContainText("Tất cả sách");
});

test("personal account persists profile and cannot manage other users", async ({ page, request }) => {
  await login(request);
  await login(page.request, "test-teacher");
  const users = (await (await request.get("/api/teacher/accounts")).json()).users;
  const admin = users.find((item: { username: string }) => item.username === "test-admin");
  expect((await page.request.post("/api/teacher/accounts", { headers, data: { action: "profile", id: admin.id, role: "admin", full_name: "Giáo viên thử nghiệm", email: "teacher@example.com" } })).status()).toBe(200);
  expect((await page.request.get("/api/teacher/accounts")).status()).toBe(403);
  expect((await page.request.post("/api/teacher/accounts", { headers, data: { action: "create", username: "forbidden-user", password, role: "admin" } })).status()).toBe(403);
  expect((await page.request.post("/api/teacher/accounts", { headers, data: { action: "profile", full_name: "", email: "invalid" } })).status()).toBe(400);
  await page.goto("/admin/tai-khoan");
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.getByLabel("Họ và tên", { exact: true })).toHaveValue("Giáo viên thử nghiệm");
  await page.getByLabel("Họ và tên", { exact: true }).fill("Nguyễn Thị Giáo Viên Với Họ Tên Dài");
  await page.getByLabel("Email", { exact: true }).fill("updated@example.com");
  await page.getByRole("button", { name: "Lưu thông tin cá nhân", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Đã cập nhật thông tin cá nhân.");
  await page.getByRole("dialog").getByRole("button", { name: "Đã hiểu" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("updated@example.com");
  const currentUsers = (await (await request.get("/api/teacher/accounts")).json()).users;
  expect(currentUsers.find((item: { username: string }) => item.username === "test-teacher").role).toBe("teacher");
  expect(currentUsers.find((item: { id: string }) => item.id === admin.id).full_name).toBe(admin.full_name);
  await page.locator(".account-menu summary").click();
  await expect(page.locator(".account-dropdown").getByRole("link", { name: "Tài khoản", exact: true })).toBeVisible();
  await expect(page.locator(".account-dropdown").getByRole("link", { name: "Quản lý người dùng", exact: true })).toHaveCount(0);
  for (const url of ["/admin/nguoi-dung", "/admin/bien-tap-nguoi-dung", "/admin/chu-de", "/admin/bien-tap-chu-de"]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
  }
});

test("user creation and editing use separate pages and revoke sessions after permission changes", async ({ page, playwright }) => {
  await login(page.request);
  await page.goto("/admin/nguoi-dung");
  await expect(page.locator("main form")).toHaveCount(0);
  await page.getByRole("link", { name: "Tạo người dùng mới", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/bien-tap-nguoi-dung$/);
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("ui-teacher");
  await page.getByLabel("Họ và tên", { exact: true }).fill("Người dùng thử");
  await page.getByLabel("Email", { exact: true }).fill("ui@example.com");
  await page.getByLabel("Mật khẩu cấp mới", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Lưu người dùng", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/nguoi-dung\?saved=1$/);
  await page.getByRole("dialog").getByRole("button", { name: "Đã hiểu" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const row = page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "ui-teacher", exact: true }) });
  await expect(row).toContainText("ui@example.com");
  const teacher = await playwright.request.newContext({ baseURL: origin });
  try {
    await login(teacher, "ui-teacher");
    await row.getByRole("button", { name: "Thao tác ui-teacher", exact: true }).click();
    await page.locator(".row-dropdown").getByRole("link", { name: "Sửa người dùng", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/bien-tap-nguoi-dung\?id=/);
    await expect(page.getByLabel("Họ và tên", { exact: true })).toHaveValue("Người dùng thử");
    await page.getByLabel("Vai trò", { exact: true }).selectOption("admin");
    await page.getByLabel("Email", { exact: true }).fill("admin-ui@example.com");
    await page.getByRole("button", { name: "Lưu người dùng", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/nguoi-dung\?saved=1$/);
    await page.getByRole("dialog").getByRole("button", { name: "Đã hiểu" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(row).toContainText("Quản trị viên");
    await expect(row).toContainText("admin-ui@example.com");
    expect((await teacher.get("/api/teacher/content")).status()).toBe(401);
    const users = (await (await page.request.get("/api/teacher/accounts")).json()).users;
    const own = users.find((item: { username: string }) => item.username === "test-admin");
    const edited = users.find((item: { username: string }) => item.username === "ui-teacher");
    expect((await page.request.post("/api/teacher/accounts", { headers, data: { action: "update", id: edited.id, username: own.username, role: "admin", active: true } })).status()).toBe(409);
    expect((await page.request.post("/api/teacher/accounts", { headers, data: { action: "update", id: own.id, username: own.username, role: "teacher", active: true } })).status()).toBe(400);
  } finally { await teacher.dispose(); }
});

test("theme create and edit pages save changes without overwriting duplicate codes", async ({ page }) => {
  await login(page.request);
  await page.goto("/admin/chu-de");
  await expect(page.locator("main form")).toHaveCount(0);
  await page.getByRole("link", { name: "Tạo chủ đề mới", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/bien-tap-chu-de$/);
  await page.getByLabel("Mã chủ đề", { exact: true }).fill("ui-theme");
  await page.getByLabel("Tên chủ đề tiếng Việt", { exact: true }).fill("Chủ đề thử");
  await page.getByLabel("Tên chủ đề English", { exact: true }).fill("UI theme");
  await page.getByRole("button", { name: "Lưu chủ đề", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/chu-de\?saved=1$/);
  await page.getByRole("dialog").getByRole("button", { name: "Đã hiểu" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const row = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "ui-theme", exact: true }) });
  await row.getByRole("button", { name: "Thao tác Chủ đề thử", exact: true }).click();
  await page.locator(".row-dropdown").getByRole("link", { name: "Sửa", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/bien-tap-chu-de\?slug=ui-theme$/);
  await expect(page.getByLabel("Mã chủ đề", { exact: true })).toHaveAttribute("readonly", "");
  await expect(page.getByLabel("Tên chủ đề tiếng Việt", { exact: true })).toHaveValue("Chủ đề thử");
  await page.getByLabel("Tên chủ đề tiếng Việt", { exact: true }).fill("Chủ đề đã sửa");
  await page.getByRole("button", { name: "Lưu chủ đề", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/chu-de\?saved=1$/);
  await page.getByRole("dialog").getByRole("button", { name: "Đã hiểu" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(row).toContainText("Chủ đề đã sửa");
  expect((await page.request.post("/api/teacher/theme", { headers, data: { mode: "create", slug: "ui-theme", name_vi: "Duplicate", name_en: "Duplicate" } })).status()).toBe(409);
  expect((await page.request.post("/api/teacher/theme", { headers, data: { mode: "update", slug: "missing-theme", name_vi: "Missing", name_en: "Missing" } })).status()).toBe(404);
  await page.goto("/admin/bien-tap-chu-de?slug=missing-theme");
  await expect(page.locator("main").getByText("Không tìm thấy chủ đề.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lưu chủ đề", exact: true })).toHaveCount(0);
});
