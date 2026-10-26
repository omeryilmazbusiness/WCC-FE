/**
 * Self-test: WCC Standard / Premium / Ultimate catalog, register payload,
 * admin picker wiring, session plan, EN/AR copy. Run: pnpm test:company-plan
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  COMPANY_PLANS,
  PLAN_CATALOG,
  intersectWithPlan,
  ofCompanyPlan,
  parseCompanyPlan,
  planAllows,
} from "../src/entities/company/plan.ts";
import { registerCompanyHints, registerCompanyPayload, type RegisterCompanyForm } from "../src/features/register-company/model/form.ts";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

function form(patch: Partial<RegisterCompanyForm> = {}): RegisterCompanyForm {
  return {
    nameEn: "Al Noor Travel",
    nameAr: "",
    slug: "",
    country: "Syria",
    city: "Damascus",
    address: "Mazzeh, next to the mosque",
    plan: "standard",
    gmName: "Sara Ahmad",
    gmEmail: "sara@alnoor.test",
    gmPassword: "Sahra2026Trip",
    ...patch,
  };
}

function catalog() {
  assert.deepEqual([...COMPANY_PLANS], ["standard", "premium", "ultimate"]);
  assert.equal(parseCompanyPlan(" Premium "), "premium");
  assert.equal(parseCompanyPlan("gold"), null);
  assert.equal(ofCompanyPlan("").plan, "standard");
  assert.equal(ofCompanyPlan("nope").plan, "standard");

  assert.equal(PLAN_CATALOG.standard.limits.users, 3);
  assert.equal(PLAN_CATALOG.standard.limits.branches, 1);
  assert.equal(PLAN_CATALOG.standard.limits.aiPerDay, 50);
  assert.ok(planAllows("standard", "inbox.write"));
  assert.ok(planAllows("standard", "packages.write"));
  assert.ok(planAllows("standard", "ai.write"));
  assert.ok(planAllows("standard", "integrations.write"));
  assert.ok(planAllows("standard", "visa.read") && planAllows("standard", "visa.write"));
  assert.equal(PLAN_CATALOG.standard.limits.inbox, 0);
  assert.equal(PLAN_CATALOG.premium.limits.inbox, 0);
  assert.ok(!planAllows("standard", "dashboard.read"));
  assert.ok(!planAllows("standard", "hotels.pricing"));
  assert.ok(!planAllows("standard", "payments.read"));
  assert.ok(!planAllows("standard", "targets.write"));

  assert.ok(planAllows("premium", "payments.approve"));
  assert.ok(planAllows("premium", "hotels.pricing"));
  assert.ok(planAllows("premium", "reports.read"));
  assert.ok(!planAllows("premium", "ai.setup"));
  assert.ok(!planAllows("premium", "bookings.override"));

  assert.ok(planAllows("ultimate", "ai.setup"));
  assert.ok(planAllows("ultimate", "fx.manage"));
  assert.ok(!planAllows("ultimate", "companies.manage"));
  assert.ok(!planAllows("ultimate", "support.manage"));

  assert.deepEqual(intersectWithPlan(["inbox.write", "dashboard.read", "companies.manage"], "standard"), ["inbox.write"]);
}

function payload() {
  assert.equal(registerCompanyPayload(form()).plan, "standard");
  assert.equal(registerCompanyPayload(form({ plan: "premium" })).plan, "premium");
  assert.deepEqual(registerCompanyHints(form()), {});
}

function wiring() {
  const dialog = read("src/features/register-company/ui/register-company-dialog.tsx");
  assert.match(dialog, /PlanPicker/);
  assert.match(dialog, /groups\.plan/);
  const picker = read("src/features/register-company/ui/plan-picker.tsx");
  assert.match(picker, /data-testid="company-plan-picker"/);
  assert.match(picker, /company-plan-\$\{plan\}/);
  const view = read("src/views/companies-admin-view.tsx");
  assert.match(view, /columns\.plan/);
  assert.match(read("src/shared/api/session.ts"), /plan\?:/);
  assert.match(read("src/shared/api/server/auth-service.ts"), /plan: "ultimate"/);
}

function backendParity() {
  const go = read("../WCC-BE/internal/domain/company/plan.go");
  assert.match(go, /Users: 3, Branches: 1, Packages: 8, Hotels: 8, Buses: 3, Inbox: 0, AIPerDay: 50/);
  assert.match(go, /Users: 12, Branches: 3, Packages: 40, Hotels: 40, Buses: 15, Inbox: 0, AIPerDay: 300/);
  assert.match(go, /PlanUltimate/);
  assert.match(read("../WCC-BE/migrations/00064_company_plan.sql"), /plan TEXT NOT NULL DEFAULT 'ultimate'/);
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
  assert.deepEqual(leaves(ar.adminCompanies).sort(), leaves(en.adminCompanies).sort());
  assert.equal(en.adminCompanies.plans.standard.name, "Standard");
  assert.ok(en.adminCompanies.form.groups.planHint);
  assert.ok(en.adminCompanies.columns.plan);
}

catalog();
payload();
wiring();
backendParity();
messages();
console.log("company-plan selftest OK");
