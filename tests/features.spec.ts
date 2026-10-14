import { test, expect, type APIRequestContext } from "@playwright/test";
const origin = "http://localhost:3100";
const headers = { Origin: origin };
const password = "Test-password-123!";
async function login(request: APIRequestContext, username = "test-admin") {
  const r = await request.post("/api/teacher/login", {
    headers,
    data: { username, password },
  });
  expect(r.status()).toBe(200);
}
const draft = {
  slug: "test-story",
  theme_slug: "kindness-sharing",
  title_vi: "Truyện kiểm thử",
  title_en: "Test Story",
  summary_vi: "Một câu chuyện kiểm thử.",
  summary_en: "A test story.",
  reading_level: 2,
  estimated_minutes: 3,
  source_note: "Học liệu riêng cho kiểm thử tự động.",
  license_note: "Nội dung kiểm thử tự biên soạn.",
  cover_image_path: "",
  sentences: [
    {
      text_vi: "Em chia sẻ một cuốn sách.",
      text_en: "I share a book.",
      audio_vi_path: "",
      audio_en_path: "",
    },
    {
      text_vi: "Bạn em đọc sách.",
      text_en: "My friend reads the book.",
      audio_vi_path: "",
      audio_en_path: "",
    },
  ],
  vocabulary: [
    {
      word_vi: "chia sẻ",
      word_en: "share",
      meaning_vi: "Cho bạn cùng dùng.",
      example_vi: "Em chia sẻ sách.",
      pronunciation_path: "",
      illustration_path: "",
    },
  ],
  questions: [
    {
      question_vi: "Em làm gì?",
      question_en: "",
      kind: "choice",
      options: ["Chia sẻ", "Giấu sách"],
      correct_option: 0,
      correct_order: [],
      explanation_vi: "Em chia sẻ sách.",
    },
    {
      question_vi: "Bạn làm gì?",
      question_en: "",
      kind: "choice",
      options: ["Đọc sách", "Ngủ"],
      correct_option: 0,
      correct_order: [],
      explanation_vi: "Bạn đọc sách.",
    },
    {
      question_vi: "Sắp xếp",
      question_en: "",
      kind: "order",
      options: ["Bạn đọc sách", "Em chia sẻ sách"],
      correct_option: 0,
      correct_order: [1, 0],
      explanation_vi: "Chia sẻ rồi đọc.",
    },
  ],
};

