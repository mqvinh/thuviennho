import assert from "node:assert/strict";
import { expect } from "@playwright/test";

// Only device-local test data is written; this check never changes server data.
export async function checkJournalDrawing(page, { touch = false, fallback = false, screenshots } = {}) {
  if (fallback) await page.addInitScript(() => {
    Object.defineProperty(Element.prototype, "requestFullscreen", { configurable: true, value: undefined });
  });
  await page.goto("/nhat-ky", { timeout: 90_000 });
  const board = page.locator(".journal-artwork");
  const canvas = board.locator("canvas");
  const pen = board.getByRole("button", { name: "Bút vẽ", exact: true });
  const eraser = board.getByRole("button", { name: "Tẩy", exact: true });
  const clear = board.getByRole("button", { name: "Xóa toàn bộ hình vẽ", exact: true });
  const expand = board.getByRole("button", { name: "Phóng to khung vẽ", exact: true });
  const exit = board.getByRole("button", { name: "Thoát toàn màn hình", exact: true });
  const customColor = board.getByLabel("Chọn màu vẽ khác", { exact: true });
  await expect(pen).toBeEnabled({ timeout: 30_000 });
  await expect(clear).toBeDisabled();
  const bitmap = () => canvas.evaluate(target => target.toDataURL("image/png"));
  const pixel = (x, y) => canvas.evaluate((target, point) => Array.from(target.getContext("2d").getImageData(...point, 1, 1).data), [x, y]);
  const empty = () => canvas.evaluate(target => !target.getContext("2d").getImageData(0, 0, target.width, target.height).data.some((value, index) => index % 4 === 3 && value));
  const touchSession = touch ? await page.context().newCDPSession(page) : null;

  async function draw(x1, y1, x2 = x1, y2 = y1) {
    await canvas.scrollIntoViewIfNeeded();
    const rect = await canvas.evaluate(target => {
      const bounds = target.getBoundingClientRect();
      return { x: bounds.left + target.clientLeft, y: bounds.top + target.clientTop, width: target.clientWidth, height: target.clientHeight };
    });
    const start = { x: rect.x + x1 * rect.width / 800, y: rect.y + y1 * rect.height / 450 };
    const end = { x: rect.x + x2 * rect.width / 800, y: rect.y + y2 * rect.height / 450 };
    if (touchSession) {
      await touchSession.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await touchSession.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [end] });
      await touchSession.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(end.x, end.y, { steps: 8 });
      await page.mouse.up();
    }
  }

  await draw(100, 200, 700, 200);
  assert.ok((await pixel(400, 200))[3] > 0, "Pen draws opaque pixels");
  await eraser.click();
  await expect(eraser).toHaveAttribute("aria-pressed", "true");
  await draw(400, 180, 400, 220);
  assert.equal((await pixel(400, 200))[3], 0, "Eraser removes pixels rather than painting white");
  assert.ok((await pixel(150, 200))[3] > 0, "Eraser preserves other parts of the stroke");
  await board.getByRole("button", { name: "Màu đỏ", exact: true }).click();
  await expect(pen).toHaveAttribute("aria-pressed", "true");
  await draw(400, 300);
  assert.deepEqual(await pixel(400, 300), [227, 66, 66, 255], "Selecting a color returns to drawing after erasing");
  if (screenshots) await board.screenshot({ path: `${screenshots}/drawing-inline-${touch ? "touch" : "mouse"}.png` });

  const originalCanvas = await canvas.elementHandle();
  const before = await bitmap();
  await expand.click();
  await expect(board).toHaveAttribute("role", "dialog");
  await expect(exit).toBeFocused();
  await expect(eraser).toBeVisible();
  await expect(clear).toBeVisible();
  await expect(customColor).toBeVisible();
  assert.equal(await bitmap(), before, "Fullscreen preserves the drawing");
  assert.ok(await originalCanvas.evaluate(target => target === document.querySelector(".journal-artwork canvas")), "Fullscreen retains the same canvas element");
  assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
  assert.ok(await page.locator(".mobile-nav-shell").evaluate(target => target.inert));
  if (fallback) assert.equal(await page.evaluate(() => document.fullscreenElement), null);
  else await expect.poll(() => page.evaluate(() => document.fullscreenElement?.classList.contains("journal-artwork"))).toBe(true);
  await page.keyboard.press("Shift+Tab");
  await expect(customColor).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(exit).toBeFocused();

  for (const viewport of touch ? [{ width: 844, height: 390 }, { width: 320, height: 640 }, { width: 390, height: 844 }] : [{ width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    const fits = await board.evaluate(target => {
      const { left, top, right, bottom } = target.getBoundingClientRect();
      const elements = [...target.querySelectorAll("button, input, canvas")];
      return Math.abs(left) < 1 && Math.abs(top) < 1 && Math.abs(right - innerWidth) < 1 && Math.abs(bottom - innerHeight) < 1 && elements.every(element => {
        const rect = element.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth + 1 && rect.top >= 0 && rect.bottom <= innerHeight + 1;
      });
    });
    assert.ok(fits, `Fullscreen controls and canvas fit at ${viewport.width}x${viewport.height}`);
    assert.ok(await board.evaluate(target => [[20, 20], [innerWidth / 2, innerHeight - 20], [innerWidth - 20, innerHeight - 20]].every(([x, y]) => target.contains(document.elementFromPoint(x, y)))), "The fullscreen board covers floating menus and back-to-top controls");
    assert.equal(await bitmap(), before, "Resizing does not clear the canvas");
  }
  if (screenshots) await page.screenshot({ path: `${screenshots}/drawing-fullscreen-${touch ? "touch" : "mouse"}.png` });
  await exit.click();
  await expect(expand).toBeFocused();
  await expect(board).not.toHaveAttribute("role", "dialog");
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBe(null);
  assert.equal(await bitmap(), before, "Exiting fullscreen preserves the drawing");
  assert.equal(await page.evaluate(() => document.body.style.overflow), "");
  assert.equal(await page.locator(".mobile-nav-shell").evaluate(target => target.inert), false);

  await expand.click();
  if (fallback) await page.keyboard.press("Escape");
  else {
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
    await page.evaluate(() => document.exitFullscreen());
  }
  await expect(expand).toBeFocused();
  await expect(board).not.toHaveAttribute("role", "dialog");
  assert.equal(await bitmap(), before, "Browser fullscreen exit or Escape preserves the drawing");

  await expand.click();
  await clear.click();
  assert.ok(await empty(), "Clear-all works in fullscreen");
  await expect(clear).toBeDisabled();
  await board.getByRole("button", { name: "Màu xanh dương", exact: true }).click();
  await draw(400, 200);
  await eraser.click();
  await draw(400, 200);
  assert.ok(await empty(), "The eraser can remove an entire small drawing");
  await expect(board.locator(".journal-drawing-placeholder")).toBeVisible();
  await expect(clear).toBeDisabled();
  await customColor.evaluate(target => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(target, "#8652c7");
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(pen).toHaveAttribute("aria-pressed", "true");
  await draw(100, 350, 700, 350);
  assert.deepEqual(await pixel(400, 350), [134, 82, 199, 255], "Custom color works in fullscreen");
  const saved = await bitmap();
  await exit.click();
  const story = page.getByRole("combobox", { name: "Truyện em đã đọc", exact: true });
  const slug = await story.locator("option").evaluateAll(options => options.find(option => option.value)?.value);
  assert.ok(slug, "A published story is available");
  await story.selectOption(slug);
  await page.getByPlaceholder("Nhập tên nhân vật em thích…", { exact: true }).fill("Nhân vật kiểm thử");
  await page.getByPlaceholder("Viết điều em học được từ câu chuyện này…", { exact: true }).fill("Kiểm thử lưu nét vẽ sau khi tẩy và phóng to.");
  const entriesBefore = await page.locator(".journal-entry").count();
  await page.getByRole("button", { name: "Lưu nhật ký", exact: true }).click();
  await expect(page.locator(".journal-entry")).toHaveCount(entriesBefore + 1);
  await expect(page.locator(".journal-entry").first().locator("img")).toHaveAttribute("src", saved);
  await page.reload();
  await expect(page.locator(".journal-entry").first().locator("img")).toHaveAttribute("src", saved);
  assert.ok(await empty(), "A saved journal resets only the draft drawing");
  await touchSession?.detach();
}
