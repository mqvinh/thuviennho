import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const origin = "http://localhost:3100";
const headers = { Origin: origin };
const password = "Test-password-123!";
async function login(request: APIRequestContext, username = "test-admin", pass = password) {
  expect((await request.post("/api/teacher/login", { headers, data: { username, password: pass } })).status()).toBe(200);
}
async function choose(page: Page, name: string) {
  await page.getByRole("dialog").getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}

test("unsaved theme form supports stay, invalid save, discard and save before navigation", async ({ page }) => {
  await login(page.request);
  await page.goto("/admin/chu-de");
  await page.getByRole("link", { name: "Tạo chủ đề mới", exact: true }).click();
  await page.getByLabel("Tên chủ đề tiếng Việt", { exact: true }).fill("Nội dung chưa lưu");
  await page.getByRole("link", { name: "← Quay lại", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Bạn có thay đổi chưa lưu");
  await page.screenshot({ path: ".data/project-check/current-unsaved-modal.png" });
  await choose(page, "Ở lại");
  await expect(page.getByLabel("Tên chủ đề tiếng Việt", { exact: true })).toHaveValue("Nội dung chưa lưu");
  await page.getByRole("link", { name: "← Quay lại", exact: true }).click();
  await choose(page, "Lưu và tiếp tục");
  await expect(page).toHaveURL(/bien-tap-chu-de$/);
  await expect(page.getByLabel("Mã chủ đề", { exact: true })).toBeFocused();
  await page.getByRole("link", { name: "← Quay lại", exact: true }).click();
  await choose(page, "Rời trang không lưu");
  await expect(page).toHaveURL(/\/admin\/chu-de$/);
  await page.getByRole("link", { name: "Tạo chủ đề mới", exact: true }).click();
  await page.getByLabel("Mã chủ đề", { exact: true }).fill("guard-theme");
  await page.getByLabel("Tên chủ đề tiếng Việt", { exact: true }).fill("Chủ đề đã lưu trước khi rời");
  await page.getByLabel("Tên chủ đề English", { exact: true }).fill("Saved before leaving");
  await page.getByRole("link", { name: "← Quay lại", exact: true }).click();
  await choose(page, "Lưu và tiếp tục");
  await expect(page).toHaveURL(/\/admin\/chu-de$/);
  const catalogue = await (await page.request.get("/api/teacher/content")).json();
  expect(catalogue.themes.find((item: { slug: string }) => item.slug === "guard-theme").name_en).toBe("Saved before leaving");
  await page.getByRole("link", { name: "Tạo chủ đề mới", exact: true }).click();
  await page.getByRole("link", { name: "← Quay lại", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/chu-de$/);
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("user form guards browser back and reload and preserves requested field order", async ({ page }) => {
  await login(page.request);
  await page.goto("/admin/nguoi-dung");
  await page.getByRole("link", { name: "Tạo người dùng mới", exact: true }).click();
  await expect(page.getByLabel("Tên đăng nhập", { exact: true })).toBeVisible();
  await expect(page.locator(".admin-navigation")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Hủy", exact: true })).toHaveCount(0);
  const labels = await page.locator("main form label").evaluateAll(items => items.map(item => item.firstChild?.textContent));
  expect(labels).toEqual(["Tên đăng nhập", "Mật khẩu cấp mới", "Họ và tên", "Email", "Vai trò", "Ảnh đại diện"]);
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("guard-user");
  await page.keyboard.press("F5");
  await expect(page.getByRole("dialog")).toContainText("Bạn có thay đổi chưa lưu");
  await choose(page, "Ở lại");
  await expect(page.getByLabel("Tên đăng nhập", { exact: true })).toHaveValue("guard-user");
  await page.evaluate(() => history.back());
  await expect(page.getByRole("dialog")).toContainText("Bạn có thay đổi chưa lưu");
  await choose(page, "Ở lại");
  await expect(page).toHaveURL(/bien-tap-nguoi-dung$/);
  await page.evaluate(() => history.back());
  await choose(page, "Rời trang không lưu");
  await expect(page).toHaveURL(/\/admin\/nguoi-dung$/);
  await page.evaluate(() => history.forward());
  await expect(page.getByLabel("Tên đăng nhập", { exact: true })).toHaveValue("");
  await page.getByRole("link", { name: "← Quay lại", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/nguoi-dung$/);
  await page.getByRole("link", { name: "Tạo người dùng mới", exact: true }).click();
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("guard-user");
  await page.getByLabel("Mật khẩu cấp mới", { exact: true }).fill(password);
  await page.getByLabel("Họ và tên", { exact: true }).fill("Người dùng lưu khi tải lại");
  await page.keyboard.press("Control+r");
  await choose(page, "Lưu và tiếp tục");
  await expect(page.getByLabel("Tên đăng nhập", { exact: true })).toHaveValue("");
  const users = (await (await page.request.get("/api/teacher/accounts")).json()).users;
  expect(users.find((item: { username: string }) => item.username === "guard-user").full_name).toBe("Người dùng lưu khi tải lại");
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("reload-discard");
  const beforeUnload = page.waitForEvent("dialog");
  await page.evaluate(() => { setTimeout(() => location.reload(), 0); });
  const browserWarning = await beforeUnload;
  expect(browserWarning.type()).toBe("beforeunload");
  await browserWarning.dismiss();
  await expect(page.getByLabel("Tên đăng nhập", { exact: true })).toHaveValue("reload-discard");
  await page.getByRole("link", { name: "← Quay lại", exact: true }).click();
  await choose(page, "Rời trang không lưu");
});

function wav() {
  const audio = Buffer.alloc(44 + 16000);
  audio.write("RIFF"); audio.writeUInt32LE(audio.length - 8, 4); audio.write("WAVE", 8);
  audio.write("fmt ", 12); audio.writeUInt32LE(16, 16); audio.writeUInt16LE(1, 20);
  audio.writeUInt16LE(1, 22); audio.writeUInt32LE(8000, 24); audio.writeUInt32LE(16000, 28);
  audio.writeUInt16LE(2, 32); audio.writeUInt16LE(16, 34); audio.write("data", 36);
  audio.writeUInt32LE(16000, 40);
  return { name: "preview.wav", mimeType: "audio/wav", buffer: audio };
}
const png = { name: "preview.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=", "base64") };
const story = {
  slug: "sortable-editor", theme_slug: "kindness-sharing", title_vi: "Truyện sắp xếp", title_en: "Sortable story",
  summary_vi: "Cùng đọc sách.", summary_en: "Read together.", reading_level: 1, estimated_minutes: 3,
  source_note: "Học liệu kiểm thử.", license_note: "Tự biên soạn.", cover_image_path: "",
  sentences: [1, 2].map(n => ({ text_vi: `Câu gốc ${n}`, text_en: `Original sentence ${n}`, audio_vi_path: "", audio_en_path: "" })),
  vocabulary: [1, 2].map(n => ({ word_vi: `Từ gốc ${n}`, word_en: `Word ${n}`, meaning_vi: `Nghĩa ${n}`, example_vi: "", pronunciation_path: "", illustration_path: "" })),
  questions: [1, 2].map(n => ({ question_vi: `Câu hỏi gốc ${n}`, question_en: "", kind: "choice", options: ["Có", "Không"], correct_option: 0, correct_order: [], explanation_vi: `Giải thích ${n}` })),
};

test("story cards collapse, add, scroll and drag with media and ordering persisted", async ({ page }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page.request);
  expect((await page.request.post("/api/teacher/save", { headers, data: story })).status()).toBe(200);
  await page.goto("/admin/bien-tap?slug=sortable-editor");
  await expect(page.locator(".editor-item")).toHaveCount(6);
  await expect(page.locator('.editor-item[data-expanded="true"]')).toHaveCount(0);
  await expect(page.locator(".media-image")).toHaveCount(0);
  await page.getByLabel("Ảnh bìa", { exact: true }).setInputFiles(png);
  await expect(page.locator('.media-field[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByAltText("Ảnh bìa đã chọn")).toBeVisible();
  const sentenceItems = page.locator('[data-item-group="sentences"]');
  await sentenceItems.first().locator(".editor-item-toggle").click();
  for (const label of ["Audio tiếng Việt", "Audio English"]) {
    await sentenceItems.first().getByLabel(label, { exact: true }).setInputFiles(wav());
    await expect(page.locator('.media-field[aria-busy="true"]')).toHaveCount(0);
    await expect.poll(() => sentenceItems.first().getByLabel(`Nghe thử ${label}`, { exact: true }).evaluate((element: HTMLAudioElement) => element.duration), { timeout: 60_000 }).toBe(1);
  }
  await page.locator("main h1").scrollIntoViewIfNeeded();
  await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo({ top: 0, behavior: "instant" }); });
  await page.screenshot({ path: ".data/project-check/current-story-editor-desktop.png", fullPage: true, animations: "disabled" });
  await sentenceItems.first().locator(".editor-item-toggle").click();
  const words = page.locator('[data-item-group="vocabulary"]');
  await words.first().locator(".editor-item-toggle").click();
  await words.first().getByLabel("Hình minh họa", { exact: true }).setInputFiles(png);
  await expect(page.locator('.media-field[aria-busy="true"]')).toHaveCount(0);
  await words.first().getByLabel("Phát âm", { exact: true }).setInputFiles(wav());
  await expect(page.locator('.media-field[aria-busy="true"]')).toHaveCount(0);
  await expect(words.first().getByAltText("Hình minh họa đã chọn")).toBeVisible();
  await expect(words.first().getByLabel("Nghe thử Phát âm", { exact: true })).toBeVisible();
  await words.first().locator(".editor-item-toggle").click();
  for (const group of ["sentences", "vocabulary", "questions"]) {
    const items = page.locator(`[data-item-group="${group}"]`);
    await items.first().scrollIntoViewIfNeeded();
    await items.nth(1).scrollIntoViewIfNeeded();
    await items.first().locator(".drag-handle").dragTo(items.nth(1).locator(".editor-item-toggle"), { steps: 12 });
    await expect(items.first().locator(".editor-item-title > span")).toContainText("gốc 2");
  }
  await page.getByRole("button", { name: "Thêm câu", exact: true }).click();
  await expect(sentenceItems).toHaveCount(3);
  await expect(sentenceItems.last()).toHaveAttribute("data-expanded", "true");
  await expect.poll(async () => { const box = await sentenceItems.last().locator(".editor-item-toggle").boundingBox(); return !!box && box.y >= 0 && box.y < page.viewportSize()!.height; }).toBe(true);
  await sentenceItems.last().getByLabel("Tiếng Việt", { exact: true }).fill("Câu được thêm");
  await sentenceItems.last().getByLabel("English", { exact: true }).fill("Added sentence");
  await page.getByRole("button", { name: "Lưu bản nháp", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Đã lưu bản nháp thành công.");
  await choose(page, "Đã hiểu");
  const saved = await (await page.request.get("/api/teacher/content?slug=sortable-editor")).json();
  expect(saved.sentences.map((item: { text_vi: string }) => item.text_vi)).toEqual(["Câu gốc 2", "Câu gốc 1", "Câu được thêm"]);
  expect(saved.sentences[1].audio_vi_path).toMatch(/\.wav$/);
  expect(saved.sentences[1].audio_en_path).toMatch(/\.wav$/);
  expect(saved.vocabulary.map((item: { word_vi: string }) => item.word_vi)).toEqual(["Từ gốc 2", "Từ gốc 1"]);
  expect(saved.vocabulary[1].illustration_path).toMatch(/\.png$/);
  expect(saved.vocabulary[1].pronunciation_path).toMatch(/\.wav$/);
  expect(saved.questions.map((item: { question_vi: string }) => item.question_vi)).toEqual(["Câu hỏi gốc 2", "Câu hỏi gốc 1"]);
  await expect(page.locator(".editor-item")).toHaveCount(7);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("main h1").scrollIntoViewIfNeeded();
  await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo({ top: 0, behavior: "instant" }); });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: ".data/project-check/current-story-editor-mobile.png", fullPage: true, animations: "disabled" });
  await page.getByRole("link", { name: "← Quay lại", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/truyen$/);
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("unified profile changes are atomic and admin optional password edits revoke sessions", async ({ page, playwright }) => {
  await login(page.request);
  expect((await page.request.post("/api/teacher/accounts", { headers, data: { action: "create", username: "profile-combined", password, role: "teacher", full_name: "Tên ban đầu", email: "before@example.com" } })).status()).toBe(200);
  const oldSession = await playwright.request.newContext({ baseURL: origin });
  const admin = await playwright.request.newContext({ baseURL: origin });
  try {
    await login(admin);
    await login(oldSession, "profile-combined");
    await login(page.request, "profile-combined");
    await page.goto("/admin/tai-khoan");
    await expect(page.locator("main form")).toHaveCount(1);
    await expect(page.getByLabel("Mật khẩu hiện tại", { exact: true })).toHaveCount(0);
    await page.getByLabel("Họ và tên", { exact: true }).fill("Tên mới");
    await page.getByLabel("Email", { exact: true }).fill("after@example.com");
    await page.getByLabel("Đổi mật khẩu", { exact: true }).check();
    await page.getByLabel("Mật khẩu hiện tại", { exact: true }).fill("incorrect-password");
    await page.getByLabel("Mật khẩu mới", { exact: true }).fill("Combined-password-123!");
    await page.getByLabel("Nhập lại mật khẩu mới", { exact: true }).fill("Combined-password-123!");
    await page.getByRole("button", { name: "Lưu thông tin cá nhân", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Mật khẩu hiện tại chưa đúng.");
    await choose(page, "Đã hiểu");
    const before = (await (await admin.get("/api/teacher/accounts")).json()).users.find((item: { username: string }) => item.username === "profile-combined");
    expect(before.full_name).toBe("Tên ban đầu");
    expect(before.email).toBe("before@example.com");
    expect((await oldSession.get("/api/teacher/content")).status()).toBe(200);
    await page.getByLabel("Mật khẩu hiện tại", { exact: true }).fill(password);
    await page.screenshot({ path: ".data/project-check/current-account-desktop.png", fullPage: true });
    await page.getByRole("button", { name: "Lưu thông tin cá nhân", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Đã lưu thông tin và đổi mật khẩu.");
    await choose(page, "Đã hiểu");
    await expect(page.getByLabel("Đổi mật khẩu", { exact: true })).not.toBeChecked();
    expect((await oldSession.get("/api/teacher/content")).status()).toBe(401);
    expect((await page.request.get("/api/teacher/content")).status()).toBe(200);
    await login(oldSession, "profile-combined", "Combined-password-123!");
    const update = { action: "update", id: before.id, username: "profile-combined", role: "teacher", active: true, full_name: "Tên mới", email: "after@example.com" };
    expect((await admin.post("/api/teacher/accounts", { headers, data: { ...update, password: "" } })).status()).toBe(200);
    expect((await oldSession.get("/api/teacher/content")).status()).toBe(200);
    expect((await admin.post("/api/teacher/accounts", { headers, data: { ...update, password: "Admin-edited-password-123!" } })).status()).toBe(200);
    expect((await oldSession.get("/api/teacher/content")).status()).toBe(401);
    await login(oldSession, "profile-combined", "Admin-edited-password-123!");
  } finally { await oldSession.dispose(); await admin.dispose(); }
});

test("AI input can be saved when leaving and restored without generating a story", async ({ page }) => {
  await login(page.request);
  await page.goto("/admin/ai");
  let generated = 0;
  page.on("request", request => { if (request.url().endsWith("/api/teacher/ai")) generated++; });
  await page.getByLabel("Chủ đề", { exact: true }).fill("Tình bạn ở lớp hai");
  await page.locator(".breadcrumbs").getByRole("link", { name: "Quản lý", exact: true }).click();
  await choose(page, "Lưu và tiếp tục");
  await expect(page).toHaveURL(/\/admin\/truyen$/);
  await page.goto("/admin/ai");
  await expect(page.getByLabel("Chủ đề", { exact: true })).toHaveValue("Tình bạn ở lớp hai");
  expect(generated).toBe(0);
});