test("published quiz grades on server, rejects malformed answers, and keeps answer keys private", async ({
  page,
  request,
}) => {
  await page.goto("/doc/tho-con-biet-se-chia");
  await expect(
    page.getByRole("button", { name: "Kiểm tra bài làm" }),
  ).toBeVisible();
  const html = await (await request.get("/doc/tho-con-biet-se-chia")).text();
  expect(html).not.toContain("correct_option");
  expect(html).not.toContain("correct_order");
  expect(html).not.toContain("Thỏ con đã chia củ cà rốt với bạn Rùa.");
  const invalidQuiz = page.waitForResponse(response => response.url().endsWith("/api/quiz") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Kiểm tra bài làm" }).click();
  expect((await invalidQuiz).status()).toBe(400);
  await expect(
    page.getByText("Lựa chọn không hợp lệ.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Đã hiểu" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByLabel("Thỏ con chia cà rốt.", { exact: true }).check();
  await page.getByLabel("Bạn Rùa", { exact: true }).check();
  await page
    .getByRole("button", { name: "Đưa lên: Thỏ con có một củ cà rốt." })
    .click();
  await page
    .getByRole("button", { name: "Đưa lên: Thỏ con biết bạn Rùa đang đói." })
    .click();
  await page.getByRole("button", { name: "Kiểm tra bài làm" }).click();
  await expect(
    page.getByText("🌟 Em làm tốt lắm!", { exact: false }),
  ).toHaveCount(3);
  await page.getByRole("button", { name: "Làm lại" }).click();
  await expect(
    page.getByRole("button", { name: "Kiểm tra bài làm" }),
  ).toBeVisible();
  expect(
    (
      await request.post("/api/quiz", {
        headers,
        data: { slug: "tho-con-biet-se-chia", answers: [] },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/quiz", {
        headers: { Origin: "https://other.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
});

test("local favorites, reading progress and drawing journal persist and can be deleted", async ({
  page,
}) => {
  test.setTimeout(240_000);
  page.setDefaultNavigationTimeout(120_000);
  await page.goto("/doc/tho-con-biet-se-chia");
  await page
    .getByRole("button", { name: "Yêu thích từ", exact: false })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Đã yêu thích", exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Em đã đọc xong", exact: true })
    .click();
  await page.goto("/hanh-trinh");
  await expect(
    page.getByRole("heading", { name: "Người khám phá đầu tiên", exact: true }),
  ).toBeVisible();
  await page.goto("/nhat-ky");
  await page
    .getByLabel("Truyện em đã đọc")
    .selectOption("tho-con-biet-se-chia");
  await page.getByLabel("Nhân vật em thích").fill("Thỏ");
  await page.getByLabel("Điều em học được").fill("Em học cách chia sẻ.");
  await page.getByRole("button", { name: "Màu xanh dương", exact: true }).click();
  await expect(page.getByRole("button", { name: "Màu xanh dương", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.locator("canvas").scrollIntoViewIfNeeded();
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw Error("No canvas");
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 70);
  await page.mouse.up();
  await page.getByRole("button", { name: "Màu đỏ", exact: true }).click();
  await page.locator("canvas").scrollIntoViewIfNeeded();
  const redBox = await page.locator("canvas").boundingBox();
  if (!redBox) throw Error("No canvas");
  await page.mouse.move(redBox.x + 20, redBox.y + 90);
  await page.mouse.down();
  await page.mouse.move(redBox.x + 90, redBox.y + 130);
  await page.mouse.up();
  expect(await page.locator("canvas").evaluate((element: HTMLCanvasElement) => {
    const pixels = element.getContext("2d")!.getImageData(0, 0, 800, 450).data;
    let blue = false, red = false;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] === 40 && pixels[i + 1] === 123 && pixels[i + 2] === 193 && pixels[i + 3] === 255) blue = true;
      if (pixels[i] === 227 && pixels[i + 1] === 66 && pixels[i + 2] === 66 && pixels[i + 3] === 255) red = true;
    }
    return { blue, red };
  })).toEqual({ blue: true, red: true });
  await page.getByRole("button", { name: "Lưu nhật ký", exact: true }).click();
  await expect(page.getByText("Đã lưu nhật ký trên thiết bị!")).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Điều em học được: Em học cách chia sẻ."),
  ).toBeVisible();
  await expect(
    page.getByAltText("Tranh về Thỏ con biết sẻ chia"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xóa sản phẩm", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xóa sản phẩm" }).click();
  await expect(
    page.getByText("Chưa có nhật ký.", { exact: false }),
  ).toBeVisible();
  await page.goto("/hanh-trinh");
  await page
    .getByRole("button", { name: "Xóa dữ liệu trên thiết bị", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByText("Đã xóa dữ liệu trên thiết bị.")).toBeVisible();
});

test("teacher ownership, review workflow, draft isolation, uploads and AI configuration", async ({
  request,
  playwright,
  page,
}) => {
  test.setTimeout(180_000);
  expect((await request.get("/api/teacher/content")).status()).toBe(401);
  expect(
    (
      await request.post("/api/teacher/save", { headers, data: draft })
    ).status(),
  ).toBe(401);
  await login(request, "test-teacher");
  expect(
    (
      await request.post("/api/teacher/save", {
        headers,
        data: { ...draft, sentences: [{ ...draft.sentences[0], text_en: "" }] },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post("/api/teacher/save", { headers, data: draft })
    ).status(),
  ).toBe(200);
  await page.goto("/truyen/test-story");
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy trang" }),
  ).toBeVisible();
  expect(
    (
      await request.post("/api/teacher/status", {
        headers,
        data: { slug: draft.slug, status: "published", reviewed: true },
      })
    ).status(),
  ).toBe(403);
  const other = await playwright.request.newContext({ baseURL: origin });
  await login(other, "other-teacher");
  expect(
    (await other.post("/api/teacher/save", { headers, data: draft })).status(),
  ).toBe(403);
  expect(
    (await other.get("/api/teacher/content?slug=test-story")).status(),
  ).toBe(404);
  await other.dispose();
  expect(
    (
      await request.post("/api/teacher/status", {
        headers,
        data: { slug: draft.slug, status: "pending" },
      })
    ).status(),
  ).toBe(200);
  await request.post("/api/teacher/logout", { headers, data: {} });
  await login(request);
  expect(
    (
      await request.post("/api/teacher/status", {
        headers,
        data: { slug: draft.slug, status: "published" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/teacher/status", {
        headers,
        data: { slug: draft.slug, status: "published", reviewed: true },
      })
    ).status(),
  ).toBe(200);
  await page.goto("/truyen/test-story");
  await expect(
    page.getByRole("heading", { name: draft.title_vi, exact: true }),
  ).toBeVisible();
  expect(
    (await request.post("/api/teacher/ai", { headers, data: {} })).status(),
  ).toBe(503);
  expect(
    (
      await request.post("/api/teacher/upload", {
        headers: { ...headers, "Content-Type": "image/png" },
        data: Buffer.from("not an image"),
      })
    ).status(),
  ).toBe(400);
  const wav = Buffer.alloc(44 + 16000);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(16000, 40);
  const upload = await request.post("/api/teacher/upload", {
    headers: { ...headers, "Content-Type": "audio/wav" },
    data: wav,
  });
  expect(upload.status()).toBe(200);
  const media = (await upload.json()).path;
  const anon = await playwright.request.newContext({ baseURL: origin });
  expect((await anon.get(media)).status()).toBe(404);
  expect(
    (
      await request.post("/api/teacher/save", {
        headers,
        data: {
          ...draft,
          sentences: draft.sentences.map((s) => ({
            ...s,
            audio_vi_path: media,
          })),
        },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post("/api/teacher/status", {
        headers,
        data: { slug: draft.slug, status: "published", reviewed: true },
      })
    ).status(),
  ).toBe(200);
  expect((await anon.get(media)).status()).toBe(200);
  await anon.dispose();
  await page.goto("/doc/test-story");
  await page.getByRole("button", { name: "Bản thu âm", exact: true }).click();
  await page.getByRole("button", { name: "Nghe truyện" }).click();
  await expect(page.locator(".sentence.active").first()).toBeVisible();
  await page.getByRole("button", { name: "Dừng nghe", exact: true }).click();
  await expect(page.locator(".sentence.active")).toHaveCount(0);
  await page.getByRole("region", { name: "Nghe sách", exact: true }).getByRole("button", { name: "Tiếng Anh", exact: true }).click();
  await page.getByRole("button", { name: "Nghe truyện" }).click();
  await expect(
    page.getByText("chưa có audio tiếng Anh", { exact: false }),
  ).toBeVisible();
  await page.goto("/admin");
  await page.getByLabel("Tên đăng nhập").fill("test-admin");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Truyện của tôi" }),
  ).toBeVisible();
  await page.getByLabel("Tên truyện", { exact: true }).fill(draft.title_vi);
  await page.getByRole("button", { name: `Thao tác ${draft.title_vi}`, exact: true }).click();
  await page
    .getByRole("link", { name: "Sửa", exact: true })
    .click();
  await expect(page.getByLabel("Tên tiếng Việt", { exact: true })).toHaveValue(
    draft.title_vi,
    { timeout: 60_000 },
  );
  await expect(page.getByLabel("Vị trí 1", { exact: true })).toHaveValue("1");
  await expect(page.getByLabel("Vị trí 2", { exact: true })).toHaveValue("0");
});

test("six areas fit mobile, tablet and desktop without overflow", async ({
  page,
}) => {
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    for (const url of [
      "/",
      "/tu-vung",
      "/thu-tai",
      "/nhat-ky",
      "/hanh-trinh",
      "/nghe-sach",
    ]) {
      await page.goto(url);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});

test("private draft preview is limited to its owner and administrators", async ({
  page,
  request,
  playwright,
}) => {
  await login(request, "test-teacher");
  const content = {
    ...draft,
    slug: "preview-only",
    title_vi: "Truyện nháp riêng",
  };
  expect(
    (
      await request.post("/api/teacher/save", { headers, data: content })
    ).status(),
  ).toBe(200);
  const url = "/admin/xem-thu/preview-only";
  await page.goto(url);
  await expect(
    page.getByRole("heading", { name: "Đăng nhập để đọc thử" }),
  ).toBeVisible();
  expect(await page.locator("main").innerText()).not.toContain(
    content.title_vi,
  );
  await page.goto("/admin");
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("test-teacher");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Truyện của tôi" }),
  ).toBeVisible();
  await page.goto(url);
  await expect(
    page.getByRole("heading", { name: content.title_vi, exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Đáp án duyệt:", { exact: false })).toHaveCount(
    3,
  );
  await expect(
    page.getByRole("button", { name: "Yêu thích từ", exact: false }),
  ).toHaveCount(0);
  await page.goto("/doc/preview-only");
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy trang" }),
  ).toBeVisible();
  const other = await playwright.request.newContext({ baseURL: origin });
  await login(other, "other-teacher");
  const html = await (await other.get(url)).text();
  expect(html).not.toContain(content.title_vi);
  await other.dispose();
});

test("browser speech waits for voices, stops playback and cancels pending requests", async ({
  page,
}) => {
  await page.addInitScript(() => {
    class MockUtterance {
      lang = "";
      rate = 1;
      voice: SpeechSynthesisVoice | null = null;
      onend: ((event: SpeechSynthesisEvent) => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: MockUtterance,
      configurable: true,
    });
    const target = new EventTarget();
    let voices: SpeechSynthesisVoice[] = [];
    let current: SpeechSynthesisUtterance | null = null;
    const state = {
      spoken: [] as { text: string; lang: string; rate: number }[],
      cancels: 0,
    };
    Object.assign(window, { voiceTest: state });
    const engine = {
      getVoices: () => voices,
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
      cancel: () => {
        current = null;
        state.cancels++;
      },
      speak: (next: SpeechSynthesisUtterance) => {
        current = next;
        state.spoken.push({
          text: next.text,
          lang: next.lang,
          rate: next.rate,
        });
      },
    };
    Object.defineProperty(window, "speechSynthesis", {
      value: engine,
      configurable: true,
    });
    Object.assign(window, {
      clearVoices: () => {
        voices = [];
      },
      supplyVoices: () => {
        voices = [
          { lang: "vi-VN", localService: true },
          { lang: "en-US", localService: true },
        ] as SpeechSynthesisVoice[];
        target.dispatchEvent(new Event("voiceschanged"));
      },
      finishVoice: () =>
        current?.onend?.(new Event("end") as SpeechSynthesisEvent),
    });
  });
  await page.goto("/doc/tho-con-biet-se-chia");
  await page.getByRole("button", { name: "Nghe truyện" }).click();
  await expect(
    page.getByRole("status", { name: "Đang tải giọng đọc trên thiết bị" }),
  ).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { supplyVoices: () => void }).supplyVoices();
  });
  await expect(page.locator(".sentence.active")).toHaveCount(1);
  await page.getByRole("button", { name: "Dừng nghe", exact: true }).click();
  await expect(page.locator(".sentence.active")).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { voiceTest: { cancels: number } }).voiceTest.cancels)).toBeGreaterThan(1);
  await page.getByRole("button", { name: "Nghe truyện", exact: true }).click();
  await expect(
    page.getByText("Đang nghe câu 1", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { finishVoice: () => void }).finishVoice();
  });
  await expect(
    page.getByText("Đang nghe câu 2", { exact: true }),
  ).toBeVisible();
  await page.getByRole("region", { name: "Nghe sách", exact: true }).getByRole("button", { name: "Tiếng Anh", exact: true }).click();
  await expect(page.locator(".sentence.active")).toHaveCount(0);
  await page.getByRole("button", { name: "Nghe truyện" }).click();
  const state = await page.evaluate(
    () =>
      (window as unknown as { voiceTest: { spoken: { lang: string }[] } })
        .voiceTest,
  );
  expect(state.spoken.map((s) => s.lang)).toEqual(["vi-VN", "vi-VN", "vi-VN", "en-US"]);
  await page.evaluate(() =>
    (window as unknown as { clearVoices: () => void }).clearVoices(),
  );
  await page.getByRole("region", { name: "Nghe sách", exact: true }).getByRole("button", { name: "Tiếng Việt", exact: true }).click();
  await page.getByRole("button", { name: "Nghe truyện" }).click();
  await expect(
    page.getByRole("status", { name: "Đang tải giọng đọc trên thiết bị" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dừng nghe", exact: true }).click();
  await page.evaluate(() => (window as unknown as { supplyVoices: () => void }).supplyVoices());
  await expect(page.locator(".sentence.active")).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { voiceTest: { spoken: unknown[] } }).voiceTest.spoken.length)).toBe(4);
  await page.evaluate(() => (window as unknown as { clearVoices: () => void }).clearVoices());
  await page.getByRole("button", { name: "Nghe truyện", exact: true }).click();
  await expect(page.getByRole("status", { name: "Đang tải giọng đọc trên thiết bị" })).toBeVisible();
  await page.getByRole("region", { name: "Nghe sách", exact: true }).getByRole("button", { name: "Tiếng Anh", exact: true }).click();
  await page.evaluate(() =>
    (window as unknown as { supplyVoices: () => void }).supplyVoices(),
  );
  await expect(page.locator(".sentence.active")).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { voiceTest: { spoken: unknown[] } }).voiceTest
          .spoken.length,
    ),
  ).toBe(4);
});

