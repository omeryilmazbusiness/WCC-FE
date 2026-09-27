import { defineConfig, devices } from "@playwright/test";

/** Request-budget audit against an already running app + real backend (no demo mode). */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /request-budget\.spec\.ts$/,
  workers: 1,
  timeout: 600_000,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    ...devices["Desktop Chrome"],
  },
});
