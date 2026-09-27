import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "pnpm exec next build && pnpm exec next start --port 3000 --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000/en/login",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_DEMO_MODE: "true",
      API_BASE_URL: process.env.API_BASE_URL ?? "http://127.0.0.1:9/v1",
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:9/v1",
      SESSION_SECRET: process.env.SESSION_SECRET ?? "e2e-only-session-secret-0123456789abcdef",
      COOKIE_SECURE: "false",
    },
  },
});