test("restore validates backups before replacing local data", async ({
  page,
}) => {
  await page.goto("/hanh-trinh");
  const backup = {
    version: 1,
    favorites: [],
    started: {
      "tho-con-biet-se-chia": {
        title: "Thỏ con biết sẻ chia",
        date: "2026-10-11T01:00:00.000Z",
      },
    },
    finished: {
      "tho-con-biet-se-chia": {
        title: "Thỏ con biết sẻ chia",
        date: "2026-10-11T01:00:00.000Z",
      },
    },
    activities: {},
    journal: [],
  };
  await page.getByLabel("Chọn bản sao nhật ký", { exact: true }).setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByText("Đã kiểm tra bản sao.", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("little-readers-device-v1")),
  ).toBeNull();
  await page
    .getByRole("button", { name: "Khôi phục bản sao", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("button", { name: "Tiếp tục" }).click();
  await expect(
    page.getByText("Đã khôi phục bản sao trên thiết bị.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Người khám phá đầu tiên", exact: true }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    localStorage.getItem("little-readers-device-v1"),
  );
  await page.getByLabel("Chọn bản sao nhật ký", { exact: true }).setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        ...backup,
        journal: [{ id: "bad", image: "https://outside.example/pixel" }],
      }),
    ),
  });
  await expect(
    page.getByText("Bản sao không đúng định dạng", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("little-readers-device-v1")),
  ).toBe(saved);
  await expect(
    page.getByRole("button", { name: "Khôi phục bản sao", exact: true }),
  ).toHaveCount(0);
});

