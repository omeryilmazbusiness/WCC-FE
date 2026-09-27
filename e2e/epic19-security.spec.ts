import { expect, test, type Page } from "@playwright/test";

/**
 * Epic 19 — HttpOnly BFF session, CSRF, permission-driven nav/guards, security page.
 * Runs in demo mode (see playwright.config.ts).
 */

async function login(page: Page, email: string) {
  await page.goto("/en/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("ChangeMe123!");
  await page.getByRole("button", { name: /continue|متابعة/i }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"));
}

test.describe("Epic 19 security", () => {
  test("T-256 session cookies are HttpOnly and invisible to scripts", async ({ page, context }) => {
    await login(page, "manager@wodi.local");

    const cookies = await context.cookies();
    for (const name of ["wcc_at", "wcc_rt", "wcc_session"]) {
      const cookie = cookies.find((c) => c.name === name);
      expect(cookie, name).toBeDefined();
      expect(cookie?.httpOnly, name).toBe(true);
      expect(cookie?.sameSite, name).toBe("Lax");
      expect(cookie?.path, name).toBe("/");
    }
    const visible = await page.evaluate(() => document.cookie);
    expect(visible).not.toMatch(/wcc_(at|rt|session)=/);
  });

  test("T-256 proxy rejects mutations without the CSRF header", async ({ page }) => {
    await login(page, "manager@wodi.local");
    const res = await page.request.post("/api/proxy/leads", { data: {} });
    expect(res.status()).toBe(403);
    expect((await res.json()).error.code).toBe("csrf_failed");
  });

  test("T-256 proxy never exposes token endpoints", async ({ page }) => {
    await login(page, "manager@wodi.local");
    const res = await page.request.post("/api/proxy/auth/refresh", {
      headers: { "X-Requested-With": "wcc" },
      data: {},
    });
    expect(res.status()).toBe(404);
  });

  test("T-256 logout clears the session", async ({ page, context }) => {
    await login(page, "sales@wodi.local");
    const res = await page.request.post("/api/auth/logout", {
      headers: { "X-Requested-With": "wcc" },
    });
    expect(res.ok()).toBe(true);
    const names = (await context.cookies()).map((c) => c.name);
    expect(names).not.toContain("wcc_at");
    expect(names).not.toContain("wcc_rt");
    await page.goto("/en/workspace");
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test("T-247 admin lacks customers.read: no nav item, route guarded", async ({ page }) => {
    await login(page, "admin@wodi.local");
    await expect(page).toHaveURL(/\/en\/admin\/users/);
    const nav = page.locator("aside nav");
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: /^customers$/i })).toHaveCount(0);

    await page.goto("/en/customers");
    await expect(page).not.toHaveURL(/\/en\/customers/);
  });

  test("T-247 employee cannot open admin screens", async ({ page }) => {
    await login(page, "sales@wodi.local");
    await page.goto("/en/admin/users");
    await expect(page).toHaveURL(/\/en\/workspace/);
    await expect(page.locator("aside nav").getByRole("link", { name: /users/i })).toHaveCount(0);
  });

  test("T-254 unlock is offered only for locked accounts", async ({ page }) => {
    await login(page, "admin@wodi.local");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("table")).toBeVisible();
    const locked = await page.getByTestId("user-locked").count();
    await expect(page.getByTestId("user-unlock")).toHaveCount(locked);
  });

  test("T-252 security page is reachable for every role", async ({ page }) => {
    await login(page, "finance@wodi.local");
    await page.goto("/en/security");
    await expect(page.getByTestId("security-view")).toBeVisible();
    await expect(page.getByTestId("mfa-card")).toBeVisible();
  });
});
