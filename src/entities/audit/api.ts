import { downloadFilename, http, type HttpClient } from "@/shared/api/http-client";
import { createRepository } from "@/shared/api/repository";
import {
  auditSearchParams,
  type AuditActorType,
  type AuditEvent,
  type AuditFilters,
  type AuditPage,
  type AuditPageRequest,
} from "./model";

export interface AuditRepository {
  list(filters: AuditFilters, page: AuditPageRequest): Promise<AuditPage>;
  listActions(): Promise<string[]>;
  exportCsv(filters: AuditFilters): Promise<{ blob: Blob; filename: string }>;
}

type Raw = Record<string, unknown>;

const ACTOR_TYPES: readonly AuditActorType[] = ["user", "system", "webhook"];

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function strOrNull(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function objOrNull(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function mapEvent(raw: Raw): AuditEvent {
  const actorType = str(raw.actor_type) as AuditActorType;
  return {
    id: str(raw.id),
    actor_id: strOrNull(raw.actor_id),
    actor_name: str(raw.actor_name),
    actor_type: ACTOR_TYPES.includes(actorType) ? actorType : "system",
    action: str(raw.action),
    entity_type: str(raw.entity_type),
    entity_id: strOrNull(raw.entity_id),
    branch_id: strOrNull(raw.branch_id),
    before: objOrNull(raw.before),
    after: objOrNull(raw.after),
    extra: objOrNull(raw.extra) ?? {},
    ip: str(raw.ip),
    user_agent: str(raw.user_agent),
    session_id: strOrNull(raw.session_id),
    request_id: str(raw.request_id),
    created_at: str(raw.created_at),
  };
}

function toPage(items: AuditEvent[], meta: Raw, page: AuditPageRequest): AuditPage {
  const total = Number(meta.total ?? items.length);
  const limit = Number(meta.limit ?? page.limit) || page.limit;
  const offset = Number(meta.offset ?? page.offset);
  return {
    items,
    total,
    limit,
    offset,
    page: Number(meta.page ?? Math.floor(offset / limit) + 1),
    totalPages: Number(meta.total_pages ?? Math.max(1, Math.ceil(total / limit))),
  };
}

export class ApiAuditRepository implements AuditRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filters: AuditFilters, page: AuditPageRequest): Promise<AuditPage> {
    const res = await this.http.raw(`/audit-events?${auditSearchParams(filters, page)}`);
    const payload = (await res.json().catch(() => ({}))) as Raw;
    const data = Array.isArray(payload.data) ? (payload.data as Raw[]) : [];
    return toPage(data.map(mapEvent), (payload.meta ?? {}) as Raw, page);
  }

  async listActions(): Promise<string[]> {
    const data = await this.http.request<unknown[]>("/audit-events/actions");
    return (Array.isArray(data) ? data : []).filter((a): a is string => typeof a === "string");
  }

  async exportCsv(filters: AuditFilters): Promise<{ blob: Blob; filename: string }> {
    const qs = auditSearchParams(filters).toString();
    const res = await this.http.raw(`/audit-events/export.csv${qs ? `?${qs}` : ""}`, {
      headers: { Accept: "text/csv" },
    });
    return { blob: await res.blob(), filename: downloadFilename(res, "audit-events.csv") };
  }
}

const DEMO_EVENTS: AuditEvent[] = [
  {
    id: "ae-1",
    actor_id: "22222222-2222-2222-2222-222222222201",
    actor_name: "General Manager",
    actor_type: "user",
    action: "customer.updated",
    entity_type: "customer",
    entity_id: "demo-1",
    branch_id: "11111111-1111-1111-1111-111111111111",
    before: { phone: "+966500000009", email: "", notes: "Demo customer" },
    after: { phone: "+966500000001", email: "ahmed@example.com", notes: "Demo customer" },
    extra: {},
    ip: "10.0.0.12",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/129.0",
    session_id: "5e55a1d0-0000-4000-8000-000000000001",
    request_id: "req-demo-1",
    created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
  {
    id: "ae-2",
    actor_id: "22222222-2222-2222-2222-222222222201",
    actor_name: "General Manager",
    actor_type: "user",
    action: "customer.passport_revealed",
    entity_type: "customer",
    entity_id: "demo-1",
    branch_id: "11111111-1111-1111-1111-111111111111",
    before: null,
    after: null,
    extra: { field: "passport_no" },
    ip: "10.0.0.12",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/129.0",
    session_id: "5e55a1d0-0000-4000-8000-000000000001",
    request_id: "req-demo-2",
    created_at: new Date(Date.now() - 60 * 60_000).toISOString(),
  },
  {
    id: "ae-3",
    actor_id: null,
    actor_name: "Payment gateway",
    actor_type: "webhook",
    action: "payment.captured",
    entity_type: "payment",
    entity_id: "pay-demo-1",
    branch_id: "11111111-1111-1111-1111-111111111111",
    before: null,
    after: { status: "captured", amount: 150000, currency: "SAR" },
    extra: { provider: "demo" },
    ip: "",
    user_agent: "",
    session_id: null,
    request_id: "req-demo-3",
    created_at: new Date(Date.now() - 3 * 3600_000).toISOString(),
  },
];

export class MemoryAuditRepository implements AuditRepository {
  async list(filters: AuditFilters, page: AuditPageRequest): Promise<AuditPage> {
    const from = filters.from ? Date.parse(filters.from) : null;
    const to = filters.to ? Date.parse(filters.to) : null;
    const rows = DEMO_EVENTS.filter((e) => {
      const at = Date.parse(e.created_at);
      if (filters.actorId && e.actor_id !== filters.actorId) return false;
      if (filters.entityType && e.entity_type !== filters.entityType) return false;
      if (filters.entityId && e.entity_id !== filters.entityId) return false;
      if (filters.action && e.action !== filters.action) return false;
      if (from !== null && at < from) return false;
      if (to !== null && at > to) return false;
      return true;
    });
    return toPage(rows.slice(page.offset, page.offset + page.limit), { total: rows.length }, page);
  }

  async listActions(): Promise<string[]> {
    return [...new Set(DEMO_EVENTS.map((e) => e.action))].sort();
  }

  async exportCsv(): Promise<{ blob: Blob; filename: string }> {
    throw new Error("Audit export requires the backend");
  }
}

export function createAuditRepository(): AuditRepository {
  return createRepository<AuditRepository>({
    api: new ApiAuditRepository(http),
    memory: new MemoryAuditRepository(),
    reads: ["list", "listActions"],
  });
}
