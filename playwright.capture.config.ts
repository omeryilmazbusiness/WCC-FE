import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/capture-role-screens.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 900 },
  },
  // Reuse existing `pnpm dev` on :3000
});
