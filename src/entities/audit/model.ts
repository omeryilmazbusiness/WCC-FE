export type AuditActorType = "user" | "system" | "webhook";

export type AuditEvent = {
  id: string;
  actor_id: string | null;
  actor_name: string;
  actor_type: AuditActorType;
  action: string;
  entity_type: string;
  entity_id: string | null;
  branch_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  extra: Record<string, unknown>;
  ip: string;
  user_agent: string;
  session_id: string | null;
  request_id: string;
  created_at: string;
};

export type AuditFilters = {
  actorId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  /** RFC 3339 */
  from?: string;
  /** RFC 3339 */
  to?: string;
  branchId?: string;
};

export type AuditPageRequest = { limit: number; offset: number };

export type AuditPage = {
  items: AuditEvent[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  totalPages: number;
};

export const AUDIT_PAGE_SIZE = 50;

export const AUDIT_ENTITY_TYPES = [
  "user",
  "session",
  "customer",
  "booking",
  "participant",
  "payment",
  "lead",
  "task",
  "document",
  "visa",
  "package",
  "departure",
  "supplier",
  "settings",
] as const;

export function auditSearchParams(filters: AuditFilters, page?: AuditPageRequest): URLSearchParams {
  const sp = new URLSearchParams();
  const set = (key: string, value: string | undefined) => {
    const v = value?.trim();
    if (v) sp.set(key, v);
  };
  set("actor_id", filters.actorId);
  set("entity_type", filters.entityType);
  set("entity_id", filters.entityId);
  set("action", filters.action);
  set("from", filters.from);
  set("to", filters.to);
  set("branch_id", filters.branchId);
  if (page) {
    sp.set("limit", String(page.limit));
    sp.set("offset", String(page.offset));
  }
  return sp;
}

function rfc3339(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** `YYYY-MM-DD` (local day) → RFC 3339 instant at the start of that day. */
export function startOfDayRfc3339(day: string): string | undefined {
  const d = new Date(`${day}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : rfc3339(d);
}

/** `YYYY-MM-DD` (local day) → RFC 3339 instant at the last second of that day. */
export function endOfDayRfc3339(day: string): string | undefined {
  const d = new Date(`${day}T23:59:59`);
  return Number.isNaN(d.getTime()) ? undefined : rfc3339(d);
}
