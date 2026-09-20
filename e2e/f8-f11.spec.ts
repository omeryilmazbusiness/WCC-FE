import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/en/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("ChangeMe123!");
  await page.getByRole("button", { name: /continue|متابعة/i }).click();
  await page.waitForURL(/\/(en|ar)\/(manager|workspace)/);
}

test.describe("F8–F11 smoke", () => {
  test("manager dashboard shows KPIs and team table", async ({ page }) => {
    await login(page, "manager@wodi.local");
    await expect(page).toHaveURL(/\/en\/manager/);
    await expect(page.getByTestId("manager-kpis")).toBeVisible();
    await expect(page.getByTestId("manager-team")).toBeVisible();
    await expect(page.getByTestId("manager-quick-actions")).toBeVisible();
    await expect(page.getByTestId("manager-kpis").getByText("—")).toHaveCount(0);
  });

  test("employee workspace queue + target + pipeline", async ({ page }) => {
    await login(page, "sales@wodi.local");
    await expect(page).toHaveURL(/\/en\/workspace/);
    await expect(page.getByTestId("employee-home")).toBeVisible();
    await expect(page.getByTestId("my-work-today")).toBeVisible();
    await expect(page.getByTestId("target-placeholder")).toBeVisible();
    await expect(page.getByTestId("my-pipeline")).toBeVisible();
    await expect(page.getByTestId("task-queue")).toBeVisible();
  });

  test("lead → booking → task + complete (F10/F11)", async ({ page }) => {
    await login(page, "sales@wodi.local");

    await page.goto("/en/pipeline");
    await page.getByRole("button", { name: /new lead|عميل محتمل جديد/i }).click();
    const stamp = Date.now();
    await page.locator("form input").first().fill(`E2E Pilgrim ${stamp}`);
    await page.locator("form input").nth(1).fill(`+9665${String(stamp).slice(-8)}`);
    await page.getByRole("button", { name: /^save$|^حفظ$/i }).click();
    await expect(page.getByText(`E2E Pilgrim ${stamp}`)).toBeVisible();

    await page.goto("/en/customers/demo-1");
    await page.getByRole("tab", { name: /bookings|الحجوزات/i }).click();
    await page.getByTestId("confirm-booking-tasks").click();
    await expect(
      page.getByText(/ops tasks ready|مهام التشغيل جاهزة/i),
    ).toBeVisible();

    await page.goto("/en/tasks");
    const complete = page.locator('[data-testid^="complete-task-"]').first();
    await expect(complete).toBeVisible();
    await complete.click();
    await expect(page.getByText(/task completed|اكتملت المهمة/i)).toBeVisible();
  });

  test("i18n AR smoke on workspace", async ({ page }) => {
    await login(page, "sales@wodi.local");
    await page.goto("/ar/workspace");
    await expect(page.locator('[lang="ar"][dir="rtl"]')).toBeVisible();
    await expect(page.getByTestId("employee-home")).toBeVisible();
    await expect(page.getByTestId("my-work-today")).toBeVisible();
  });
});