test("account creation, lock, password reset and self-service changes revoke previous sessions", async ({
  request,
  playwright,
}) => {
  await login(request);
  const users = await (await request.get("/api/teacher/accounts")).json();
  const own = users.users.find(
    (u: { username: string }) => u.username === "test-admin",
  );
  expect(
    (
      await request.post("/api/teacher/accounts", {
        headers,
        data: { action: "active", id: own.id, active: false },
      })
    ).status(),
  ).toBe(400);
  const newPass = " New-local-password-123! ";
  expect(
    (
      await request.post("/api/teacher/accounts", {
        headers,
        data: {
          action: "create",
          username: "new-teacher",
          password: newPass,
          role: "teacher",
        },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post("/api/teacher/accounts", {
        headers,
        data: {
          action: "create",
          username: "new-teacher",
          password: newPass,
          role: "teacher",
        },
      })
    ).status(),
  ).toBe(409);
  const teacher = await playwright.request.newContext({ baseURL: origin });
  expect(
    (
      await teacher.post("/api/teacher/login", {
        headers,
        data: { username: "new-teacher", password: newPass },
      })
    ).status(),
  ).toBe(200);
  expect((await teacher.get("/api/teacher/accounts")).status()).toBe(403);
  const list = await (await request.get("/api/teacher/accounts")).json();
  const id = list.users.find(
    (u: { username: string }) => u.username === "new-teacher",
  ).id;
  expect(
    (
      await request.post("/api/teacher/accounts", {
        headers,
        data: { action: "active", id, active: false },
      })
    ).status(),
  ).toBe(200);
  expect((await teacher.get("/api/teacher/content")).status()).toBe(401);
  expect(
    (
      await teacher.post("/api/teacher/login", {
        headers,
        data: { username: "new-teacher", password: newPass },
      })
    ).status(),
  ).toBe(401);
  await request.post("/api/teacher/accounts", {
    headers,
    data: { action: "active", id, active: true },
  });
  await request.post("/api/teacher/accounts", {
    headers,
    data: { action: "reset", id, password: "Reset-password-123!" },
  });
  expect(
    (
      await teacher.post("/api/teacher/login", {
        headers,
        data: { username: "new-teacher", password: "Reset-password-123!" },
      })
    ).status(),
  ).toBe(200);
  const older = await playwright.request.newContext({ baseURL: origin });
  await older.post("/api/teacher/login", {
    headers,
    data: { username: "new-teacher", password: "Reset-password-123!" },
  });
  expect(
    (
      await teacher.post("/api/teacher/accounts", {
        headers,
        data: {
          action: "password",
          currentPassword: "wrong",
          password: "My-next-password-123!",
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await teacher.post("/api/teacher/accounts", {
        headers,
        data: {
          action: "password",
          currentPassword: "Reset-password-123!",
          password: "My-next-password-123!",
        },
      })
    ).status(),
  ).toBe(200);
  expect((await older.get("/api/teacher/content")).status()).toBe(401);
  expect((await teacher.get("/api/teacher/content")).status()).toBe(200);
  await teacher.dispose();
  await older.dispose();
});

test("admin route, header account dropdown and management tables work on desktop and mobile", async ({ page }) => {
  await page.goto("/giao-vien");
  await expect(page).toHaveURL(/\/giao-vien$/);
  await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin$/);
  const header = page.locator("header.site-header");
  await expect(header.getByRole("link", { name: "Đăng nhập", exact: true })).toBeVisible();
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("test-admin");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  const loginResponse = page.waitForResponse(response => response.url().endsWith("/api/teacher/login") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  expect((await loginResponse).status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Truyện của tôi" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("table")).toHaveCount(1);
  await page.goto("/admin/tai-khoan");
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Thông tin cá nhân" })).toBeVisible();
  await page.goto("/admin/nguoi-dung");
  await expect(page.getByRole("table")).toHaveCount(1);
  await expect(page.getByRole("row", { name: /test-admin/ })).toBeVisible();
  const summary = header.locator("summary");
  await summary.click();
  await expect(header.getByRole("link", { name: "Truyện của tôi" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Tài khoản", exact: true })).toBeVisible();
  await expect(header.getByRole("link", { name: "Quản lý người dùng", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(header.locator("details")).not.toHaveAttribute("open", "");
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto("/");
  await header.locator("summary").click();
  await header.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(header.getByRole("link", { name: "Đăng nhập", exact: true })).toBeVisible();
});

test("story administration filters, cover preview, save redirect and publication respect roles", async ({ page }) => {
  await login(page.request);
  const content = { ...draft, slug: "editor-flow", title_vi: "Truyện luồng biên tập" };
  expect((await page.request.post("/api/teacher/save", { headers, data: content })).status()).toBe(200);
  await page.goto("/admin/truyen");
  await page.getByLabel("Tên truyện", { exact: true }).fill(content.title_vi);
  await expect(page.locator(".data-table tbody tr")).toHaveCount(1);
  await expect(page.getByRole("columnheader", { name: "Tác giả" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: /^Tác giả/ })).toBeVisible();
  await expect(page.locator(".breadcrumbs")).toContainText("Truyện của tôi");
  await page.locator(".row-menu-trigger").click();
  await expect(page.locator(".row-dropdown").getByRole("button", { name: "Gửi duyệt", exact: true })).toHaveCount(0);
  await expect(page.locator(".row-dropdown").getByRole("button", { name: "Duyệt và xuất bản", exact: true })).toBeVisible();
  await page.locator(".row-dropdown").getByRole("link", { name: "Sửa", exact: true }).click();
  await expect(page.getByLabel("Tên tiếng Việt", { exact: true })).toHaveValue(content.title_vi);
  const upload = page.waitForResponse(r => r.url().endsWith("/api/teacher/upload"));
  await page.getByLabel("Ảnh bìa", { exact: true }).setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=", "base64") });
  expect((await upload).status()).toBe(200);
  await expect(page.getByAltText("Ảnh bìa đã chọn")).toBeVisible();
  expect(await page.getByAltText("Ảnh bìa đã chọn").evaluate(el => el.parentElement!.getBoundingClientRect().height)).toBe(200);
  await expect(page.getByText("Đã tải tệp.", { exact: true })).toHaveCount(0);
  const save = page.waitForResponse(r => r.url().endsWith("/api/teacher/save"));
  await page.getByRole("button", { name: "Lưu bản nháp", exact: true }).click();
  expect((await save).status()).toBe(200);
  await expect(page).toHaveURL(/slug=editor-flow&saved=1/);
  await expect(page.getByText("Đã lưu bản nháp thành công.", { exact: true })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Đã hiểu" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const publish = page.waitForResponse(r => r.url().endsWith("/api/teacher/status"));
  await page.getByRole("button", { name: "Xuất bản", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xuất bản", exact: true }).click();
  expect((await publish).status()).toBe(200);
  await expect(page).toHaveURL(/\/admin\/truyen$/);
  await page.getByLabel("Tên truyện", { exact: true }).fill(content.title_vi);
  await expect(page.locator(".data-table tbody tr")).toContainText("Đã xuất bản");
  const own = { ...draft, slug: "teacher-editor-flow", title_vi: "Truyện giáo viên biên tập" };
  await page.request.post("/api/teacher/logout", { headers, data: {} });
  await login(page.request, "test-teacher");
  expect((await page.request.post("/api/teacher/save", { headers, data: own })).status()).toBe(200);
  await page.goto("/admin/truyen");
  await page.getByLabel("Tên truyện", { exact: true }).fill(own.title_vi);
  await expect(page.getByRole("combobox", { name: /^Tác giả/ })).toHaveCount(0);
  await page.locator(".row-menu-trigger").click();
  await expect(page.locator(".row-dropdown").getByRole("button", { name: "Gửi duyệt", exact: true })).toBeVisible();
  await expect(page.locator(".row-dropdown").getByRole("button", { name: "Duyệt và xuất bản", exact: true })).toHaveCount(0);
});
