/**
 * Request budget: for every role, opens every drawer screen and records the API calls it
 * makes. Fails on a duplicate read (same GET twice for one screen), a repeated mutation, or
 * any call during the quiet window after the screen settled (a fetch loop).
 * Needs a running app with a real backend (seeded dev users):
 *   pnpm exec playwright test e2e/request-budget.spec.ts --config=playwright.requests.config.ts
 * REQUEST_REPORT=/path.jsonl appends one line per screen.
 */
import fs from "node:fs";
import { expect, test, type Page, type Request } from "@playwright/test";
import { trackNetwork } from "./network-settle";

const PASS = process.env.E2E_PASSWORD ?? "ChangeMe123!";
const SETTLE_MS = Number(process.env.REQUEST_SETTLE_MS ?? 1500);
const QUIET_MS = Number(process.env.REQUEST_QUIET_MS ?? 4000);
const ROLES = [
  { role: "gm", email: "gm@wodi.local" },
  { role: "manager", email: "manager@wodi.local" },
  { role: "sales", email: "sales@wodi.local" },
  { role: "admin", email: "admin@wodi.local" },
  { role: "finance", email: "finance@wodi.local" },
  { role: "ops", email: "ops@wodi.local" },
].filter((r) => !process.env.ROLES || process.env.ROLES.split(",").includes(r.role));

/** Background pollers owned by the shell, not by a screen. */
const SHELL_POLLS = [/^GET \/notifications(\/unread-count)?$/, /^GET \/fx\/live$/, /^GET \/stream$/];

type ScreenReport = {
  role: string;
  path: string;
  calls: string[];
  duplicates: string[];
  quiet: string[];
};

function key(req: Request): string | null {
  const url = new URL(req.url());
  if (!url.pathname.startsWith("/api/proxy/")) return null;
  return `${req.method()} ${url.pathname.slice("/api/proxy".length)}${url.search}`;
}

async function login(page: Page, email: string, settle: () => Promise<void>) {
  await page.goto("/en/login");
  await settle();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASS);
  await page.getByRole("button", { name: /continue|sign in|submit/i }).click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 60_000 });
  await settle();
}

async function drawerLinks(page: Page): Promise<string[]> {
  const hrefs = await page.locator("aside nav a[href]").evaluateAll((els) =>
    els.map((e) => new URL((e as HTMLAnchorElement).href).pathname),
  );
  return [...new Set(hrefs)];
}

function duplicates(calls: string[]): string[] {
  const counts = new Map<string, number>();
  for (const c of calls) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts].filter(([c, n]) => n > 1 && !SHELL_POLLS.some((re) => re.test(c))).map(([c, n]) => `${c} ×${n}`);
}

function record(report: ScreenReport) {
  const out = process.env.REQUEST_REPORT;
  if (out) fs.appendFileSync(out, `${JSON.stringify(report)}\n`);
}

for (const { role, email } of ROLES) {
  test(`request budget — ${role}`, async ({ page }) => {
    test.setTimeout(600_000);
    const settle = trackNetwork(page);
    let calls: string[] = [];
    page.on("request", (req) => {
      const k = key(req);
      if (k) calls.push(k);
    });

    await login(page, email, settle);
    const links = await drawerLinks(page);
    expect(links.length, "drawer has screens").toBeGreaterThan(0);

    const failures: string[] = [];
    for (const path of links) {
      calls = [];
      await page.locator(`aside nav a[href$="${path}"]`).first().click();
      await page.waitForURL((u) => u.pathname === path, { timeout: 60_000 });
      await settle();
      await page.waitForTimeout(SETTLE_MS);
      await settle();
      const settled = calls.length;
      await page.waitForTimeout(QUIET_MS);
      const quiet = calls.slice(settled).filter((c) => !SHELL_POLLS.some((re) => re.test(c)));
      const report: ScreenReport = { role, path, calls: [...calls], duplicates: duplicates(calls), quiet };
      record(report);
      if (report.duplicates.length) failures.push(`${path}: duplicate ${report.duplicates.join(", ")}`);
      if (quiet.length) failures.push(`${path}: calls after settle (loop?) ${quiet.join(", ")}`);
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
}
