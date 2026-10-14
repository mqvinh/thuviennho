import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3100",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node tests/start-server.mjs",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
