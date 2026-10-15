import { test } from "@playwright/test";
import { checkJournalDrawing } from "./lib/journal-drawing-browser.mjs";

test.use({ channel: "chromium-headless-shell" });

test("journal drawing supports real erasing, fullscreen controls and saving", async ({ page }) => {
  await checkJournalDrawing(page);
});

test.describe("mobile drawing without the native Fullscreen API", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test("retains tools and artwork in portrait and landscape", async ({ page }) => {
    await checkJournalDrawing(page, { touch: true, fallback: true });
  });
});
