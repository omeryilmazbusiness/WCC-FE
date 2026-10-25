import { ofCompanyPlan, type CompanyPlan } from "./plan";

export const PLAN_TERM_YEARS = 1;
export const PLAN_EXPIRING_DAYS = 30;

export type PlanTermStatus = "active" | "expiring" | "expired";

export type PlanTerm = {
  plan: CompanyPlan;
  years: number;
  status: PlanTermStatus;
  daysLeft: number;
  startedAt: string;
  endsAt: string;
};

export function parsePlanTerm(raw: unknown): PlanTerm | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const startedAt = typeof r.started_at === "string" ? r.started_at : "";
  const endsAt = typeof r.ends_at === "string" ? r.ends_at : "";
  if (!startedAt || !endsAt) return null;
  const status = r.status === "expiring" || r.status === "expired" ? r.status : "active";
  return {
    plan: ofCompanyPlan(typeof r.plan === "string" ? r.plan : "").plan,
    years: Number(r.years) || PLAN_TERM_YEARS,
    status,
    daysLeft: Number(r.days_left) || 0,
    startedAt,
    endsAt,
  };
}

export function termFromStart(plan: string | undefined, startedAt: string, now = new Date()): PlanTerm {
  const start = new Date(startedAt);
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + PLAN_TERM_YEARS);
  const startDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const daysLeft = Math.round((endDay - startDay) / 86_400_000);
  let status: PlanTermStatus = "active";
  if (now.getTime() >= end.getTime()) status = "expired";
  else if (daysLeft <= PLAN_EXPIRING_DAYS) status = "expiring";
  return {
    plan: ofCompanyPlan(plan).plan,
    years: PLAN_TERM_YEARS,
    status,
    daysLeft,
    startedAt: start.toISOString(),
    endsAt: end.toISOString(),
  };
}
