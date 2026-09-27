/**
 * Capture full-page screenshots for every demo role × accessible screen.
 * Requires a server started with NEXT_PUBLIC_DEMO_MODE=true and an unreachable backend
 * (e.g. `NEXT_PUBLIC_DEMO_MODE=true API_BASE_URL=http://127.0.0.1:9/v1 pnpm dev`).
 * Run: pnpm exec playwright test e2e/capture-role-screens.spec.ts --config=playwright.capture.config.ts
 */
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import type { AppRole } from "../src/shared/config/routes";
import {
  canAccessPath,
  DEMO_ROLE_PERMISSIONS,
  homeFor,
} from "../src/shared/config/permissions";
import { trackNetwork } from "./network-settle";

const OUT = path.join(process.cwd(), "docs", "role-screenshots");
const BASE = "http://127.0.0.1:3000";
const PASS = "ChangeMe123!";

type Screen = { key: string; path: string; title: string };

type RoleSpec = {
  id: AppRole;
  email: string;
  label: string;
  screens: Screen[];
};

const SHARED: Screen[] = [
  { key: "pipeline", path: "/pipeline", title: "CRM Pipeline" },
  { key: "tasks", path: "/tasks", title: "Tasks" },
  { key: "customers", path: "/customers", title: "Customers" },
  { key: "customer-360", path: "/customers/demo-1", title: "Customer 360" },
  { key: "packages", path: "/packages", title: "Packages" },
  {
    key: "package-detail",
    path: "/packages/pkg-umrah-standard",
    title: "Package Detail / Departures",
  },
  { key: "finance", path: "/finance", title: "Finance" },
  { key: "security", path: "/security", title: "Security (MFA)" },
];

const ADMIN: Screen[] = [
  { key: "admin-users", path: "/admin/users", title: "Admin — Users" },
  { key: "admin-roles", path: "/admin/roles", title: "Admin — Roles" },
  { key: "admin-audit", path: "/admin/audit", title: "Admin — Audit" },
];

const ROLES: RoleSpec[] = [
  { id: "gm", email: "gm@wodi.local", label: "General Manager (gm)", screens: [...SHARED, ...ADMIN] },
  { id: "manager", email: "manager@wodi.local", label: "Branch Manager (manager)", screens: SHARED },
  { id: "employee", email: "sales@wodi.local", label: "Sales Employee (employee)", screens: SHARED },
  { id: "admin", email: "admin@wodi.local", label: "System Admin (admin)", screens: [...SHARED, ...ADMIN] },
  { id: "finance", email: "finance@wodi.local", label: "Finance (finance)", screens: SHARED },
  { id: "operations", email: "ops@wodi.local", label: "Operations (operations)", screens: SHARED },
];

/** Screens the role can open, per the same route → permission map the middleware uses. */
function accessibleScreens(role: RoleSpec): Screen[] {
  const granted = DEMO_ROLE_PERMISSIONS[role.id];
  const home = homeFor(role.id, granted);
  return [
    { key: "home", path: home, title: `Home (${home})` },
    ...role.screens.filter((s) => s.path !== home && canAccessPath(granted, s.path)),
  ];
}

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
  const settle = trackNetwork(page);
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

    for (const screen of accessibleScreens(role)) {
      await page.goto(`${BASE}/en${screen.path}`);
      await settle();
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
