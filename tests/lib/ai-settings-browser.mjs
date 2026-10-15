import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

export async function aiSettingsBrowser({ frontendUrl, cookie }) {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const context = await browser.newContext();
    await context.addCookies(cookie.split("; ").map(item => {
      const index = item.indexOf("=");
      return { name: item.slice(0, index), value: item.slice(index + 1), url: frontendUrl };
    }));
    const page = await context.newPage();
    await page.goto(frontendUrl + "/admin/cai-dat", { timeout: 120_000 });
    await expect(page.getByLabel("Địa chỉ API", { exact: true })).toHaveValue("https://ai-provider.example/v1/responses");
    const keyInput = page.getByLabel("API key", { exact: true });
    await expect(keyInput).toHaveAttribute("type", "password");
    await expect(keyInput).toHaveValue("");
    await expect(page.getByLabel("Model", { exact: true })).toHaveValue("test-configured-model");
    await keyInput.fill("test-private-ai-key");
    await page.getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Đã hiểu", exact: true }).click();
    await expect(keyInput).toHaveValue("");
    await expect(page.getByLabel("Xóa API key hiện tại", { exact: true })).not.toBeChecked();
    assert.ok(!(await page.content()).includes("test-private-ai-key"));
    await mkdir(".data/project-check", { recursive: true });
    await page.screenshot({ path: ".data/project-check/ai-settings-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: ".data/project-check/ai-settings-mobile.png", fullPage: true });
    await page.reload();
    await expect(keyInput).toHaveValue("");
    await expect(page.getByLabel("Model", { exact: true })).toHaveValue("test-configured-model");
    console.log("AI settings browser passed save/reload, cleared secret input and mobile layout.");
  } finally { await browser.close(); }
}
