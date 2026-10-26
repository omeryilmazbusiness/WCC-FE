import { COMPANY_PLANS, PLAN_CATALOG, ofCompanyPlan, type CompanyPlan, type PlanLimits } from "./plan";

/**
 * A publishable entitlement on the membership cards. Presentation-free: no icons,
 * colours or copy — those live in the settings widget and i18n.
 */
export type MembershipFeatureId =
  | "users"
  | "branches"
  | "packages"
  | "hotels"
  | "buses"
  | "inbox"
  | "ai"
  | "salesDesk"
  | "documents"
  | "flights"
  | "tasks"
  | "dashboard"
  | "payments"
  | "reports"
  | "visa"
  | "suppliers"
  | "pricing"
  | "imports"
  | "audit"
  | "aiSetup"
  | "fx"
  | "finance"
  | "overrides";

export type MembershipFeature = {
  id: MembershipFeatureId;
  /** Lowest plan that includes this entitlement. */
  since: CompanyPlan;
  /** When set, the card shows that plan's numeric cap (0 = unlimited). */
  limit?: keyof PlanLimits;
};

/** Catalog order is the reading order on every card. */
export const MEMBERSHIP_FEATURES: readonly MembershipFeature[] = [
  { id: "users", since: "standard", limit: "users" },
  { id: "branches", since: "standard", limit: "branches" },
  { id: "packages", since: "standard", limit: "packages" },
  { id: "hotels", since: "standard", limit: "hotels" },
  { id: "buses", since: "standard", limit: "buses" },
  { id: "inbox", since: "standard", limit: "inbox" },
  { id: "ai", since: "standard", limit: "aiPerDay" },
  { id: "salesDesk", since: "standard" },
  { id: "documents", since: "standard" },
  { id: "visa", since: "standard" },
  { id: "flights", since: "standard" },
  { id: "tasks", since: "standard" },
  { id: "dashboard", since: "premium" },
  { id: "payments", since: "premium" },
  { id: "reports", since: "premium" },
  { id: "suppliers", since: "premium" },
  { id: "pricing", since: "premium" },
  { id: "imports", since: "premium" },
  { id: "audit", since: "premium" },
  { id: "aiSetup", since: "ultimate" },
  { id: "fx", since: "ultimate" },
  { id: "finance", since: "ultimate" },
  { id: "overrides", since: "ultimate" },
];

export function planRank(plan: string | undefined | null): number {
  return COMPANY_PLANS.indexOf(ofCompanyPlan(plan).plan);
}

/** Features the plan actually includes, cheapest first. */
export function featuresOn(plan: string | undefined | null): MembershipFeature[] {
  const rank = planRank(plan);
  return MEMBERSHIP_FEATURES.filter((f) => planRank(f.since) <= rank);
}

export function planIncludes(plan: string | undefined | null, feature: MembershipFeature): boolean {
  return planRank(plan) >= planRank(feature.since);
}

export type FeatureCap = { kind: "count"; n: number } | { kind: "unlimited" };

/** Numeric cap for a limit feature on this plan. Zero in the catalog means unlimited. */
export function featureCap(plan: string | undefined | null, feature: MembershipFeature): FeatureCap | null {
  if (!feature.limit) return null;
  const n = PLAN_CATALOG[ofCompanyPlan(plan).plan].limits[feature.limit];
  return n <= 0 ? { kind: "unlimited" } : { kind: "count", n };
}
