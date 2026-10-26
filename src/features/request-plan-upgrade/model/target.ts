import { canUpgradeTo, cheapestPlanFor, ofCompanyPlan, type CompanyPlan } from "@/entities/company/plan";
import { ROUTE_PERMISSIONS, type GuardedRoute, type Permission } from "@/shared/config/permissions";
import type { NavLabel } from "@/widgets/app-shell/model/nav";

export type UpgradeTarget = {
  href?: GuardedRoute;
  label?: NavLabel;
  /** Already-translated feature name sent to support. Wins over `label`. */
  feature?: string;
  current: CompanyPlan;
  next: CompanyPlan;
  permission?: Permission;
};

export function upgradeTarget(
  href: GuardedRoute,
  label: NavLabel,
  plan: string | undefined,
  granted: readonly string[],
): UpgradeTarget | null {
  const rule = ROUTE_PERMISSIONS[href];
  const permission: Permission = typeof rule === "string" ? rule : (rule.find((p) => !granted.includes(p)) ?? rule[0]);
  const next = cheapestPlanFor(permission);
  const current = ofCompanyPlan(plan).plan;
  if (!next || !canUpgradeTo(current, next)) return null;
  return { href, label, current, next, permission };
}

/** Membership page: ask to move up to a specific package. */
export function upgradeAskForPlan(plan: string | undefined, next: CompanyPlan, feature: string): UpgradeTarget | null {
  const current = ofCompanyPlan(plan).plan;
  if (!canUpgradeTo(current, next)) return null;
  return { current, next, feature };
}

export function upgradeFeatureName(target: UpgradeTarget, navLabel: (key: NavLabel) => string): string {
  if (target.feature) return target.feature;
  if (target.label) return navLabel(target.label);
  return target.next;
}
