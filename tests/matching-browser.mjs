import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { checkMatchingGame, checkMatchingLayout } from "./lib/matching-browser.mjs";
import { checkFlashcardGame } from "./lib/flashcards-browser.mjs";

const args = process.argv.slice(2), origin = new URL(args[0]).origin;
const option = name => args[args.indexOf(name) + 1];
assert.ok(args.includes("--words"), "Supply a sanitized vocabulary snapshot with --words");
const words = JSON.parse(await readFile(option("--words"), "utf8"));
const directory = ".data/project-check/matching", checks = [], processes = [];
await mkdir(directory, { recursive: true });
let browserServer, browser;
try {
  let bypass;
  if (args.includes("--protection-config")) {
    const raw = await readFile(option("--protection-config"));
    const project = JSON.parse(raw.toString(raw[0] === 255 && raw[1] === 254 ? "utf16le" : "utf8").replace(/^\uFEFF/, ""));
    bypass = Object.keys(project.protectionBypass || {})[0];
    assert.ok(bypass);
  }
  browserServer = await chromium.launchServer({ headless: true });
  const child = browserServer.process();
  processes.push({ kind: "playwright-headless-shell", pid: child.pid, parentPid: process.pid, createdAt: new Date().toISOString(), port: Number(new URL(browserServer.wsEndpoint()).port), profile: child.spawnargs.find(arg => arg.startsWith("--user-data-dir="))?.slice("--user-data-dir=".length) });
  await writeFile(".data/matching-owned-processes.json", JSON.stringify({ processes, status: "running" }, null, 2));
  console.log(JSON.stringify({ origin, processes }));
  browser = await chromium.connect(browserServer.wsEndpoint());
  const tasks = args.includes("--layout-only") ? [{ name: "layout-desktop", check: checkMatchingLayout, mobile: false }, { name: "layout-mobile", check: checkMatchingLayout, mobile: true }] : args.includes("--flashcard-only") ? [{ name: "flashcard-regression", check: checkFlashcardGame, mobile: false }] : [{ name: "matching-desktop", check: checkMatchingGame, mobile: false }, { name: "matching-mobile", check: checkMatchingGame, mobile: true }, { name: "flashcard-regression", check: checkFlashcardGame, mobile: false }];
  for (const task of tasks) {
    const context = await browser.newContext({ baseURL: origin, viewport: task.mobile ? { width: 390, height: 844 } : { width: 1280, height: 1000 }, isMobile: task.mobile, hasTouch: task.mobile, acceptDownloads: true });
    const page = await context.newPage();
    try {
      if (bypass) await context.route(origin + "/**", route => route.continue({ headers: { ...route.request().headers(), "x-vercel-protection-bypass": bypass } }));
      const result = await task.check(page, { words, mobile: task.mobile, screenshots: directory });
      checks.push({ name: task.name, ...result });
      console.log(JSON.stringify({ passed: task.name, ...result }));
    } catch (error) {
      await page.screenshot({ path: `${directory}/failure-${task.name}.png`, fullPage: true }).catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
  await writeFile(args.includes("--layout-only") ? ".data/matching-layout-check.json" : ".data/matching-browser-check.json", JSON.stringify({ origin, checkedAt: new Date().toISOString(), checks }, null, 2));
} finally {
  try { await browser?.close(); }
  finally {
    await browserServer?.close();
    const browserClosed = !browserServer || browserServer.process().exitCode !== null;
    await writeFile(".data/matching-owned-processes.json", JSON.stringify({ processes, status: "finished", browserClosed }, null, 2));
    console.log(JSON.stringify({ browserClosed }));
  }
}
