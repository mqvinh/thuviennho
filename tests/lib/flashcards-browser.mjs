import assert from "node:assert/strict";
import { expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 20_000 });
const storageKey = "little-readers-device-v1";

export async function checkFlashcardGame(page, { words, mobile = false, screenshots } = {}) {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/tro-choi", { timeout: 90_000 });
  if (mobile) {
    const nav = page.getByRole("navigation", { name: "Menu chính trên di động", exact: true });
    await nav.getByRole("button", { name: "Thêm", exact: true }).click();
    await expect(page.locator(".mobile-more-sheet").getByRole("link", { name: /Khu trò chơi/ })).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Escape");
  } else await expect(page.locator(".navigation").getByRole("link", { name: /Khu trò chơi/ })).toHaveAttribute("aria-current", "page");
  const seed = { version: 1, favorites: [words[0].id], started: {}, finished: {}, activities: {}, journal: [{ id: "00000000-0000-4000-a000-000000000002", slug: "test-story", title: "Nhật ký cần giữ", character: "Bạn", lesson: "Dữ liệu cũ", image: "", date: "2026-10-10T03:00:00.000Z" }] };
  await page.evaluate(({ key, seed }) => localStorage.setItem(key, JSON.stringify(seed)), { key: storageKey, seed });
  await page.reload();
  await expect(page.locator(".game-card")).toHaveCount(2);
  if (screenshots) await page.screenshot({ path: `${screenshots}/games-${mobile ? "mobile" : "desktop"}.png`, fullPage: true });
  await page.locator('.game-card-link[href="/tro-choi/flashcard"]').click();
  await expect(page).toHaveURL(/\/tro-choi\/flashcard$/);
  const source = page.getByRole("combobox", { name: "Bộ từ", exact: true });
  await expect(source).toBeEnabled();
  await source.selectOption("favorites");
  await expect(page.locator(".flashcard-selection")).toContainText("Có 1 từ phù hợp");
  await source.selectOption("due");
  await expect(page.locator(".flashcard-start")).toBeDisabled();
  await expect(page.locator(".flashcard-empty")).toContainText("Chưa có từ đến lịch ôn");
  await source.selectOption("all");
  const story = page.getByRole("combobox", { name: "Truyện", exact: true });
  const firstStory = await story.locator("option").evaluateAll(options => options.find(option => option.value)?.value);
  await story.selectOption(firstStory);
  await expect(page.locator(".flashcard-start")).toBeEnabled();
  const theme = page.getByRole("combobox", { name: "Chủ đề", exact: true });
  const firstTheme = await theme.locator("option").evaluateAll(options => options.find(option => option.value)?.value);
  if (firstTheme) { await theme.selectOption(firstTheme); await expect(story).toHaveValue(""); }
  await theme.selectOption(""); await story.selectOption("");
  await page.getByRole("combobox", { name: "Số từ mỗi lượt", exact: true }).selectOption("5");
  if (mobile) {
    await page.setViewportSize({ width: 320, height: 740 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Filters fit a 320px screen");
    if (screenshots) await page.screenshot({ path: `${screenshots}/flashcard-setup-320.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
  }
  await page.locator(".flashcard-start").click();
  for (let i = 0; i < 5; i++) {
    await expect(page.locator(".flashcard-progress-label")).toContainText(`Thẻ ${i + 1}/5`);
    const flip = page.locator(".flashcard-flip");
    await expect.poll(() => flip.locator(".flashcard-front img").evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    const path = await flip.locator(".flashcard-front img").evaluate(image => new URL(image.src).pathname);
    const word = words.find(item => item.illustration_path === path);
    assert.ok(word, "Study card belongs to an existing word");
    await flip.click();
    await expect(flip).toHaveAttribute("aria-pressed", "true");
    await expect(flip.locator(".flashcard-back strong")).toHaveText(word.word_en);
    if (i === 0) {
      await page.getByRole("button", { name: "Nghe phát âm", exact: true }).click();
      await expect.poll(() => page.locator(".flashcard-game audio").evaluate(audio => audio.duration > .2 && audio.error === null)).toBe(true);
      await page.locator(".flashcard-game audio").evaluate(audio => audio.pause());
      if (screenshots) await page.locator(".flashcard-play").screenshot({ path: `${screenshots}/flashcard-flipped-${mobile ? "mobile" : "desktop"}.png` });
    }
    await page.getByRole("button", { name: i < 4 ? "Thẻ tiếp theo" : "Bắt đầu thử tài", exact: true }).click();
  }
  assert.deepEqual((await stored(page)).flashcards, undefined, "Viewing and flipping cards never marks a word as learned");
  let questions = 0;
  while (await page.locator(".flashcard-prompt").count()) {
    assert.ok(++questions <= 6, "One initial mistake schedules exactly one retry");
    const english = await page.locator(".flashcard-prompt > strong").innerText();
    const options = page.locator(".flashcard-option");
    await expect.poll(() => options.locator("img").evaluateAll(images => images.length >= 3 && images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
    const paths = await options.locator("img").evaluateAll(images => images.map(image => new URL(image.src).pathname));
    const optionWords = paths.map(path => words.find(item => item.illustration_path === path));
    assert.ok(optionWords.every(Boolean));
    assert.equal(new Set(optionWords.map(word => word.word_en.toLowerCase())).size, paths.length);
    assert.equal(new Set(optionWords.map(word => word.word_vi.toLowerCase())).size, paths.length);
    assert.equal(await page.locator(".flashcard-answer-label").count(), 0, "No answer label is shown before responding");
    const correct = optionWords.findIndex(word => word.word_en.toLowerCase() === english.toLowerCase());
    assert.ok(correct >= 0);
    const selected = questions === 1 ? (correct + 1) % paths.length : correct;
    await options.nth(selected).click();
    await expect(page.locator('.flashcard-option[data-result="correct"]')).toHaveCount(1);
    await expect(page.locator(".flashcard-feedback")).toBeVisible();
    const after = await stored(page);
    assert.equal(Object.values(after.flashcards).reduce((sum, item) => sum + item.attempts, 0), Math.min(questions, 5), "Retry practice does not advance or duplicate review records");
    assert.deepEqual(after.journal, seed.journal);
    assert.deepEqual(after.favorites, seed.favorites);
    if (questions === 1 && screenshots) await page.locator(".flashcard-play").screenshot({ path: `${screenshots}/flashcard-question-${mobile ? "mobile" : "desktop"}.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Question cards fit the screen");
    await page.locator(".flashcard-feedback button").click();
  }
  assert.equal(questions, 6);
  await expect(page.locator(".flashcard-results")).toContainText("4/5");
  await expect(page.locator(".flashcard-review-row")).toHaveCount(5);
  await expect(page.locator(".flashcard-saved")).toBeVisible();
  const completed = await stored(page);
  assert.equal(Object.keys(completed.flashcards).length, 5);
  assert.equal(Object.values(completed.flashcards).filter(item => item.streak === 0).length, 1);
  assert.equal(Object.values(completed.flashcards).filter(item => item.streak === 1).length, 4);
  if (screenshots) await page.locator(".flashcard-results").screenshot({ path: `${screenshots}/flashcard-result-${mobile ? "mobile" : "desktop"}.png` });
  await page.reload();
  assert.deepEqual((await stored(page)).flashcards, completed.flashcards, "Review history survives reload");

  await page.evaluate(key => {
    const data = JSON.parse(localStorage.getItem(key));
    const progress = Object.values(data.flashcards)[0];
    progress.lastReviewed = new Date(Date.now() - 2 * 86400000).toISOString();
    progress.dueAt = new Date(Date.now() - 86400000).toISOString();
    localStorage.setItem(key, JSON.stringify(data));
  }, storageKey);
  await page.reload();
  await source.selectOption("due");
  await expect(page.locator(".flashcard-selection")).toContainText("Có 1 từ phù hợp");
  await page.goto("/hanh-trinh");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải bản sao nhật ký và tiến độ", exact: true }).click();
  const stream = await (await downloaded).createReadStream();
  const chunks = []; for await (const chunk of stream) chunks.push(chunk);
  const bytes = Buffer.concat(chunks), backup = JSON.parse(bytes.toString());
  assert.equal(Object.keys(backup.flashcards).length, 5, "Review history is included in the normal device backup");
  await page.evaluate(key => localStorage.removeItem(key), storageKey);
  await page.reload();
  const backupInput = page.getByLabel("Chọn bản sao nhật ký", { exact: true });
  await expect(backupInput).toBeEnabled();
  await backupInput.setInputFiles({ name: "flashcard-backup.json", mimeType: "application/json", buffer: bytes });
  await page.getByRole("button", { name: "Khôi phục bản sao", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(page.getByText("Đã khôi phục bản sao trên thiết bị.", { exact: true })).toBeVisible();
  assert.deepEqual(await stored(page), backup, "Restore retains journal, favorites and the exact review schedule");

  if (!mobile) {
    await page.goto("/tro-choi/flashcard");
    await source.selectOption("favorites");
    await page.locator(".flashcard-start").click();
    await page.getByRole("button", { name: "Bắt đầu thử tài", exact: true }).click();
    const target = await page.locator(".flashcard-prompt > strong").innerText();
    const options = page.locator(".flashcard-option");
    const paths = await options.locator("img").evaluateAll(images => images.map(image => new URL(image.src).pathname));
    const correct = paths.findIndex(path => words.some(word => word.illustration_path === path && word.word_en === target));
    const beforeFailure = await stored(page);
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException("Test storage full", "QuotaExceededError"); }; });
    await options.nth(correct).click();
    await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
    await expect(page.locator(".flashcard-saved")).toHaveCount(0);
    await expect(page.locator(".flashcard-results")).toContainText("Lịch ôn chưa được lưu đầy đủ");
    assert.deepEqual(await stored(page), beforeFailure, "Storage failures never overwrite existing progress");
  }
  assert.deepEqual(errors, [], "No browser errors");
  return { questions, wordsLearned: 5, backups: true, audio: true, mobile };
}
async function stored(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey); }

export async function checkFlashcardResultLayout(page, { words, mobile, screenshots }) {
  await page.goto("/tro-choi/flashcard");
  await page.evaluate(({ key, id }) => localStorage.setItem(key, JSON.stringify({ version: 1, favorites: [id], started: {}, finished: {}, activities: {}, journal: [] })), { key: storageKey, id: words[0].id });
  await page.reload();
  const source = page.getByRole("combobox", { name: "Bộ từ", exact: true });
  await expect(source).toBeEnabled();
  await source.selectOption("favorites");
  await page.locator(".flashcard-start").click();
  await page.getByRole("button", { name: "Bắt đầu thử tài", exact: true }).click();
  for (const correctAnswer of [false, true]) {
    const english = await page.locator(".flashcard-prompt > strong").innerText();
    const options = page.locator(".flashcard-option");
    await expect.poll(() => options.locator("img").evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
    const paths = await options.locator("img").evaluateAll(images => images.map(image => new URL(image.src).pathname));
    const correct = paths.findIndex(path => words.some(word => word.illustration_path === path && word.word_en === english));
    assert.ok(correct >= 0);
    await options.nth(correctAnswer ? correct : (correct + 1) % paths.length).click();
    assert.equal(await options.first().evaluate(element => getComputedStyle(element).opacity), "1", "Feedback keeps picture choices readable");
    await page.locator(".flashcard-feedback button").click();
  }
  await expect(page.locator(".flashcard-results")).toContainText("0/1");
  await expect.poll(() => page.locator(".flashcard-review-row img").evaluateAll(images => images.length > 0 && images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  const actions = page.locator(".flashcard-results .flashcard-actions .button");
  await expect(actions).toHaveCount(3);
  if (mobile) {
    await page.setViewportSize({ width: 320, height: 740 });
    const bounds = await actions.evaluateAll(elements => elements.map(element => { const rect = element.getBoundingClientRect(); return { width: rect.width, top: rect.top, bottom: rect.bottom }; }));
    assert.ok(bounds.every(bound => bound.width > 230), "Result actions stay readable at 320px");
    assert.ok(bounds.slice(1).every((bound, index) => bound.top >= bounds[index].bottom), "Result actions stack without overlap");
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator(".flashcard-results").screenshot({ path: `${screenshots}/flashcard-result-layout-${mobile ? "mobile" : "desktop"}.png` });
  return { layout: true, readableFeedback: true, mobile };
}
