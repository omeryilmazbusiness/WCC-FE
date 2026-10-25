import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parsePlanTerm, termFromStart } from "../src/entities/company/term.ts";

const root = join(import.meta.dirname, "..");

function src(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

{
  const mid = termFromStart("premium", "2026-03-10T12:00:00.000Z", new Date("2026-09-01T00:00:00.000Z"));
  assert.equal(mid.years, 1);
  assert.equal(mid.status, "active");
  assert.equal(mid.endsAt.slice(0, 10), "2027-03-10");
  const late = termFromStart("premium", "2026-03-10T12:00:00.000Z", new Date("2027-03-01T00:00:00.000Z"));
  assert.equal(late.status, "expiring");
  const done = termFromStart("premium", "2026-03-10T12:00:00.000Z", new Date("2027-03-10T12:00:00.000Z"));
  assert.equal(done.status, "expired");
}

{
  const t = parsePlanTerm({
    plan: "standard",
    years: 1,
    status: "active",
    days_left: 200,
    started_at: "2026-01-01T00:00:00Z",
    ends_at: "2027-01-01T00:00:00Z",
  });
  assert.ok(t);
  assert.equal(t.plan, "standard");
  assert.equal(t.daysLeft, 200);
}

{
  const view = src("src/views/companies-admin-view.tsx");
  assert.match(view, /onRowClick=\{setSelected\}/);
  assert.match(view, /EditCompanyDrawer/);
}

{
  const drawer = src("src/features/edit-company/ui/edit-company-drawer.tsx");
  assert.match(drawer, /company-edit-drawer/);
  assert.match(drawer, /company-plan-term/);
  assert.match(drawer, /updateCompanyPlan/);
  assert.match(drawer, /saveCompany/);
}

console.log("selftest-company-edit: ok");
