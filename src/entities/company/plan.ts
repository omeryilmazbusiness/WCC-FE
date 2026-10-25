/** Mirrors `internal/domain/company/plan.go`. Unknown plans fall back to Standard. */

export const COMPANY_PLANS = ["standard", "premium", "ultimate"] as const;
export type CompanyPlan = (typeof COMPANY_PLANS)[number];

export type PlanLimits = {
  users: number;
  branches: number;
  packages: number;
  hotels: number;
  buses: number;
  inbox: number;
  aiPerDay: number;
};

export type PlanSpec = {
  plan: CompanyPlan;
  limits: PlanLimits;
  /** Empty on Ultimate — `planAllows` treats it as every company permission. */
  allows: readonly string[];
};

const PLATFORM = new Set(["companies.manage", "support.manage"]);

const STANDARD_ALLOWS = [
  "users.read",
  "users.write",
  "branches.read",
  "customers.read",
  "customers.write",
  "leads.read",
  "leads.write",
  "bookings.read",
  "bookings.write",
  "documents.read",
  "documents.write",
  "flights.search",
  "packages.read",
  "packages.write",
  "hotels.read",
  "hotels.write",
  "buses.read",
  "buses.write",
  "tasks.read",
  "tasks.write",
  "inbox.read",
  "inbox.write",
  "integrations.read",
  "integrations.write",
  "targets.read",
  "notifications.read",
  "notifications.write",
  "ai.read",
  "ai.write",
  "settings.read",
  "setup.manage",
  "support.write",
] as const;

const PREMIUM_EXTRA = [
  "dashboard.read",
  "users.unlock",
  "audit.read",
  "pii.read",
  "bookings.discount",
  "payments.read",
  "payments.write",
  "payments.approve",
  "documents.review",
  "visa.read",
  "visa.write",
  "suppliers.read",
  "suppliers.write",
  "hotels.pricing",
  "targets.write",
  "imports.read",
  "imports.write",
  "notifications.manage",
  "reports.read",
  "settings.write",
  "branches.manage",
  "ops.read",
] as const;

export const PLAN_CATALOG: Record<CompanyPlan, PlanSpec> = {
  standard: {
    plan: "standard",
    limits: { users: 3, branches: 1, packages: 8, hotels: 8, buses: 3, inbox: 1, aiPerDay: 50 },
    allows: STANDARD_ALLOWS,
  },
  premium: {
    plan: "premium",
    limits: { users: 12, branches: 3, packages: 40, hotels: 40, buses: 15, inbox: 3, aiPerDay: 300 },
    allows: [...STANDARD_ALLOWS, ...PREMIUM_EXTRA],
  },
  ultimate: {
    plan: "ultimate",
    limits: { users: 0, branches: 0, packages: 0, hotels: 0, buses: 0, inbox: 0, aiPerDay: 0 },
    allows: [],
  },
};

export function parseCompanyPlan(value: string | undefined | null): CompanyPlan | null {
  const p = String(value ?? "")
    .trim()
    .toLowerCase();
  return COMPANY_PLANS.includes(p as CompanyPlan) ? (p as CompanyPlan) : null;
}

/** Unknown or empty values stay Standard so a missing field never upgrades. */
export function ofCompanyPlan(value: string | undefined | null): PlanSpec {
  return PLAN_CATALOG[parseCompanyPlan(value) ?? "standard"];
}

export function planAllows(plan: string | undefined | null, permission: string): boolean {
  if (PLATFORM.has(permission)) return false;
  const spec = ofCompanyPlan(plan);
  if (spec.plan === "ultimate") return true;
  return spec.allows.includes(permission);
}

export function intersectWithPlan<T extends string>(permissions: readonly T[], plan: string | undefined | null): T[] {
  return permissions.filter((p) => planAllows(plan, p));
}

export function cheapestPlanFor(permission: string): CompanyPlan | null {
  return COMPANY_PLANS.find((p) => planAllows(p, permission)) ?? null;
}

export function canUpgradeTo(from: string | undefined | null, to: CompanyPlan): boolean {
  const a = COMPANY_PLANS.indexOf(ofCompanyPlan(from).plan);
  const b = COMPANY_PLANS.indexOf(to);
  return b > a;
}
