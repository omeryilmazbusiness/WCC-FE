import { expect, test, type Page } from "@playwright/test";

/**
 * Epic 17 — FE acceptance / hardening (T-213…T-216).
 * Complements F8–F11 smoke with RTL, mobile, and state-panel coverage.
 */

async function login(page: Page, email: string) {
  await page.goto("/en/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("ChangeMe123!");
  await page.getByRole("button", { name: /continue|متابعة/i }).click();
  await page.waitForURL(/\/(en|ar)\/(manager|workspace|finance)/);
}

test.describe("Epic 17 acceptance", () => {
  test("T-213 RTL on manager + inbox + bookings", async ({ page }) => {
    await login(page, "manager@wodi.local");
    await page.goto("/ar/manager");
    await expect(page.locator('[lang="ar"][dir="rtl"]')).toBeVisible();
    await expect(page.getByTestId("manager-kpis")).toBeVisible();

    await page.goto("/ar/inbox");
    await expect(page.locator('[dir="rtl"]')).toBeVisible();

    await page.goto("/ar/bookings");
    await expect(page.locator('[dir="rtl"]')).toBeVisible();
  });

  test("T-213 LTR still works on employee workspace", async ({ page }) => {
    await login(page, "sales@wodi.local");
    await page.goto("/en/workspace");
    await expect(page.locator('[lang="en"][dir="ltr"]')).toBeVisible();
    await expect(page.getByTestId("employee-home")).toBeVisible();
  });

  test("T-214 mobile viewport keeps left shell nav", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, "sales@wodi.local");

    await page.goto("/en/inbox");
    await expect(page.getByTestId("app-shell")).toBeVisible();
    await expect(page.locator("aside nav")).toBeVisible();

    await page.goto("/en/tasks");
    await expect(page.locator("aside nav")).toBeVisible();

    await page.goto("/en/bookings");
    await expect(page.locator("aside nav")).toBeVisible();
  });

  test("T-215 PDF-style journey surfaces reachable", async ({ page }) => {
    await login(page, "manager@wodi.local");
    for (const path of [
      "/en/inbox",
      "/en/pipeline",
      "/en/bookings",
      "/en/finance",
      "/en/targets",
      "/en/reports",
    ]) {
      await page.goto(path);
      await expect(page.getByTestId("app-shell")).toBeVisible();
    }
  });

  test("T-216 empty/loading primitives mount without crash", async ({
    page,
  }) => {
    await login(page, "manager@wodi.local");
    await page.goto("/en/reports");
    await expect(page.getByTestId("app-shell")).toBeVisible();
    // Reports board may show empty or data — shell must remain stable
    await expect(page.locator("main")).toBeVisible();
  });
});
