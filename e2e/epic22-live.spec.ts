/**
 * Epic 22 acceptance against a running app + real backend (seeded dev users):
 * notification center updates live over SSE and acknowledge / resolve work.
 *   pnpm exec playwright test e2e/epic22-live.spec.ts --config=playwright.requests.config.ts
 */
import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const PASS = process.env.E2E_PASSWORD ?? "ChangeMe123!";
const API = process.env.E2E_API_URL ?? "http://localhost:8081/v1";

async function login(page: Page, email: string) {
  await page.goto("/en/login", { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASS);
  await page.getByRole("button", { name: /continue|sign in|submit/i }).click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 60_000 });
}

async function apiToken(request: APIRequestContext, email: string): Promise<string> {
  const res = await request.post(`${API}/auth/login`, { data: { email, password: PASS } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return (body.access_token ?? body.data?.access_token) as string;
}

test("notification center: live delivery, acknowledge, resolve", async ({ page, request }) => {
  const token = await apiToken(request, "gm@wodi.local");
  await login(page, "gm@wodi.local");
  await page.goto("/en/notifications?kind=report.ready");
  await expect(page.getByTestId("realtime-status")).toHaveText(/live/i, { timeout: 15_000 });

  const title = `E22 live ${randomUUID().slice(0, 8)}`;
  const emitted = await request.post(`${API}/notifications/emit`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { kind: "report.ready", title, body: "Delivered over SSE", entity_type: "report_run", entity_id: randomUUID() },
  });
  expect(emitted.status()).toBe(201);

  const row = page.getByTestId("notification-row").filter({ hasText: title });
  await expect(row, "appears without a reload").toBeVisible({ timeout: 10_000 });
  await expect(row.getByTestId("notification-status")).toHaveText("Open");

  await row.getByRole("button", { name: "Acknowledge" }).click();
  await expect(row.getByTestId("notification-status")).toHaveText("Acknowledged");

  await row.getByRole("button", { name: "Resolve" }).click();
  await expect(row, "resolved leaves the active list").toHaveCount(0);

  await page.getByRole("tab", { name: "Resolved" }).click();
  await expect(page.getByTestId("notification-row").filter({ hasText: title })).toBeVisible();
});
