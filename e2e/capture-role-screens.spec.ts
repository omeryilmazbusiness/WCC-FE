/**
 * Capture full-page screenshots for every demo role × accessible screen.
 * Run: pnpm exec playwright test e2e/capture-role-screens.spec.ts --config=playwright.capture.config.ts
 */
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const OUT = path.join(process.cwd(), "docs", "role-screenshots");
const BASE = "http://127.0.0.1:3000";
const PASS = "ChangeMe123!";

type RoleSpec = {
  id: string;
  email: string;
  label: string;
  home: string;
  screens: { key: string; path: string; title: string }[];
};

const SHARED = [
  { key: "pipeline", path: "/en/pipeline", title: "CRM Pipeline" },
  { key: "tasks", path: "/en/tasks", title: "Tasks" },
  { key: "customers", path: "/en/customers", title: "Customers" },
  {
    key: "customer-360",
    path: "/en/customers/demo-1",
    title: "Customer 360",
  },
  { key: "packages", path: "/en/packages", title: "Packages" },
  {
    key: "package-detail",
    path: "/en/packages/pkg-umrah-standard",
    title: "Package Detail / Departures",
  },
];

const ADMIN = [
  { key: "admin-users", path: "/en/admin/users", title: "Admin — Users" },
  { key: "admin-roles", path: "/en/admin/roles", title: "Admin — Roles" },
  { key: "admin-audit", path: "/en/admin/audit", title: "Admin — Audit" },
];

const ROLES: RoleSpec[] = [
  {
    id: "gm",
    email: "gm@wodi.local",
    label: "General Manager (gm)",
    home: "/en/manager",
    screens: [
      { key: "home", path: "/en/manager", title: "Manager Dashboard" },
      ...SHARED,
      ...ADMIN,
    ],
  },
  {
    id: "manager",
    email: "manager@wodi.local",
    label: "Branch Manager (manager)",
    home: "/en/manager",
    screens: [
      { key: "home", path: "/en/manager", title: "Manager Dashboard" },
      ...SHARED,
    ],
  },
  {
    id: "employee",
    email: "sales@wodi.local",
    label: "Sales Employee (employee)",
    home: "/en/workspace",
    screens: [
      { key: "home", path: "/en/workspace", title: "My Work / Workspace" },
      ...SHARED,
    ],
  },
  {
    id: "admin",
    email: "admin@wodi.local",
    label: "System Admin (admin)",
    home: "/en/admin/users",
    screens: [
      { key: "home", path: "/en/admin/users", title: "Admin — Users (home)" },
      ...SHARED,
      ...ADMIN,
    ],
  },
  {
    id: "finance",
    email: "finance@wodi.local",
    label: "Finance (finance)",
    home: "/en/manager",
    screens: [
      { key: "home", path: "/en/manager", title: "Manager Dashboard (landing)" },
      ...SHARED,
    ],
  },
  {
    id: "operations",
    email: "ops@wodi.local",
    label: "Operations (operations)",
    home: "/en/workspace",
    screens: [
      { key: "home", path: "/en/workspace", title: "Workspace (landing)" },
      ...SHARED,
    ],
  },
];

async function login(page: Page, email: string) {
  await page.goto(`${BASE}/en/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASS);
  await page.getByRole("button", { name: /continue|sign in|submit/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 30_000,
  });
  await page.waitForTimeout(800);
}

async function shot(page: Page, file: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: file, fullPage: true });
}

test.describe.configure({ mode: "serial" });

test("capture login + all role screens", async ({ page }) => {
  fs.mkdirSync(OUT, { recursive: true });
  const manifest: {
    role: string;
    label: string;
    screens: { key: string; title: string; file: string }[];
  }[] = [];

  // Login screen (logged out)
  await page.context().clearCookies();
  await page.goto(`${BASE}/en/login`, { waitUntil: "networkidle" });
  await shot(page, path.join(OUT, "00-login.png"));

  for (const role of ROLES) {
    await page.context().clearCookies();
    await login(page, role.email);
    const entry = {
      role: role.id,
      label: role.label,
      screens: [] as { key: string; title: string; file: string }[],
    };

    for (const screen of role.screens) {
      await page.goto(`${BASE}${screen.path}`, { waitUntil: "networkidle" });
      // Ensure we didn't bounce to login/home unexpectedly for accessible pages
      await expect(page).not.toHaveURL(/\/login/);
      const file = `${role.id}-${screen.key}.png`;
      await shot(page, path.join(OUT, file));
      entry.screens.push({
        key: screen.key,
        title: screen.title,
        file,
      });
    }

    manifest.push(entry);
  }

  fs.writeFileSync(
    path.join(OUT, "manifest.json"),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        loginShot: "00-login.png",
        roles: manifest,
      },
      null,
      2,
    ),
  );
});
