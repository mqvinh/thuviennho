import { test, expect } from "@playwright/test";

test("child-friendly listening has a sentence grid, one play-stop action, button options, seeking and replay", async ({ page }) => {
  const headers = { Origin: "http://localhost:3100" };
  expect((await page.request.post("/api/teacher/login", { headers, data: { username: "test-admin", password: "Test-password-123!" } })).status()).toBe(200);
  const wav = Buffer.alloc(44 + 16000); wav.write("RIFF"); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVE", 8); wav.write("fmt ", 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(16000, 40);
  const uploaded = await page.request.post("/api/teacher/upload", { headers: { ...headers, "Content-Type": "audio/wav" }, data: wav });
  expect(uploaded.status()).toBe(200); const media = (await uploaded.json()).path;
  const story = { slug: "listening-experience", title_vi: "Cùng nghe và đọc truyện", title_en: "Listen and read", sentences: [
    { text_vi: "Em mở sách.", text_en: "I open a book.", audio_vi_path: media },
    { text_vi: "Em đọc truyện.", text_en: "I read a story." },
    { text_vi: "Em kể cho bạn nghe.", text_en: "I tell my friend.", audio_en_path: media },
  ] };
  expect((await page.request.post("/api/teacher/save", { headers, data: story })).status()).toBe(200);
  expect((await page.request.post("/api/teacher/status", { headers, data: { slug: story.slug, status: "published", reviewed: true } })).status()).toBe(200);
  await page.addInitScript(() => {
    class Voice {
      lang = ""; rate = 1; voice: unknown = null; onend: ((event: SpeechSynthesisEvent) => void) | null = null; onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: Voice });
    const state = { recordings: [] as { src: string; rate: number }[], voices: [] as { lang: string; rate: number; text: string }[], pauses: 0, resumes: 0, seeks: 0 };
    let currentVoice: SpeechSynthesisUtterance | null = null;
    let finishCurrentAudio: (() => void) | null = null;
    class Recording {
      duration = 8; playbackRate = 1; onloadedmetadata: (() => void) | null = null; ontimeupdate: (() => void) | null = null; onended: (() => void) | null = null; onerror: (() => void) | null = null; privatePosition = 0;
      constructor(public src: string) { finishCurrentAudio = () => this.onended?.(); }
      get currentTime() { return this.privatePosition; }
      set currentTime(value: number) { this.privatePosition = value; state.seeks++; this.ontimeupdate?.(); }
      async play() { state.recordings.push({ src: this.src, rate: this.playbackRate }); this.onloadedmetadata?.(); }
      pause() { state.pauses++; }
    }
    const engine = Object.assign(new EventTarget(), {
      getVoices: () => [{ lang: "vi-VN", localService: true }, { lang: "en-US", localService: true }],
      cancel: () => { currentVoice = null; },
      speak: (voice: SpeechSynthesisUtterance) => { currentVoice = voice; state.voices.push({ lang: voice.lang, rate: voice.rate, text: voice.text }); },
      pause: () => { state.pauses++; }, resume: () => { state.resumes++; },
    });
    Object.defineProperty(window, "Audio", { configurable: true, value: Recording });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: engine });
    Object.assign(window, { listeningTest: state, finishVoice: () => currentVoice?.onend?.(new Event("end") as SpeechSynthesisEvent), finishRecording: () => finishCurrentAudio?.() });
  });
  await page.goto("/doc/" + story.slug);
  const player = page.getByRole("region", { name: "Nghe sách", exact: true });
  const choices = player.getByRole("group", { name: "Chọn câu để nghe", exact: true });
  await expect(choices.getByRole("button")).toHaveCount(3);
  await expect(choices.getByRole("button", { name: "Câu 1", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(player.getByRole("combobox")).toHaveCount(0);
  await expect(player.getByRole("button", { name: /Tạm dừng|Tiếp tục nghe|Câu trước|Câu tiếp/ })).toHaveCount(0);
  await choices.getByRole("button", { name: "Câu 2", exact: true }).click();
  await expect(choices.getByRole("button", { name: "Câu 2", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(choices.getByRole("button", { name: "Câu 1", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".sentence.active")).toHaveCount(0);
  await choices.getByRole("button", { name: "Câu 1", exact: true }).click();
  await player.getByRole("button", { name: "Nghe truyện", exact: true }).click();
  await expect(page.locator(".sentence.active")).toContainText("Em mở sách.");
  await expect(player.getByRole("button", { name: "Dừng nghe", exact: true })).toHaveCount(1);
  await player.getByRole("button", { name: "Dừng nghe", exact: true }).click();
  await expect(page.locator(".sentence.active")).toHaveCount(0);
  await expect(choices.getByRole("button", { name: "Câu 1", exact: true })).toHaveAttribute("aria-pressed", "true");
  await player.getByRole("button", { name: "Nghe truyện", exact: true }).click();
  const seek = player.getByLabel("Vị trí trong câu đang nghe", { exact: true });
  await seek.focus(); await seek.press("ArrowRight");
  expect(await page.evaluate(() => (window as unknown as { listeningTest: { seeks: number } }).listeningTest.seeks)).toBeGreaterThan(0);
  await player.getByRole("button", { name: "Nghe lại câu", exact: true }).click();
  await expect(seek).toHaveValue("0");
  await expect(choices.getByRole("button", { name: "Câu 1", exact: true })).toHaveAttribute("aria-pressed", "true");
  await choices.getByRole("button", { name: "Câu 2", exact: true }).click();
  await expect(page.locator(".sentence.active")).toContainText("Em đọc truyện.");
  await expect(player.locator(".listening-current")).toContainText("Câu 2 trên 3");
  await player.getByRole("button", { name: "Tiếng Anh", exact: true }).click();
  await expect(page.locator(".sentence.active")).toHaveCount(0);
  await player.getByRole("button", { name: "Nghe truyện", exact: true }).click();
  await expect(page.locator(".sentence.active")).toContainText("I read a story.");
  await player.getByRole("button", { name: "Dừng nghe", exact: true }).click();
  await choices.getByRole("button", { name: "Câu 1", exact: true }).click();
  await expect(player.getByRole("button", { name: "Nghe truyện", exact: true })).toBeVisible();
  await player.getByRole("button", { name: "Nghe truyện", exact: true }).click();
  await player.getByRole("button", { name: "Chậm", exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { listeningTest: { voices: { rate: number }[] } }).listeningTest.voices.at(-1)?.rate)).toBe(.75);
  await page.evaluate(() => (window as unknown as { finishVoice: () => void }).finishVoice());
  await expect(player.locator(".listening-current")).toContainText("Câu 2 trên 3");
  await page.evaluate(() => (window as unknown as { finishVoice: () => void }).finishVoice());
  await expect(player.locator(".listening-current")).toContainText("Câu 3 trên 3");
  await expect(choices.getByRole("button", { name: "Câu 3", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(choices.locator('[aria-pressed="true"]')).toHaveCount(1);
  await page.evaluate(() => (window as unknown as { finishRecording: () => void }).finishRecording());
  await expect(player.getByRole("button", { name: "Nghe lại truyện", exact: true })).toBeVisible();
  await player.getByRole("button", { name: "Nghe lại truyện", exact: true }).click();
  await expect(player.locator(".listening-current")).toContainText("Câu 1 trên 3");
  await player.getByRole("button", { name: "Dừng nghe", exact: true }).click();
  await expect(page.locator(".sentence.active")).toHaveCount(0);
  const sources = player.getByRole("group", { name: "Nguồn giọng đọc", exact: true });
  await sources.getByRole("button", { name: "Bản thu âm", exact: true }).click();
  await expect(sources.getByRole("button", { name: "Bản thu âm", exact: true })).toHaveAttribute("aria-pressed", "true");
  await choices.getByRole("button", { name: "Câu 2", exact: true }).click();
  await player.getByRole("button", { name: "Nghe truyện", exact: true }).click();
  await expect(player.getByRole("status")).toContainText("chưa có audio tiếng Anh");
  await expect(page.locator(".sentence.active")).toHaveCount(0);
  await sources.getByRole("button", { name: "Giọng máy", exact: true }).click();
  await player.getByRole("button", { name: "Nghe truyện", exact: true }).click();
  await expect(page.locator(".sentence.active")).toContainText("I read a story.");
  await sources.getByRole("button", { name: "Tự chọn", exact: true }).click();
  await expect(page.locator(".sentence.active")).toHaveCount(0);
  await expect(sources.getByRole("button", { name: "Tự chọn", exact: true })).toHaveAttribute("aria-pressed", "true");
  await player.getByRole("button", { name: "Tiếng Việt", exact: true }).click();
  await choices.getByRole("button", { name: "Câu 1", exact: true }).click();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await player.screenshot({ path: `.data/project-check/listening-player-${width}.png` });
  }
});
