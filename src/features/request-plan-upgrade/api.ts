import { http } from "@/shared/api/http-client";
import type { CompanyPlan } from "@/entities/company/plan";

export async function requestPlanUpgrade(input: {
  target: CompanyPlan;
  feature: string;
  locale: string;
}): Promise<{ id: string; number: number; duplicate: boolean }> {
  return http.request("/plan/upgrade-requests", {
    method: "POST",
    body: JSON.stringify({ target: input.target, feature: input.feature, locale: input.locale }),
  });
}
