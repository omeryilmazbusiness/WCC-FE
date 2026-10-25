import { canUpgradeTo, cheapestPlanFor, ofCompanyPlan, type CompanyPlan } from "@/entities/company/plan";
import { ROUTE_PERMISSIONS, type GuardedRoute, type Permission } from "@/shared/config/permissions";
import type { NavLabel } from "@/widgets/app-shell/model/nav";

export type UpgradeTarget = {
  href: GuardedRoute;
  label: NavLabel;
  current: CompanyPlan;
  next: CompanyPlan;
  permission: Permission;
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
