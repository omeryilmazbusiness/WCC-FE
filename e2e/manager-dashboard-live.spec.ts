/**
 * Manager dashboard against a running app + real backend (seeded dev users): search sits in
 * the screen (not the header), long cards page instead of growing, paired cards line up.
 *   pnpm exec playwright test e2e/manager-dashboard-live.spec.ts --config=playwright.requests.config.ts
 */
import { expect, test, type Page } from "@playwright/test";

const PASS = process.env.E2E_PASSWORD ?? "ChangeMe123!";
const PAGE_SIZE = 5;

async function login(page: Page, email: string) {
  await page.goto("/en/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASS);
  await page.getByRole("button", { name: /continue|sign in|submit/i }).click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 60_000 });
}

test("GM dashboard: filtered search narrows by type and opens the right record", async ({ page }) => {
  await login(page, "gm@wodi.local");
  await page.goto("/en/manager");
  const input = page.getByTestId("global-search");
  await input.fill("al");
  const results = page.getByTestId("global-search-results");
  const hits = results.getByTestId("global-search-hit");
  await expect(hits.first()).toBeVisible({ timeout: 15_000 });
  const allCount = await hits.count();

  await page.getByTestId("search-filter-trigger").click();
  await page.getByRole("menuitemradio", { name: "Bookings" }).click();
  await page.keyboard.press("Escape");
  const chips = page.getByTestId("active-filters");
  await expect(chips).toContainText("Type:Bookings");
  await expect(page.getByTestId("search-filter-trigger")).toContainText("1");

  await input.click();
  await expect(hits.first()).toContainText("Booking");
  const bookingCount = await hits.count();
  expect(bookingCount).toBeLessThanOrEqual(allCount);
  for (let i = 0; i < bookingCount; i++) {
    await expect(hits.nth(i).locator("span").last()).toHaveText("Booking");
  }

  await input.press("ArrowDown");
  await input.press("ArrowUp");
  await input.press("Enter");
  await page.waitForURL(/\/en\/bookings\/[0-9a-f-]{36}$/, { timeout: 15_000 });

  await page.goto("/en/manager");
  await expect(page.getByTestId("active-filters")).toHaveCount(0);
  await page.getByTestId("global-search").fill("al");
  await page.getByTestId("search-filter-trigger").click();
  await page.getByRole("menuitemradio", { name: "Customers" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Remove filter Type: Customers/ }).click();
  await expect(page.getByTestId("active-filters")).toHaveCount(0);
});

test("GM dashboard: in-screen search, paged attention card, symmetric cards", async ({ page }) => {
  await login(page, "gm@wodi.local");
  await page.goto("/en/manager");
  const attention = page.getByTestId("manager-attention");
  await expect(attention).toBeVisible({ timeout: 30_000 });

  await expect(page.locator("header").getByTestId("global-search")).toHaveCount(0);
  await expect(page.locator("main").getByTestId("global-search")).toBeVisible();
  await expect(page.getByTestId("manager-quick-actions")).toBeVisible();

  const total = Number(await attention.getByTestId("widget-count").textContent());
  const rows = attention.getByTestId("attention-row");
  await expect(rows).toHaveCount(Math.min(total, PAGE_SIZE));

  const before = await attention.boundingBox();
  const team = await page.getByTestId("manager-team").boundingBox();
  expect(Math.round(before!.height)).toBe(Math.round(team!.height));

  if (total > PAGE_SIZE) {
    const firstTitle = await rows.first().textContent();
    await attention.getByRole("button", { name: "Next page" }).click();
    await expect(rows.first()).not.toHaveText(firstTitle ?? "");
    await expect(attention.getByRole("button", { name: "Page 2 of", exact: false })).toHaveAttribute("aria-current", "page");
    const after = await attention.boundingBox();
    expect(Math.round(after!.height), "card keeps its size on every page").toBe(Math.round(before!.height));
  } else {
    await expect(attention.getByTestId("pager")).toHaveCount(0);
  }
});
