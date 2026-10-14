import { expect, test } from "@playwright/test";

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`back to top scrolls gradually with motion preference ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/");
    await expect(page.locator(".footer-card")).toBeVisible();
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    const button = page.getByRole("button", { name: "Lên đầu trang", exact: true });
    await expect(button).toHaveCount(1);
    await expect(button).toBeEnabled();
    const initial = await page.evaluate(() => scrollY);
    await button.click();
    await page.waitForTimeout(300);
    const during = await page.evaluate(() => scrollY);
    expect(during).toBeGreaterThan(0);
    expect(during).toBeLessThan(initial);
    await expect.poll(() => page.evaluate(() => scrollY), { timeout: 6000 }).toBe(0);
  });
}
