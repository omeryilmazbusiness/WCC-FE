/**
 * Plan-locked nav items and the upgrade request. Run: pnpm test:plan-upgrade
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cheapestPlanFor, canUpgradeTo } from "../src/entities/company/plan.ts";
import { upgradeAskForPlan, upgradeTarget } from "../src/features/request-plan-upgrade/model/target.ts";
import { DEMO_ROLE_PERMISSIONS } from "../src/shared/config/permissions.ts";
import { routes } from "../src/shared/config/routes.ts";
import { navGroupsFor } from "../src/widgets/app-shell/model/nav.ts";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

function catalog() {
  assert.equal(cheapestPlanFor("visa.read"), "standard");
  assert.equal(cheapestPlanFor("dashboard.read"), "premium");
  assert.equal(cheapestPlanFor("ai.setup"), "ultimate");
  assert.equal(cheapestPlanFor("companies.manage"), null);
  assert.ok(canUpgradeTo("standard", "premium"));
  assert.ok(!canUpgradeTo("ultimate", "premium"));
}

function navLocks() {
  const role = DEMO_ROLE_PERMISSIONS.gm;
  const granted = role.filter((p) => p !== "dashboard.read" && p !== "payments.read" && p !== "ai.setup");
  const groups = navGroupsFor(granted, role);
  const items = groups.flatMap((g) => g.items);
  const manager = items.find((i) => i.href === routes.manager);
  const finance = items.find((i) => i.href === routes.finance);
  const ai = items.find((i) => i.href === routes.aiSetup);
  const tasks = items.find((i) => i.href === routes.tasks);
  assert.ok(manager?.locked, "dashboard is locked on a starter desk");
  assert.ok(finance?.locked, "finance is locked");
  assert.ok(ai?.locked, "ai setup is locked");
  assert.ok(tasks && !tasks.locked, "tasks stay open");
}

function target() {
  const t = upgradeTarget(routes.finance, "finance", "standard", []);
  assert.equal(t?.next, "premium");
  assert.equal(upgradeTarget(routes.aiSetup, "aiSetup", "premium", [])?.next, "ultimate");
  assert.equal(upgradeTarget(routes.manager, "manager", "ultimate", ["dashboard.read"]), null);
  assert.equal(upgradeAskForPlan("standard", "ultimate", "Membership")?.next, "ultimate");
  assert.equal(upgradeAskForPlan("ultimate", "premium", "Membership"), null);
}

function wiring() {
  const nav = read("src/widgets/app-shell/ui/nav-section.tsx");
  assert.match(nav, /shell-nav-locked-/);
  assert.match(nav, /useUpgradePlan/);
  assert.match(read("src/widgets/app-shell/ui/app-shell.tsx"), /UpgradePlanProvider/);
  assert.match(read("src/features/request-plan-upgrade/api.ts"), /\/plan\/upgrade-requests/);
  assert.match(read("../WCC-BE/internal/app/planupgrade/service.go"), /KindPlanUpgrade/);
  assert.match(read("../WCC-BE/internal/adapter/http/router.go"), /plan\/upgrade-requests/);
}

function messages() {
  const load = (l: string) =>
    JSON.parse(readFileSync(new URL(`../src/shared/i18n/messages/${l}.json`, import.meta.url), "utf8"));
  const leaves = (o: unknown, p = ""): string[] =>
    o && typeof o === "object"
      ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => leaves(v, p ? `${p}.${k}` : k))
      : [p];
  const en = load("en");
  const ar = load("ar");
  assert.deepEqual(leaves(ar.planUpgrade).sort(), leaves(en.planUpgrade).sort());
  assert.ok(en.planUpgrade.confirm);
}

catalog();
navLocks();
target();
wiring();
messages();
console.log("plan-upgrade selftest OK");
