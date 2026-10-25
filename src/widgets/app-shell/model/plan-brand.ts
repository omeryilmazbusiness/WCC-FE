import { ofCompanyPlan, type CompanyPlan } from "@/entities/company/plan";

/** Visual tone of the sidebar product mark. Standard stays quiet. */
export type PlanBrandTone = CompanyPlan;

export function planBrandTone(plan: string | undefined | null): PlanBrandTone {
  return ofCompanyPlan(plan).plan;
}

export function planBrandShowsBadge(tone: PlanBrandTone): boolean {
  return tone === "premium" || tone === "ultimate";
}
