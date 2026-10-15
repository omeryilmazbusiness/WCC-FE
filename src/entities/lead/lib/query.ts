import type { LeadPriority, LeadSegment, LeadStage, LostReasonCode } from "../model";

/** Whitelisted orderings; mirrors the backend's `lead.Sort`. */
export const LEAD_SORTS = ["updated", "created", "oldest", "name", "budget", "travel"] as const;
export type LeadSort = (typeof LEAD_SORTS)[number];

/** Created-at windows offered as tabs above the pipeline. */
export const LEAD_PERIODS = ["all", "week", "month", "quarter", "year"] as const;
export type LeadPeriod = (typeof LEAD_PERIODS)[number];

/** Months the archive keeps searchable; mirrors the backend's `lead.RetentionMonths`. */
export const LEAD_RETENTION_MONTHS = 12;

/** Longest search the backend accepts (`lead.MaxQueryLength`, in characters). */
export const LEAD_QUERY_MAX = 100;

export type LeadQuery = {
  q?: string;
  ownerId?: string;
  customerId?: string;
  /** Leads interested in this catalogue package. */
  packageId?: string;
  stage?: LeadStage;
  source?: string;
  priority?: LeadPriority;
  segment?: LeadSegment;
  /** Lost leads with this reason only. */
  lostReason?: LostReasonCode;
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
 * on `weekStartsOn`, 0 = Sunday), the calendar month, the last 90 days or the
 * last 12 months (the archive window). "all" has no bounds.
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
    case "year":
      return {
        from: new Date(day.getFullYear(), day.getMonth() - LEAD_RETENTION_MONTHS, day.getDate()),
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

const MAX_SEARCH_TOKENS = 5;
const PHONE_LIKE = /^[\d\s+\-().]+$/;

/**
 * Lowercase words a search must all match, as the backend parses them
 * (`lead.ParseSearch`): phone-like input such as "+90 555 12" becomes one
 * digits-only token so it matches however the number was typed.
 */
export function parseLeadSearch(raw: string): string[] {
  const q = raw.trim();
  if (!q) return [];
  const digits = q.replace(/\D/g, "");
  if (digits && PHONE_LIKE.test(q)) return [digits];
  const tokens: string[] = [];
  for (const word of q.toLowerCase().split(/\s+/)) {
    const tok = word.replace(/^[,;]+|[,;]+$/g, "");
    if (!tok || tokens.includes(tok)) continue;
    tokens.push(tok);
    if (tokens.length === MAX_SEARCH_TOKENS) break;
  }
  return tokens;
}

export type SearchableLead = {
  fullName: string;
  phone: string;
  source: string;
  ownerName: string;
  profile: { email: string; companyName: string };
};

/**
 * Whether a lead matches a free-text search: every word appears in its name,
 * email, company or source, digit words may match the phone ignoring
 * formatting, or the whole query appears in the owner's name.
 */
export function leadMatchesSearch(lead: SearchableLead, raw: string): boolean {
  const tokens = parseLeadSearch(raw);
  if (!tokens.length) return true;
  const doc = [lead.fullName, lead.profile.email, lead.profile.companyName, lead.source].join(" ").toLowerCase();
  const phone = lead.phone.replace(/\D/g, "");
  const all = tokens.every((tok) => doc.includes(tok) || (/^\d+$/.test(tok) && phone.includes(tok)));
  return all || lead.ownerName.toLowerCase().includes(raw.trim().toLowerCase());
}

export function leadQueryParams(query: LeadQuery): URLSearchParams {
  const sp = new URLSearchParams();
  const q = Array.from(query.q?.trim() ?? "")
    .slice(0, LEAD_QUERY_MAX)
    .join("");
  if (q) sp.set("q", q);
  if (query.priority) sp.set("priority", query.priority);
  if (query.segment) sp.set("segment", query.segment);
  if (query.lostReason) sp.set("lost_reason", query.lostReason);
  if (query.ownerId) sp.set("owner_id", query.ownerId);
  if (query.customerId) sp.set("customer_id", query.customerId);
  if (query.packageId) sp.set("package_id", query.packageId);
  if (query.stage) sp.set("stage", query.stage);
  if (query.source) sp.set("source", query.source);
  if (query.noFollowUp) sp.set("no_follow_up", "true");
  if (query.createdFrom) sp.set("created_from", query.createdFrom);
  if (query.createdTo) sp.set("created_to", query.createdTo);
  if (query.sort && query.sort !== "updated") sp.set("sort", query.sort);
  return sp;
}
