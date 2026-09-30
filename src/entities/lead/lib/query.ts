import type { LeadStage } from "../model";

/** Whitelisted orderings; mirrors the backend's `lead.Sort`. */
export const LEAD_SORTS = ["updated", "created", "oldest", "name", "budget", "travel"] as const;
export type LeadSort = (typeof LEAD_SORTS)[number];

/** Created-at windows offered as tabs above the pipeline. */
export const LEAD_PERIODS = ["all", "week", "month", "quarter"] as const;
export type LeadPeriod = (typeof LEAD_PERIODS)[number];

export type LeadQuery = {
  q?: string;
  ownerId?: string;
  customerId?: string;
  stage?: LeadStage;
  source?: string;
  noFollowUp?: boolean;
  /** ISO instants bounding created_at as [from, to). */
  createdFrom?: string;
  createdTo?: string;
  sort?: LeadSort;
};

export function isLeadPeriod(v: unknown): v is LeadPeriod {
  return typeof v === "string" && (LEAD_PERIODS as readonly string[]).includes(v);
}

export function isLeadSort(v: unknown): v is LeadSort {
  return typeof v === "string" && (LEAD_SORTS as readonly string[]).includes(v);
}

/**
 * Local-time window of a period containing `now`: the calendar week (starting
 * on `weekStartsOn`, 0 = Sunday), the calendar month, or the last 90 days.
 * "all" has no bounds.
 */
export function periodRange(
  period: LeadPeriod,
  now: Date,
  weekStartsOn: number,
): { from?: Date; to?: Date } {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case "week": {
      const back = (day.getDay() - weekStartsOn + 7) % 7;
      const from = new Date(day.getFullYear(), day.getMonth(), day.getDate() - back);
      return { from, to: new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7) };
    }
    case "month":
      return {
        from: new Date(day.getFullYear(), day.getMonth(), 1),
        to: new Date(day.getFullYear(), day.getMonth() + 1, 1),
      };
    case "quarter":
      return {
        from: new Date(day.getFullYear(), day.getMonth(), day.getDate() - 89),
        to: new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1),
      };
    default:
      return {};
  }
}

/** Week start used for "this week": Sunday in Arabic (Gulf), Monday otherwise. */
export function weekStartFor(locale: string): number {
  return locale.startsWith("ar") ? 0 : 1;
}

export function leadQueryParams(query: LeadQuery): URLSearchParams {
  const sp = new URLSearchParams();
  const q = query.q?.trim();
  if (q) sp.set("q", q);
  if (query.ownerId) sp.set("owner_id", query.ownerId);
  if (query.customerId) sp.set("customer_id", query.customerId);
  if (query.stage) sp.set("stage", query.stage);
  if (query.source) sp.set("source", query.source);
  if (query.noFollowUp) sp.set("no_follow_up", "true");
  if (query.createdFrom) sp.set("created_from", query.createdFrom);
  if (query.createdTo) sp.set("created_to", query.createdTo);
  if (query.sort && query.sort !== "updated") sp.set("sort", query.sort);
  return sp;
}
