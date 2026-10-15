import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { checkFlashcardGame, checkFlashcardResultLayout } from "./lib/flashcards-browser.mjs";

const args = process.argv.slice(2), origin = new URL(args[0]).origin;
const option = name => args[args.indexOf(name) + 1];
assert.ok(args.includes("--words"), "Supply a vocabulary snapshot with --words");
const words = JSON.parse(await readFile(option("--words"), "utf8"));
const directory = ".data/project-check/flashcards";
await mkdir(directory, { recursive: true });
let browserServer, browser;
const processes = [], checks = [];
try {
  let bypass;
  if (args.includes("--protection-config")) {
    const raw = await readFile(option("--protection-config"));
    const project = JSON.parse(raw.toString(raw[0] === 255 && raw[1] === 254 ? "utf16le" : "utf8").replace(/^\uFEFF/, ""));
    bypass = Object.keys(project.protectionBypass || {})[0];
    assert.ok(bypass, "Preview access is configured");
  }
  browserServer = await chromium.launchServer({ headless: true });
  const child = browserServer.process();
  processes.push({ kind: "playwright-headless-shell", pid: child.pid, parentPid: process.pid, createdAt: new Date().toISOString(), port: Number(new URL(browserServer.wsEndpoint()).port), profile: child.spawnargs.find(arg => arg.startsWith("--user-data-dir="))?.slice("--user-data-dir=".length) });
  await writeFile(".data/flashcards-owned-processes.json", JSON.stringify({ processes, status: "running" }, null, 2));
  console.log(JSON.stringify({ origin, processes }));
  browser = await chromium.connect(browserServer.wsEndpoint());
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ baseURL: origin, viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 1000 }, isMobile: mobile, hasTouch: mobile, acceptDownloads: true });
    try {
      if (bypass) await context.route(origin + "/**", route => route.continue({ headers: { ...route.request().headers(), "x-vercel-protection-bypass": bypass } }));
      const check = args.includes("--layout-only") ? checkFlashcardResultLayout : checkFlashcardGame;
      const result = await check(await context.newPage(), { words, mobile, screenshots: directory });
      checks.push(result);
      console.log(JSON.stringify({ passed: result }));
    } finally { await context.close(); }
  }
  await writeFile(".data/flashcards-browser-check.json", JSON.stringify({ origin, checkedAt: new Date().toISOString(), checks }, null, 2));
} finally {
  try { await browser?.close(); }
  finally {
    await browserServer?.close();
    const browserClosed = !browserServer || browserServer.process().exitCode !== null;
    await writeFile(".data/flashcards-owned-processes.json", JSON.stringify({ processes, status: "finished", browserClosed }, null, 2));
    console.log(JSON.stringify({ browserClosed }));
  }
}
