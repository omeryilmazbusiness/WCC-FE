/**
 * Self-test: workspace URLs `/{locale}/{company}/{branch}/...` (split, prefix,
 * strip, branch resolution) and that no company slug can shadow an app route.
 * Run: pnpm test:workspace-path
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PLATFORM_LOGIN_PATH,
  PLATFORM_SIGN_IN,
  ROUTE_ROOTS,
  companyLoginPath,
  companyLoginSlug,
  formatWorkspaceRef,
  isCompanySlug,
  isWorkspaceScoped,
  parseWorkspaceRef,
  rememberedLoginPath,
  resolveBranch,
  splitWorkspace,
  withWorkspace,
  withoutWorkspace,
} from "../src/shared/lib/workspace-path.ts";
import { RESERVED_SLUGS } from "../src/features/gm-setup/model/flow.ts";
import { routes } from "../src/shared/config/routes.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// every app route root is known, so a workspace prefix is never mistaken for a route
{
  const fromRoutes = Object.values(routes)
    .map((r) => (typeof r === "function" ? r("x") : r))
    .map((r) => r.split("/").filter(Boolean)[0])
    .filter(Boolean);
  const localeDir = path.join(ROOT, "src/app/[locale]");
  const fromApp = fs
    .readdirSync(localeDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      d.name.startsWith("(")
        ? fs.readdirSync(path.join(localeDir, d.name), { withFileTypes: true }).filter((x) => x.isDirectory()).map((x) => x.name)
        : [d.name],
    )
    // `[company]/login` is the company sign-in page, not a route root.
    .filter((name) => !name.startsWith("["));
  for (const root of new Set([...fromRoutes, ...fromApp])) {
    assert.ok(ROUTE_ROOTS.has(root), `ROUTE_ROOTS is missing "${root}"`);
    assert.ok(RESERVED_SLUGS.has(root), `RESERVED_SLUGS is missing "${root}"`);
  }

  // the backend reserves the same words
  const be = path.join(ROOT, "../wodi-crm-be/internal/domain/company/model.go");
  if (fs.existsSync(be)) {
    const src = fs.readFileSync(be, "utf8");
    const start = src.indexOf("var reservedSlugs");
    const block = src.slice(start, src.indexOf("\n}", start));
    for (const root of ROUTE_ROOTS) assert.ok(block.includes(`"${root}"`), `backend reservedSlugs is missing "${root}"`);
  }
}

// splitWorkspace
{
  assert.deepEqual(splitWorkspace("/acme/main-center/bookings/1"), {
    workspace: { company: "acme", branch: "main-center" },
    rest: "/bookings/1",
  });
  assert.deepEqual(splitWorkspace("/acme/jeddah"), { workspace: { company: "acme", branch: "jeddah" }, rest: "/" });
  assert.deepEqual(splitWorkspace("/bookings/1"), { workspace: null, rest: "/bookings/1" });
  assert.deepEqual(splitWorkspace("/admin/users"), { workspace: null, rest: "/admin/users" });
  assert.deepEqual(splitWorkspace("/acme"), { workspace: null, rest: "/acme" });
  assert.deepEqual(splitWorkspace(""), { workspace: null, rest: "/" });
  assert.equal(splitWorkspace("/Acme/main/manager").workspace, null);
  assert.equal(splitWorkspace("/acme/-bad-/manager").workspace, null);
}

// company sign-in pages: `/{company}/login` is never a workspace (`login` is no branch)
{
  assert.equal(companyLoginSlug("/acme/login"), "acme");
  assert.equal(companyLoginSlug("/al-noor-travel/login/"), "al-noor-travel");
  assert.equal(companyLoginSlug("/login"), null);
  assert.equal(companyLoginSlug("/acme/main/login"), null);
  assert.equal(companyLoginSlug("/admin/login"), null);
  assert.equal(companyLoginSlug("/Acme/login"), null);
  assert.equal(companyLoginSlug("/acme/logins"), null);
  assert.deepEqual(splitWorkspace("/acme/login"), { workspace: null, rest: "/acme/login" });
  assert.equal(companyLoginPath("acme"), "/acme/login");
  assert.equal(isCompanySlug("acme"), true);
  assert.equal(isCompanySlug("setup"), false);
  assert.equal(isCompanySlug("../x"), false);
  assert.equal(isCompanySlug(undefined), false);

  // the backend refuses a branch slug that would shadow the sign-in page
  const be = path.join(ROOT, "../wodi-crm-be/internal/domain/company/model.go");
  if (fs.existsSync(be)) {
    const src = fs.readFileSync(be, "utf8");
    const start = src.indexOf("var reservedBranchSlugs");
    assert.ok(start >= 0 && src.slice(start, src.indexOf("\n", start)).includes('"login"'), "backend must reserve branch slug login");
  }
}

// platform admin sign-in page: `/platform/login` is neither a company page nor a workspace
{
  assert.equal(PLATFORM_LOGIN_PATH, routes.platformLogin);
  assert.equal(companyLoginSlug("/platform/login"), null);
  assert.deepEqual(splitWorkspace("/platform/login"), { workspace: null, rest: "/platform/login" });
  assert.equal(isCompanySlug(PLATFORM_SIGN_IN), false);
  assert.equal(isWorkspaceScoped("/platform/login"), false);
  assert.equal(withWorkspace("/platform/login", { company: "acme", branch: "main" }), "/platform/login");
  assert.equal(rememberedLoginPath(PLATFORM_SIGN_IN), "/platform/login");
  assert.equal(rememberedLoginPath("acme"), "/acme/login");
  assert.equal(rememberedLoginPath("setup"), null);
  assert.equal(rememberedLoginPath(undefined), null);
}

// withWorkspace / withoutWorkspace
{
  const ws = { company: "acme", branch: "main-center" };
  assert.equal(withWorkspace("/bookings", ws), "/acme/main-center/bookings");
  assert.equal(withWorkspace("/bookings/1?tab=pay#docs", ws), "/acme/main-center/bookings/1?tab=pay#docs");
  assert.equal(withWorkspace("/", ws), "/acme/main-center");
  assert.equal(withWorkspace("/login", ws), "/login");
  assert.equal(withWorkspace("/acme/main-center/tasks", ws), "/acme/main-center/tasks");
  assert.equal(withWorkspace("https://x.com/a", ws), "https://x.com/a");
  assert.equal(withWorkspace("//x.com/a", ws), "//x.com/a");
  assert.equal(withWorkspace("relative", ws), "relative");
  assert.equal(withWorkspace("/bookings", null), "/bookings");
  assert.equal(withoutWorkspace("/acme/main-center/setup"), "/setup");
  assert.equal(withoutWorkspace("/setup"), "/setup");
  assert.equal(isWorkspaceScoped("/login"), false);
  assert.equal(isWorkspaceScoped("/"), true);
  assert.equal(isWorkspaceScoped("/manager"), true);
}

// middleware → server layout handoff
{
  const ws = { company: "acme", branch: "main-center" };
  assert.deepEqual(parseWorkspaceRef(formatWorkspaceRef(ws)), ws);
  assert.equal(parseWorkspaceRef(null), null);
  assert.equal(parseWorkspaceRef(""), null);
  assert.equal(parseWorkspaceRef("acme"), null);
  assert.equal(parseWorkspaceRef("acme/main/extra"), null);
  assert.equal(parseWorkspaceRef("Acme/main"), null);
  assert.equal(parseWorkspaceRef("admin/main"), null);
  assert.equal(parseWorkspaceRef("acme/<script>"), null);
}

// resolveBranch: URL > remembered > home > first
{
  const branches = [
    { id: "1", slug: "main-center" },
    { id: "2", slug: "jeddah" },
    { id: "3", slug: "riyadh" },
  ];
  assert.equal(resolveBranch(branches, { urlSlug: "jeddah", rememberedId: "3", homeId: "1" })?.id, "2");
  assert.equal(resolveBranch(branches, { urlSlug: "foreign", rememberedId: "3", homeId: "1" })?.id, "3");
  assert.equal(resolveBranch(branches, { urlSlug: null, rememberedId: "gone", homeId: "1" })?.id, "1");
  assert.equal(resolveBranch(branches, { homeId: "gone" })?.id, "1");
  assert.equal(resolveBranch([], { homeId: "1" }), null);
}

console.log("selftest-workspace-path: OK");
