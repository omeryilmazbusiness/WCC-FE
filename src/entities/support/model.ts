/** Help requests users send to the platform team. Limits mirror `internal/domain/support`. */

export const SUPPORT_STATUSES = ["open", "in_progress", "resolved"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_LIMITS = {
  titleMin: 4,
  titleMax: 120,
  descriptionMin: 10,
  descriptionMax: 4000,
  noteMax: 1000,
} as const;

export type SupportRequest = {
  id: string;
  /** Human reference, shown as `#12`. */
  number: number;
  title: string;
  description: string;
  status: SupportStatus;
  page: string;
  /** Reply from the platform team, visible to the requester. */
  adminNote: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type InboundRequest = SupportRequest & {
  requester: { name: string; email: string; role: string };
  company: string;
  branch: string;
  locale: "en" | "ar";
};

export type SupportInbox = {
  items: InboundRequest[];
  total: number;
  counts: Record<SupportStatus, number>;
};

export type SupportDraft = { title: string; description: string };

export type DraftIssue = "short" | "long";
export type DraftIssues = Partial<Record<keyof SupportDraft, DraftIssue>>;

const chars = (s: string) => [...s].length;

/** What the server stores: one-line title with single spaces, trimmed description. */
export function normalizeDraft(d: SupportDraft): SupportDraft {
  return { title: d.title.replace(/\s+/g, " ").trim(), description: d.description.trim() };
}

export function draftIssues(d: SupportDraft): DraftIssues {
  const n = normalizeDraft(d);
  const out: DraftIssues = {};
  const t = chars(n.title);
  const desc = chars(n.description);
  if (t < SUPPORT_LIMITS.titleMin) out.title = "short";
  else if (t > SUPPORT_LIMITS.titleMax) out.title = "long";
  if (desc < SUPPORT_LIMITS.descriptionMin) out.description = "short";
  else if (desc > SUPPORT_LIMITS.descriptionMax) out.description = "long";
  return out;
}

export function isSupportStatus(v: unknown): v is SupportStatus {
  return typeof v === "string" && (SUPPORT_STATUSES as readonly string[]).includes(v);
}
