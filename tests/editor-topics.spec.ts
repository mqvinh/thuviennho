import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
const origin = "http://localhost:3100";
const headers = { Origin: origin };
async function login(request: APIRequestContext, username = "test-admin") {
  expect((await request.post("/api/teacher/login", { headers, data: { username, password: "Test-password-123!" } })).status()).toBe(200);
}
async function choose(page: Page, label: string) {
  await page.getByRole("dialog").getByRole("button", { name: label, exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
function story(slug: string, count = 4) {
  return {
    slug, theme_slug: "kindness-sharing", title_vi: `Truyện ${slug}`, title_en: "Editor workflow",
    summary_vi: "Cùng đọc sách.", summary_en: "Read together.", reading_level: 1, estimated_minutes: 3,
    source_note: "Học liệu kiểm thử.", license_note: "Tự biên soạn.", cover_image_path: "",
    sentences: Array.from({ length: count }, (_, index) => ({ text_vi: `Câu số ${index + 1}.`, text_en: `Sentence ${index + 1}.`, audio_vi_path: "", audio_en_path: "" })),
    vocabulary: Array.from({ length: count }, (_, index) => ({ word_vi: `Từ số ${index + 1}`, word_en: `Word ${index + 1}`, meaning_vi: `Nghĩa ${index + 1}.`, example_vi: "", pronunciation_path: "", illustration_path: "" })),
    questions: Array.from({ length: count }, (_, index) => ({ question_vi: `Câu hỏi số ${index + 1}?`, question_en: "", kind: "choice" as "choice" | "order", options: ["Việc 1", "Việc 2", "Việc 3"], correct_option: 0, correct_order: [0, 1, 2], explanation_vi: `Giải thích ${index + 1}.` })),
  };
}

test("all content groups support buttons, mouse and touch reordering, header deletion and persisted public order", async ({ page }) => {
  test.setTimeout(240_000);
  await login(page.request);
  const draft = story("editor-order-and-delete");
  expect((await page.request.post("/api/teacher/save", { headers, data: draft })).status()).toBe(200);
  await page.goto(`/admin/bien-tap?slug=${draft.slug}`);
  await expect(page.locator(".editor-item")).toHaveCount(12, { timeout: 60_000 });
  for (const group of ["sentences", "vocabulary", "questions"]) {
    const items = page.locator(`[data-item-group="${group}"]`);
    await items.first().getByRole("button", { name: / xuống$/ }).click();
    await expect(items.first().locator(".editor-item-title > span")).toContainText("số 2");
    await items.nth(1).getByRole("button", { name: / lên$/ }).click();
    await expect(items.first().locator(".editor-item-title > span")).toContainText("số 1");
    await items.first().locator(".editor-item-toggle").click();
    await items.first().getByRole("button", { name: / xuống$/ }).click();
    await expect(items.nth(1)).toHaveAttribute("data-expanded", "true");
    await items.nth(1).locator(".editor-item-toggle").click();
    await items.first().locator(".editor-item-heading").scrollIntoViewIfNeeded();
    await items.last().locator(".editor-item-heading").scrollIntoViewIfNeeded();
    await items.last().locator(".drag-handle").dragTo(items.first().locator(".editor-item-toggle"), { steps: 12 });
    await expect(items.first().locator(".editor-item-title > span")).toContainText("số 4");
  }
  // Real touch input exercises pointer capture rather than synthetic drag events.
  await page.setViewportSize({ width: 390, height: 844 });
  const sentences = page.locator('[data-item-group="sentences"]');
  await sentences.first().evaluate(element => element.parentElement!.scrollIntoView({ block: "center", behavior: "instant" }));
  const start = (await sentences.first().locator(".drag-handle").boundingBox())!;
  const destination = (await sentences.nth(2).locator(".editor-item-toggle").boundingBox())!;
  const touch = await page.context().newCDPSession(page);
  const x = start.x + start.width / 2, y = start.y + start.height / 2;
  await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 0 }] });
  for (let step = 1; step <= 12; step++) await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (destination.x + destination.width / 2 - x) * step / 12, y: y + (destination.y + destination.height / 2 - y) * step / 12, id: 0 }] });
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await touch.detach();
  await expect(sentences.nth(2).locator(".editor-item-title > span")).toContainText("số 4");
  await sentences.nth(2).locator(".drag-handle").focus();
  await page.keyboard.press("ArrowUp"); await page.keyboard.press("ArrowUp");
  await expect(sentences.first().locator(".editor-item-title > span")).toContainText("số 4");
  for (const group of ["sentences", "vocabulary", "questions"]) {
    const items = page.locator(`[data-item-group="${group}"]`);
    await items.last().getByRole("button", { name: /^Xóa / }).click();
    await expect(items).toHaveCount(3);
    await expect(items.locator(".editor-item-title > span")).toHaveText(group === "sentences" ? ["Câu số 4.", "Câu số 2.", "Câu số 1."] : group === "vocabulary" ? ["Từ số 4", "Từ số 2", "Từ số 1"] : ["Câu hỏi số 4?", "Câu hỏi số 2?", "Câu hỏi số 1?"]);
  }
  await expect(page.locator(".item-caret")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo({ top: 0, behavior: "instant" }); });
  await page.screenshot({ path: ".data/project-check/current-editor-controls-mobile.png", fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "Lưu bản nháp", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Đã lưu bản nháp thành công."); await choose(page, "Đã hiểu");
  const saved = await (await page.request.get(`/api/teacher/content?slug=${draft.slug}`)).json();
  expect(saved.sentences.map((item: { text_vi: string }) => item.text_vi)).toEqual(["Câu số 4.", "Câu số 2.", "Câu số 1."]);
  expect(saved.vocabulary.map((item: { word_vi: string }) => item.word_vi)).toEqual(["Từ số 4", "Từ số 2", "Từ số 1"]);
  expect(saved.questions.map((item: { question_vi: string }) => item.question_vi)).toEqual(["Câu hỏi số 4?", "Câu hỏi số 2?", "Câu hỏi số 1?"]);
  expect((await page.request.post("/api/teacher/status", { headers, data: { slug: draft.slug, status: "published", reviewed: true } })).status()).toBe(200);
  await page.goto(`/doc/${draft.slug}`);
  await expect(page.locator('.sentence p[lang="vi"]')).toHaveText(["Câu số 4.", "Câu số 2.", "Câu số 1."]);
  await expect(page.locator("#vocabulary h3")).toHaveText(["Từ số 4 · Word 4", "Từ số 2 · Word 2", "Từ số 1 · Word 1"]);
  await expect(page.locator(".quiz-question legend")).toHaveText(["1. Câu hỏi số 4?", "2. Câu hỏi số 2?", "3. Câu hỏi số 1?"]);
  // Clearing the final items can be saved as a draft; publication still requires content.
  await page.goto(`/admin/bien-tap?slug=${draft.slug}`);
  await expect(page.locator(".editor-item")).toHaveCount(9);
  for (const group of ["sentences", "vocabulary", "questions"]) {
    const items = page.locator(`[data-item-group="${group}"]`);
    for (let left = 3; left > 0; left--) { await items.first().getByRole("button", { name: /^Xóa / }).click(); await expect(items).toHaveCount(left - 1); }
  }
  await page.getByRole("button", { name: "Lưu bản nháp", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Đã lưu bản nháp thành công."); await choose(page, "Đã hiểu");
  const cleared = await (await page.request.get(`/api/teacher/content?slug=${draft.slug}`)).json();
  expect(cleared.sentences).toEqual([]); expect(cleared.vocabulary).toEqual([]); expect(cleared.questions).toEqual([]);
  expect((await page.request.post("/api/teacher/status", { headers, data: { slug: draft.slug, status: "published", reviewed: true } })).status()).toBe(400);
});

test("question counts resize choices and order answers safely and work in the public quiz", async ({ page }) => {
  test.setTimeout(180_000);
  await login(page.request);
  const draft = story("question-count-controls", 3); draft.questions[0].kind = "order"; draft.questions[0].correct_order = [2, 0, 1];
  expect((await page.request.post("/api/teacher/save", { headers, data: draft })).status()).toBe(200);
  await page.goto(`/admin/bien-tap?slug=${draft.slug}`);
  const questions = page.locator('[data-item-group="questions"]');
  await expect(questions).toHaveCount(3, { timeout: 60_000 });
  await questions.first().locator(".editor-item-toggle").click();
  const first = questions.first();
  await first.getByLabel("Số lựa chọn", { exact: true }).selectOption("5");
  await expect(first.locator('.answer-order-grid select')).toHaveCount(5);
  await expect(first.getByLabel("Lựa chọn 1", { exact: true })).toHaveValue("Việc 1");
  await first.getByLabel("Lựa chọn 4", { exact: true }).fill("Việc 4"); await first.getByLabel("Lựa chọn 5", { exact: true }).fill("Việc 5");
  await first.getByLabel("Vị trí 1", { exact: true }).selectOption("3");
  await expect(first.getByLabel("Vị trí 4", { exact: true })).toHaveValue("2");
  const countBox = (await first.getByLabel("Số lựa chọn", { exact: true }).boundingBox())!, kindBox = (await first.getByLabel("Loại", { exact: true }).boundingBox())!;
  expect(countBox.y).toBe(kindBox.y); expect(countBox.height).toBe(kindBox.height);
  await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo({ top: 0, behavior: "instant" }); });
  await page.screenshot({ path: ".data/project-check/current-question-count-controls.png", fullPage: true, animations: "disabled" });
  await first.locator(".editor-item-toggle").click();
  const second = questions.nth(1); await second.locator(".editor-item-toggle").click();
  await second.getByLabel("Số lựa chọn", { exact: true }).selectOption("4");
  await expect(second.getByLabel("Đáp án đúng", { exact: true }).locator("option")).toHaveCount(4);
  await second.getByLabel("Đáp án đúng", { exact: true }).selectOption("3");
  await second.getByLabel("Số lựa chọn", { exact: true }).selectOption("2");
  await expect(second.getByLabel("Đáp án đúng", { exact: true })).toHaveValue("1");
  await expect(second.getByLabel("Lựa chọn 3", { exact: true })).toHaveCount(0);
  await second.getByLabel("Loại", { exact: true }).selectOption("order");
  await expect(second.locator('.answer-order-grid select')).toHaveCount(2);
  await second.getByLabel("Loại", { exact: true }).selectOption("choice");
  await second.locator(".editor-item-toggle").click();
  await page.getByRole("button", { name: "Thêm câu hỏi", exact: true }).click();
  const added = questions.last(); await expect(added.getByLabel("Số lựa chọn", { exact: true })).toHaveValue("3");
  await expect(added.getByLabel("Số lựa chọn", { exact: true }).locator('option[value="1"]')).toHaveCount(0);
  await added.getByLabel("Câu hỏi tiếng Việt", { exact: true }).fill("Câu hỏi mới?");
  for (let index = 1; index <= 3; index++) await added.getByLabel(`Lựa chọn ${index}`, { exact: true }).fill(`Mới ${index}`);
  await added.getByLabel("Giải thích", { exact: true }).fill("Câu hỏi mới đã được kiểm tra.");
  await page.getByRole("button", { name: "Lưu bản nháp", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Đã lưu bản nháp thành công."); await choose(page, "Đã hiểu");
  const saved = await (await page.request.get(`/api/teacher/content?slug=${draft.slug}`)).json();
  expect(saved.questions[0].correct_order).toEqual([3, 0, 1, 2, 4]); expect(saved.questions[0].options).toHaveLength(5);
  expect(saved.questions[1].options).toHaveLength(2); expect(saved.questions[1].correct_option).toBe(1);
  expect(saved.questions[3].options).toHaveLength(3);
  expect((await page.request.post("/api/teacher/status", { headers, data: { slug: draft.slug, status: "published", reviewed: true } })).status()).toBe(200);
  await page.goto(`/doc/${draft.slug}`);
  const publicQuestions = page.locator(".quiz-question");
  await expect(publicQuestions.first().locator(".order-item")).toHaveCount(5);
  for (let step = 0; step < 3; step++) await publicQuestions.first().getByRole("button", { name: "Đưa lên: Việc 4", exact: true }).click();
  await publicQuestions.nth(1).getByRole("radio", { name: "Việc 2", exact: true }).check();
  await publicQuestions.nth(2).getByRole("radio", { name: "Việc 1", exact: true }).check();
  await publicQuestions.nth(3).getByRole("radio", { name: "Mới 1", exact: true }).check();
  await page.getByRole("button", { name: "Kiểm tra bài làm", exact: true }).click();
  await expect(publicQuestions.locator('[role="status"]')).toHaveCount(4);
  await expect(publicQuestions.locator('[role="status"]')).toContainText(["Em làm tốt lắm!", "Em làm tốt lắm!", "Em làm tốt lắm!", "Em làm tốt lắm!"]);
});

test("theme deletion warns about usage, keeps stories with null themes and preserves public access", async ({ page, playwright }) => {
  test.setTimeout(180_000);
  await login(page.request);
  const teacher = await playwright.request.newContext({ baseURL: origin }); await login(teacher, "test-teacher");
  try {
    for (const slug of ["theme-delete-used", "theme-delete-unused"]) {
      expect([200, 404]).toContain((await page.request.post("/api/teacher/theme", { headers, data: { mode: "delete", slug, confirm_used: true } })).status());
      expect((await page.request.post("/api/teacher/theme", { headers, data: { mode: "create", slug, name_vi: slug === "theme-delete-used" ? "Chủ đề đang dùng" : "Chủ đề chưa dùng", name_en: slug } })).status()).toBe(200);
    }
    const published = { ...story("theme-deletion-public", 3), theme_slug: "theme-delete-used" };
    const privateDraft = { ...story("theme-deletion-private", 3), theme_slug: "theme-delete-used" };
    for (const draft of [published, privateDraft]) expect((await page.request.post("/api/teacher/save", { headers, data: draft })).status()).toBe(200);
    expect((await page.request.post("/api/teacher/status", { headers, data: { slug: published.slug, status: "published", reviewed: true } })).status()).toBe(200);
    expect((await teacher.post("/api/teacher/theme", { headers, data: { mode: "delete", slug: "theme-delete-unused", confirm_used: true } })).status()).toBe(403);
    const blocked = await page.request.post("/api/teacher/theme", { headers, data: { mode: "delete", slug: "theme-delete-used" } });
    expect(blocked.status()).toBe(409); expect((await blocked.json()).story_count).toBe(2);
    await page.goto("/admin/chu-de");
    const row = page.locator("tbody tr").filter({ hasText: "Chủ đề đang dùng" });
    await row.locator(".row-menu-trigger").click(); await page.locator(".row-dropdown").getByRole("button", { name: "Xóa", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("đang được dùng cho 2 truyện"); await choose(page, "Hủy");
    expect((await (await page.request.get(`/api/teacher/content?slug=${published.slug}`)).json()).theme_slug).toBe("theme-delete-used");
    await row.locator(".row-menu-trigger").click(); await page.locator(".row-dropdown").getByRole("button", { name: "Xóa", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Xóa chủ đề", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Đã xóa chủ đề."); await choose(page, "Đã hiểu");
    await expect(row).toHaveCount(0);
    for (const slug of [published.slug, privateDraft.slug]) { const saved = await (await page.request.get(`/api/teacher/content?slug=${slug}`)).json(); expect(saved.theme_id).toBeNull(); expect(saved.theme_slug).toBeNull(); expect(saved.sentences).toHaveLength(3); expect(saved.review_status).toBe(slug === published.slug ? "published" : "draft"); }
    await page.goto(`/doc/${published.slug}`); await expect(page.locator("main h1")).toHaveText(published.title_vi);
    await expect(page.locator(".story-header .eyebrow")).toContainText("Chưa phân chủ đề");
    await page.goto(`/admin/xem-thu/${privateDraft.slug}`); await expect(page.getByRole("heading", { name: privateDraft.title_vi, exact: true })).toBeVisible();
    await page.goto(`/admin/bien-tap?slug=${privateDraft.slug}`); await expect(page.getByLabel("Chủ đề", { exact: true })).toHaveValue("", { timeout: 60_000 });
    await page.getByRole("button", { name: "Lưu bản nháp", exact: true }).click(); await expect(page.getByRole("dialog")).toContainText("Đã lưu bản nháp thành công."); await choose(page, "Đã hiểu");
    await page.goto("/tu-sach"); await page.getByLabel("Tìm tên truyện", { exact: true }).fill(published.title_vi); await expect(page.locator(".bookshelf .story-card")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Chủ đề đang dùng", exact: true })).toHaveCount(0);
    await page.goto("/admin/chu-de"); const unused = page.locator("tbody tr").filter({ hasText: "Chủ đề chưa dùng" });
    await unused.locator(".row-menu-trigger").click(); await page.locator(".row-dropdown").getByRole("button", { name: "Xóa", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Xóa chủ đề", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Đã xóa chủ đề."); await choose(page, "Đã hiểu"); await expect(unused).toHaveCount(0);
  } finally { await teacher.dispose(); }
});

test("account and website settings menu positions and every management form footer align left", async ({ page }) => {
  test.setTimeout(180_000); await login(page.request);
  await page.goto("/admin/truyen"); await page.locator(".account-menu summary").click();
  const links = page.locator(".account-dropdown a"); await expect(links.first()).toHaveText("Tài khoản"); await expect(links.last()).toHaveText("Cài đặt website");
  await expect(page.locator(".account-dropdown > :last-child")).toHaveText("Đăng xuất");
  for (const route of ["bien-tap", "bien-tap-chu-de", "bien-tap-nguoi-dung", "tai-khoan", "cai-dat", "ai"]) {
    await page.goto(`/admin/${route}`); await expect(page.locator("main form")).toHaveCount(1, { timeout: 60_000 });
    if (route === "ai") expect(await page.getByRole("button", { name: "Tạo bản nháp AI", exact: true }).evaluate(element => getComputedStyle(element).justifySelf)).toBe("start");
    else { const actions = page.locator("main form .actions").last(); await expect(actions).toBeVisible(); expect(await actions.evaluate(element => getComputedStyle(element).justifyContent)).toBe("flex-start"); }
  }
});
