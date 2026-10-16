import { test, expect, type APIRequestContext } from "@playwright/test";

const headers = { Origin: "http://localhost:3100" };
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=", "base64");
async function login(request: APIRequestContext, username = "test-admin") {
  expect((await request.post("/api/teacher/login", { headers, data: { username, password: "Test-password-123!" } })).status()).toBe(200);
}
async function save(request: APIRequestContext, data: Record<string, unknown>, publish = true) {
  const response = await request.post("/api/teacher/save", { headers, data });
  expect(response.status(), await response.text()).toBe(200);
  if (publish) expect((await request.post("/api/teacher/status", { headers, data: { slug: data.slug, status: "published", reviewed: true } })).status()).toBe(200);
}
async function upload(request: APIRequestContext, data: Buffer, type: string) {
  const response = await request.post("/api/teacher/upload", { headers: { ...headers, "Content-Type": type }, data });
  expect(response.status()).toBe(200);
  return (await response.json()).path as string;
}
function wav() {
  const data = Buffer.alloc(44 + 16000);
  data.write("RIFF"); data.writeUInt32LE(data.length - 8, 4); data.write("WAVE", 8); data.write("fmt ", 12);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(8000, 24);
  data.writeUInt32LE(16000, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write("data", 36); data.writeUInt32LE(16000, 40);
  return data;
}

test("theme icons are migrated, editable, preserved, public and admin only", async ({ page, playwright }) => {
  await login(page.request);
  const catalog = await (await page.request.get("/api/teacher/content")).json();
  for (const slug of ["kindness-sharing", "family", "nature", "good-habits", "school", "friendship"]) {
    expect(catalog.themes.find((item: { slug: string }) => item.slug === slug).icon_path).toBe(`/images/themes/${slug}.png`);
  }
  const image = await upload(page.request, png, "image/png");
  const theme = { slug: "catalog-image-topic", name_vi: "Chủ đề ảnh", name_en: "Image topic" };
  expect((await page.request.post("/api/teacher/theme", { headers, data: { mode: "create", ...theme, icon_path: image } })).status()).toBe(200);
  const anonymous = await playwright.request.newContext({ baseURL: headers.Origin });
  try {
    expect((await anonymous.get(image)).status()).toBe(200);
    await login(anonymous, "test-teacher");
    expect((await anonymous.post("/api/teacher/theme", { headers, data: { mode: "update", ...theme, icon_path: "" } })).status()).toBe(403);
    expect((await page.request.post("/api/teacher/theme", { headers, data: { mode: "update", ...theme } })).status()).toBe(200);
    const updated = await (await page.request.get("/api/teacher/content")).json();
    expect(updated.themes.find((item: { slug: string }) => item.slug === theme.slug).icon_path).toBe(image);
    expect((await page.request.post("/api/teacher/theme", { headers, data: { mode: "update", ...theme, icon_path: "https://example.com/icon.png" } })).status()).toBe(400);
    await page.goto("/admin/bien-tap-chu-de?slug=" + theme.slug);
    await expect(page.getByAltText("Icon chủ đề đã chọn")).toHaveAttribute("src", image);
    await page.getByRole("button", { name: "Bỏ tệp", exact: true }).click();
    await page.getByRole("button", { name: "Lưu chủ đề", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Đã hiểu", exact: true }).click();
    const cleared = await (await page.request.get("/api/teacher/content")).json();
    expect(cleared.themes.find((item: { slug: string }) => item.slug === theme.slug).icon_path).toBeNull();
    await page.goto("/admin/bien-tap-chu-de?slug=" + theme.slug);
    await page.getByLabel("Tên chủ đề English", { exact: true }).fill("No icon edited");
    await page.getByRole("button", { name: "Lưu chủ đề", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Đã lưu chủ đề.");
  } finally { await anonymous.dispose(); }
});

test("audio and quiz shelves require actual activity content and retain publication and visibility filters", async ({ page }) => {
  await login(page.request);
  const audio = await upload(page.request, wav(), "audio/wav");
  const base = { theme_slug: "family", title_en: "Catalogue activity", questions: [], sentences: [{ text_vi: "Em mở sách.", text_en: "I open a book." }] };
  const question = { question_vi: "Em làm gì?", kind: "choice", options: ["Mở sách", "Đi ngủ"], correct_option: 0 };
  const stories = [
    { slug: "catalog-plain", title_vi: "Bộ lọc chỉ có chữ" },
    { slug: "catalog-vi", title_vi: "Bộ lọc audio Việt", sentences: [{ ...base.sentences[0], audio_vi_path: audio }] },
    { slug: "catalog-en", title_vi: "Bộ lọc audio Anh", sentences: [{ ...base.sentences[0], audio_en_path: audio }] },
    { slug: "catalog-quiz", title_vi: "Bộ lọc có câu hỏi", questions: [question] },
    { slug: "catalog-hidden", title_vi: "Bộ lọc đang ẩn", sentences: [{ ...base.sentences[0], audio_vi_path: audio }], questions: [question] },
    { slug: "catalog-draft", title_vi: "Bộ lọc bản nháp", sentences: [{ ...base.sentences[0], audio_vi_path: audio }], questions: [question] },
  ];
  for (const story of stories) await save(page.request, { ...base, ...story }, story.slug !== "catalog-draft");
  expect((await page.request.post("/api/teacher/visibility", { headers, data: { slug: "catalog-hidden", is_visible: false } })).status()).toBe(200);
  await page.goto("/nghe-sach");
  await page.getByLabel("Tìm tên truyện").fill("Bộ lọc");
  await expect(page.locator(".bookshelf .story-card h3")).toHaveText(["Bộ lọc audio Anh", "Bộ lọc audio Việt"]);
  await expect(page.locator('.bookshelf a.button[href="/doc/catalog-en#audio"]')).toHaveText("Nghe truyện");
  await page.goto("/thu-tai");
  await page.getByLabel("Tìm tên truyện").fill("Bộ lọc");
  await expect(page.locator(".bookshelf .story-card h3")).toHaveText(["Bộ lọc có câu hỏi"]);
  await expect(page.locator('.bookshelf a.button[href="/doc/catalog-quiz#quiz"]')).toHaveText("Bắt đầu thử tài");
  await page.getByLabel("Tìm tên truyện").fill("Không có kết quả này");
  await expect(page.getByRole("heading", { name: "Chưa tìm thấy truyện phù hợp" })).toBeVisible();
});

test("global vocabulary combines word search, story and favorites with six equal-height cards per page", async ({ page }) => {
  test.setTimeout(240_000);
  await login(page.request);
  const vocabulary = Array.from({ length: 8 }, (_, index) => ({ word_vi: index === 0 ? "Đám mây catalog" : `Từ catalog ${index + 1}`, word_en: index === 0 ? "Cloud catalog" : `Word catalog ${index + 1}`, meaning_vi: "Nghĩa của từ. ".repeat(index + 1), example_vi: "Em đọc từ trong câu chuyện." }));
  await save(page.request, { slug: "catalog-words", title_vi: "Từ vựng phân trang", title_en: "Vocabulary pages", vocabulary });
  await page.goto("/tu-vung");
  await page.getByLabel("Chọn truyện", { exact: true }).selectOption("catalog-words");
  const storyFilter = await page.getByLabel("Chọn truyện", { exact: true }).boundingBox();
  const wordFilter = await page.getByLabel("Tìm tên từ vựng", { exact: true }).boundingBox();
  expect(Math.abs(storyFilter!.y - wordFilter!.y)).toBeLessThan(2);
  expect(Math.abs(storyFilter!.height - wordFilter!.height)).toBeLessThan(2);
  await expect(page.locator(".word-card")).toHaveCount(6);
  await page.getByRole("navigation", { name: "Phân trang từ vựng" }).getByRole("button", { name: "Trang 2", exact: true }).click();
  await expect(page.locator(".word-card")).toHaveCount(2);
  await page.getByLabel("Tìm tên từ vựng", { exact: true }).fill("dam may");
  await expect(page.locator(".word-card h3")).toHaveText(["Đám mây catalog · Cloud catalog"]);
  await page.getByLabel("Tìm tên từ vựng", { exact: true }).fill("CLOUD");
  await expect(page.locator(".word-card")).toHaveCount(1);
  await page.locator(".word-card").getByRole("button", { name: "Yêu thích từ", exact: false }).click();
  await page.getByRole("tab", { name: "Từ yêu thích", exact: true }).click();
  await expect(page.locator(".word-card")).toHaveCount(1);
  await page.locator(".word-card").getByRole("button", { name: "Đã yêu thích", exact: false }).click();
  await expect(page.locator(".word-card")).toHaveCount(0);
  await page.getByRole("tab", { name: "Tất cả các từ", exact: true }).click();
  await page.getByLabel("Tìm tên từ vựng", { exact: true }).fill("");
  await expect(page.locator(".word-card")).toHaveCount(6);
  for (const width of [1280, 768, 600, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const heights = await page.locator(".word-card").evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(2);
    if (width >= 768) {
      const row = await page.locator(".word-card").evaluateAll(elements => elements.slice(0, 2).map(element => element.getBoundingClientRect().top));
      expect(Math.abs(row[0] - row[1])).toBeLessThan(2);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await page.goto("/doc/catalog-words#vocabulary");
  await expect(page.locator("#vocabulary .word-card")).toHaveCount(8);
  await expect(page.getByLabel("Chọn truyện", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Tìm tên từ vựng", { exact: true })).toHaveCount(0);
});

test("story introduction keeps its banner and the reading workspace keeps a compact cover", async ({ page }) => {
  await login(page.request);
  const image = await upload(page.request, png, "image/png");
  await save(page.request, { slug: "catalog-cover", title_vi: "Truyện có nền ảnh", title_en: "Picture background", cover_image_path: image, sentences: [{ text_vi: "Em đọc sách.", text_en: "I read a book." }] });
  for (const route of ["/truyen/catalog-cover", "/doc/catalog-cover"]) {
    await page.goto(route);
    const introduction = route.startsWith("/truyen/");
    const cover = page.locator(introduction ? ".story-cover-hero" : ".story-compact-cover");
    await expect(cover.locator("img")).toHaveAttribute("src", image);
    expect(await cover.locator("img").evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    if (introduction) {
      await expect(cover.locator(".jacket-title")).toHaveText("Truyện có nền ảnh");
      await expect(cover.locator(".jacket-imprint")).toBeVisible();
      await expect(cover.locator(".jacket-languages")).toBeVisible();
      const button = await page.getByRole("link", { name: "Bắt đầu đọc", exact: true }).boundingBox();
      expect(button?.width).toBeLessThanOrEqual(220); expect(button?.height).toBeLessThan(65);
    } else {
      expect((await cover.boundingBox())!.height).toBeLessThan(200);
      await expect(page.getByRole("heading", { name: "Truyện có nền ảnh", exact: true })).toBeVisible();
    }
  }
});

test("all main pages have contextual banners and responsive footer navigation", async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  for (const route of ["/", "/tu-sach", "/nghe-sach", "/tu-vung", "/thu-tai", "/nhat-ky", "/hanh-trinh"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator(".collection-banner")).toBeVisible();
    await expect(page.locator(".footer-card")).toBeVisible();
    for (const width of [1280, 768, 600, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  await page.getByRole("navigation", { name: "Chủ đề đọc sách", exact: true }).getByRole("link", { name: "Gia đình", exact: true }).click();
  await expect(page.locator('.shelf-tabs button[aria-pressed="true"]')).toHaveText("Gia đình");
  await page.locator(".footer-card").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Lên đầu trang", exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Lên đầu trang", exact: true }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.getByRole("navigation", { name: "Hỗ trợ thư viện" }).getByRole("link", { name: "Câu hỏi thường gặp", exact: false }).click();
  await expect(page.getByRole("heading", { name: "Câu hỏi thường gặp", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
