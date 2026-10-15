import assert from "node:assert/strict";
import { expect as baseExpect } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 25_000 });
const storageKey = "little-readers-device-v1";
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
const readyImages = locator => expect.poll(() => locator.evaluateAll(images => images.length > 0 && images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);

export async function checkMatchingGame(page, { words, mobile, screenshots }) {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const activate = locator => mobile ? locator.tap() : locator.click();
  await page.goto("/tro-choi", { timeout: 90_000 });
  await expect(page.locator(".game-card")).toHaveCount(3);
  const seed = { version: 1, favorites: [words[0].id], started: {}, finished: {}, activities: {}, journal: [{ id: "00000000-0000-4000-a000-000000000002", slug: "test-story", title: "Nhật ký cần giữ", character: "Bạn", lesson: "Dữ liệu cũ", image: "", date: "2026-10-10T03:00:00.000Z" }], flashcards: { "test-story:book:sach": { attempts: 1, correct: 1, streak: 1, lastReviewed: "2026-10-13T04:00:00.000Z", dueAt: "2026-10-14T17:00:00.000Z" } } };
  await page.evaluate(({ key, seed }) => localStorage.setItem(key, JSON.stringify(seed)), { key: storageKey, seed });
  await page.reload();
  await page.locator('.game-card-link[href="/tro-choi/ghep-tu-voi-hinh"]').click();
  await expect(page).toHaveURL(/\/tro-choi\/ghep-tu-voi-hinh$/);
  const source = page.getByRole("combobox", { name: "Bộ từ", exact: true });
  await expect(source).toBeEnabled();
  if (mobile) {
    await page.getByRole("navigation", { name: "Menu chính trên di động" }).getByRole("button", { name: "Thêm", exact: true }).tap();
    await expect(page.locator(".mobile-more-sheet").getByRole("link", { name: /Khu trò chơi/ })).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Escape");
  } else await expect(page.locator(".navigation").getByRole("link", { name: /Khu trò chơi/ })).toHaveAttribute("aria-current", "page");
  await source.selectOption("favorites");
  await expect(page.locator(".matching-selection")).toContainText("Có 1 từ khác nhau");
  await expect(page.locator(".matching-start")).toBeDisabled();
  await source.selectOption("all");
  const story = page.getByRole("combobox", { name: "Truyện", exact: true });
  const theme = page.getByRole("combobox", { name: "Chủ đề", exact: true });
  await story.selectOption(await story.locator("option").evaluateAll(options => options.find(option => option.value)?.value));
  await theme.selectOption(await theme.locator("option").evaluateAll(options => options.find(option => option.value)?.value));
  await expect(story).toHaveValue("");
  await theme.selectOption("");
  await expect(page.locator(".matching-selection")).toContainText("12 cặp trong 3 vòng");
  if (mobile) {
    await page.setViewportSize({ width: 320, height: 740 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${screenshots}/setup-320.png`, fullPage: true });
    await page.emulateMedia({ reducedMotion: "reduce" });
  }
  await page.locator(".matching-start").click();
  const seen = new Set();
  let pairs = 0;
  for (let round = 0; round < 3; round++) {
    await expect(page.locator(".matching-progress")).toContainText(`Vòng ${round + 1}/3`);
    const tiles = page.locator(".matching-tile");
    await expect(tiles).toHaveCount(4);
    await readyImages(tiles.locator("img"));
    const paths = await tiles.locator("img").evaluateAll(images => images.map(image => new URL(image.src).pathname));
    const board = paths.map(path => words.find(word => word.illustration_path === path));
    assert.ok(board.every(Boolean), `Every picture belongs to the shared vocabulary: ${JSON.stringify(paths)}`);
    for (const word of board) { assert.ok(!seen.has(word.word_en)); seen.add(word.word_en); }
    assert.equal(await page.locator(".matching-slot").filter({ hasText: "Ghép từ vào đây" }).count(), 4);
    if (round === 0) {
      await tiles.first().evaluate(element => { const transfer = new DataTransfer(); transfer.setData("text/plain", "external-id"); element.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer })); });
      assert.deepEqual((await stored(page)).matching, undefined, "Foreign drag payloads never record progress");
      const first = page.locator(".matching-word-select").getByText(board[0].word_en, { exact: true });
      await activate(first);
      await page.keyboard.press("Escape");
      await expect(page.locator(".matching-word.is-selected")).toHaveCount(0);
      await activate(first);
      await activate(tiles.nth(1));
      await expect(page.locator(".matching-feedback")).toContainText("Chưa khớp");
      await expect(page.locator(".matching-tile.is-matched")).toHaveCount(0);
      await page.getByRole("button", { name: `Nghe tiếng Anh: ${board[0].word_en}`, exact: true }).click();
      await expect.poll(() => page.locator(".matching-game audio").evaluate(audio => audio.duration > .2 && audio.error === null)).toBe(true);
      await page.locator(".matching-game audio").evaluate(audio => audio.pause());
    }
    for (let index = 0; index < board.length; index++) {
      const word = board[index], chip = page.locator(".matching-word-select").filter({ hasText: word.word_en });
      if (!mobile && round === 0 && index === 1) await chip.dragTo(tiles.nth(index));
      else {
        if (!(round === 0 && index === 0)) await activate(chip);
        if (!mobile && round === 0 && index === 0) { await tiles.nth(index).focus(); await page.keyboard.press("Enter"); }
        else await activate(tiles.nth(index));
      }
      await expect(tiles.nth(index)).toBeDisabled();
      await expect(chip).toBeDisabled();
      // Native disabled controls plus the session guard prevent duplicate writes.
      await tiles.nth(index).evaluate(element => element.click());
      const data = await stored(page);
      assert.equal(Object.values(data.matching).reduce((sum, item) => sum + item.plays, 0), ++pairs);
      assert.deepEqual(data.flashcards, seed.flashcards);
      assert.deepEqual(data.journal, seed.journal);
      assert.deepEqual(data.favorites, seed.favorites);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Board and word bank fit the screen");
    if (round === 0) await page.locator(".matching-play").screenshot({ path: `${screenshots}/board-${mobile ? "mobile" : "desktop"}.png` });
    await page.getByRole("button", { name: round < 2 ? "Vòng tiếp theo" : "Xem kết quả", exact: true }).click();
  }
  await expect(page.locator(".matching-results")).toContainText("11/12");
  await expect(page.locator(".flashcard-saved")).toBeVisible();
  await expect(page.locator(".flashcard-review-row")).toHaveCount(12);
  const completed = await stored(page);
  assert.equal(Object.keys(completed.matching).length, 12);
  assert.equal(Object.values(completed.matching).reduce((sum, item) => sum + item.firstTry, 0), 11);
  assert.equal(Object.values(completed.matching).reduce((sum, item) => sum + item.mistakes, 0), 1);
  await page.locator(".matching-results").screenshot({ path: `${screenshots}/result-${mobile ? "mobile" : "desktop"}.png` });
  await page.getByRole("button", { name: "Luyện lại từ sai", exact: true }).click();
  await expect(page.locator(".matching-tile")).toHaveCount(1);
  const retryPath = await page.locator(".matching-tile img").evaluate(image => new URL(image.src).pathname);
  const retry = words.find(word => word.illustration_path === retryPath);
  await page.locator(".matching-word-select").filter({ hasText: retry.word_en }).click();
  await page.locator(".matching-tile").click();
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  assert.deepEqual((await stored(page)).matching, completed.matching, "Retry practice never inflates first-try history");
  await page.reload();
  assert.deepEqual((await stored(page)).matching, completed.matching);

  await page.goto("/hanh-trinh");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải bản sao nhật ký và tiến độ", exact: true }).click();
  const stream = await (await download).createReadStream(), chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const bytes = Buffer.concat(chunks), backup = JSON.parse(bytes.toString());
  assert.deepEqual(backup.matching, completed.matching);
  await page.evaluate(key => localStorage.removeItem(key), storageKey);
  await page.reload();
  const input = page.getByLabel("Chọn bản sao nhật ký", { exact: true });
  await expect(input).toBeEnabled();
  await input.setInputFiles({ name: "matching-backup.json", mimeType: "application/json", buffer: bytes });
  await page.getByRole("button", { name: "Khôi phục bản sao", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await expect(page.getByText("Đã khôi phục bản sao trên thiết bị.", { exact: true })).toBeVisible();
  assert.deepEqual(await stored(page), backup);

  const favorites = [...new Map(words.map(word => [word.word_en, word])).values()].slice(0, 2);
  await page.evaluate(({ key, ids }) => { const data = JSON.parse(localStorage.getItem(key)); data.favorites = ids; localStorage.setItem(key, JSON.stringify(data)); }, { key: storageKey, ids: favorites.map(word => word.id) });
  await page.goto("/tro-choi/ghep-tu-voi-hinh");
  await expect(source).toBeEnabled();
  await source.selectOption("favorites");
  await page.getByRole("combobox", { name: "Ngôn ngữ ghép", exact: true }).selectOption("vi");
  await page.locator(".matching-start").click();
  await expect(page.locator(".matching-tile")).toHaveCount(2);
  for (const word of favorites) {
    await page.locator(".matching-word-select").getByText(word.word_vi, { exact: true }).click();
    await page.locator(".matching-tile").filter({ has: page.locator(`img[src$="${word.illustration_path}"]`) }).click();
  }
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  const bilingual = await stored(page);
  assert.equal(Object.keys(bilingual.matching).filter(key => key.startsWith("vi:")).length, 2);
  assert.deepEqual(Object.fromEntries(Object.entries(bilingual.matching).filter(([key]) => key.startsWith("en:"))), completed.matching);
  assert.deepEqual(bilingual.flashcards, seed.flashcards);

  if (!mobile) {
    await page.getByRole("button", { name: "Chơi lượt mới", exact: true }).click();
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException("Test storage full", "QuotaExceededError"); }; });
    for (const word of favorites) {
      await page.locator(".matching-word-select").getByText(word.word_vi, { exact: true }).click();
      await page.locator(".matching-tile").filter({ has: page.locator(`img[src$="${word.illustration_path}"]`) }).click();
    }
    await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
    await expect(page.locator(".flashcard-saved")).toHaveCount(0);
    await expect(page.locator(".flashcard-message")).toContainText("Kết quả chưa được lưu đầy đủ");
    assert.deepEqual(await stored(page), bilingual, "Storage failures preserve prior history");
  }
  assert.deepEqual(errors, []);
  return { mobile, pairs, rounds: 3, audio: true, drag: !mobile, keyboard: !mobile, vietnamese: true, backups: true, separateFlashcardHistory: true };
}

export async function checkMatchingLayout(page, { words, mobile, screenshots }) {
  await page.goto("/tro-choi/ghep-tu-voi-hinh");
  const chosen = ["walk slowly", "water bottle", "library", "grandma"].map(english => words.find(word => word.word_en === english));
  assert.ok(chosen.every(Boolean));
  await page.evaluate(({ key, ids }) => localStorage.setItem(key, JSON.stringify({ version: 1, favorites: ids, started: {}, finished: {}, activities: {}, journal: [] })), { key: storageKey, ids: chosen.map(word => word.id) });
  await page.reload();
  const source = page.getByRole("combobox", { name: "Bộ từ", exact: true });
  await expect(source).toBeEnabled();
  await source.selectOption("favorites");
  if (mobile) {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.emulateMedia({ reducedMotion: "reduce" });
  }
  await page.locator(".matching-start").click();
  const tiles = page.locator(".matching-tile");
  await readyImages(tiles.locator("img"));
  const board = await tiles.locator("img").evaluateAll(images => images.map(image => new URL(image.src).pathname));
  const first = chosen.find(word => word.illustration_path === board[0]);
  await page.locator(".matching-word-select").getByText(first.word_en, { exact: true }).click();
  await tiles.nth(1).click();
  if (mobile) assert.equal(await page.locator(".matching-tile.is-wrong").evaluate(element => getComputedStyle(element).animationName), "none", "Reduced motion disables the wrong-match shake");
  const lines = await page.locator(".matching-word-select > span").evaluateAll(elements => elements.map(element => { const range = document.createRange(); range.selectNodeContents(element); return new Set([...range.getClientRects()].map(rect => rect.y)).size; }));
  assert.ok(lines.every(count => count === 1), "Long English words and phrases stay intact at 320px");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator(".matching-play").screenshot({ path: `${screenshots}/layout-${mobile ? "mobile-320" : "desktop"}.png` });
  for (let index = 0; index < board.length; index++) {
    const word = chosen.find(word => word.illustration_path === board[index]);
    if (index) await page.locator(".matching-word-select").getByText(word.word_en, { exact: true }).click();
    await tiles.nth(index).click();
  }
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await expect(page.locator(".matching-results")).toContainText("3/4");
  await page.locator(".matching-results").screenshot({ path: `${screenshots}/result-layout-${mobile ? "mobile-320" : "desktop"}.png` });
  return { mobile, layout: true, intactWordLabels: true, reducedMotion: mobile };
}
