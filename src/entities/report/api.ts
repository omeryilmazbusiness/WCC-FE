import { http, type HttpClient } from "@/shared/api/http-client";
import { createRepository } from "@/shared/api/repository";
import type {
  DrillRef,
  ReportFilter,
  ReportKind,
  ReportKindMeta,
  ReportResult,
  ReportRow,
} from "./model";

type Raw = Record<string, unknown>;

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

function mapDrill(raw: Raw): DrillRef {
  return {
    entityType: str(raw.entity_type ?? raw.entityType),
    entityId: str(raw.entity_id ?? raw.entityId),
    hrefHint: str(raw.href_hint ?? raw.hrefHint),
    label: str(raw.label),
  };
}

function mapRow(raw: Raw): ReportRow {
  const drills = Array.isArray(raw.drilldowns)
    ? (raw.drilldowns as Raw[]).map(mapDrill)
    : [];
  return {
    id: str(raw.id),
    label: str(raw.label),
    metrics: (raw.metrics as Record<string, unknown>) ?? {},
    severity: str(raw.severity ?? "info"),
    drilldowns: drills,
  };
}

function mapResult(raw: Raw): ReportResult {
  return {
    kind: str(raw.kind) as ReportKind,
    generatedAt: str(raw.generated_at ?? raw.generatedAt),
    filter: (raw.filter as Record<string, unknown>) ?? {},
    summary: (raw.summary as Record<string, unknown>) ?? {},
    rows: Array.isArray(raw.rows) ? (raw.rows as Raw[]).map(mapRow) : [],
    columns: Array.isArray(raw.columns) ? (raw.columns as string[]) : [],
  };
}

function qs(f: ReportFilter = {}): string {
  const sp = new URLSearchParams();
  if (f.from) sp.set("from", f.from);
  if (f.to) sp.set("to", f.to);
  if (f.ownerId) sp.set("owner_id", f.ownerId);
  if (f.channel) sp.set("channel", f.channel);
  if (f.provider) sp.set("provider", f.provider);
  if (f.status) sp.set("status", f.status);
  if (f.departureId) sp.set("departure_id", f.departureId);
  if (f.limit) sp.set("limit", String(f.limit));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export type ReportRepository = {
  kinds(): Promise<ReportKindMeta[]>;
  run(kind: ReportKind, filter?: ReportFilter): Promise<ReportResult>;
  exportCsv(kind: ReportKind, filter?: ReportFilter): Promise<Blob>;
};

class ApiRepo implements ReportRepository {
  constructor(private http: HttpClient) {}

  async kinds() {
    const rows = await this.http.request<Raw[]>("/reports/kinds");
    return (Array.isArray(rows) ? rows : []).map((r) => ({
      kind: str(r.kind) as ReportKind,
      label: str(r.label),
      sensitive: Boolean(r.sensitive),
    }));
  }

  async run(kind: ReportKind, filter?: ReportFilter) {
    const raw = await this.http.request<Raw>(`/reports/${kind}${qs(filter)}`);
    return mapResult(raw);
  }

  async exportCsv(kind: ReportKind, filter?: ReportFilter) {
    const res = await this.http.raw(
      `/reports/export?kind=${encodeURIComponent(kind)}${qs(filter).replace("?", "&")}`,
      { headers: { Accept: "text/csv" } },
    );
    return res.blob();
  }
}

class MemoryRepo implements ReportRepository {
  async kinds() {
    return [
      { kind: "sales" as const, label: "Sales performance", sensitive: true },
      { kind: "targets" as const, label: "Target performance", sensitive: false },
      { kind: "readiness" as const, label: "Operational readiness", sensitive: false },
      { kind: "sla" as const, label: "Communication SLA", sensitive: false },
      { kind: "finance" as const, label: "Finance", sensitive: true },
      { kind: "integrations" as const, label: "Integration logs", sensitive: true },
    ];
  }

  async run(kind: ReportKind, filter?: ReportFilter): Promise<ReportResult> {
    const sample = MEMORY_SAMPLES[kind];
    return {
      kind,
      generatedAt: new Date().toISOString(),
      filter: { ...filter },
      summary: { ...sample.summary },
      columns: [...sample.columns],
      rows: sample.rows.map((r) => ({ ...r, metrics: { ...r.metrics }, drilldowns: [...r.drilldowns] })),
    };
  }

  async exportCsv(kind: ReportKind) {
    const sample = MEMORY_SAMPLES[kind];
    const lines = [["id", "label", ...sample.columns].join(",")];
    for (const r of sample.rows) lines.push([r.id, r.label, ...sample.columns.map((c) => String(r.metrics[c] ?? ""))].join(","));
    return new Blob([`\ufeff${lines.join("\r\n")}\r\n`], { type: "text/csv" });
  }
}

type Sample = Pick<ReportResult, "summary" | "columns" | "rows">;

function memRow(id: string, label: string, severity: string, metrics: Record<string, unknown>, hrefHint: string): ReportRow {
  return { id, label, severity, metrics, drilldowns: [{ entityType: "", entityId: id, hrefHint, label: "" }] };
}

const MEMORY_SAMPLES: Record<ReportKind, Sample> = {
  sales: {
    summary: { owners: 2, leads_handled: 46, leads_won: 13, conversion_bps: 2826, collected_amt: 18_450_000 },
    columns: ["leads_handled", "leads_won", "conversion_bps", "open_tasks", "overdue_tasks", "collected_amt"],
    rows: [
      memRow("u1", "Sara Mansour", "info", { leads_handled: 28, leads_won: 9, conversion_bps: 3214, open_tasks: 6, overdue_tasks: 0, collected_amt: 12_300_000 }, "/pipeline?owner=u1"),
      memRow("u2", "Khaled Odeh", "warning", { leads_handled: 18, leads_won: 4, conversion_bps: 2222, open_tasks: 9, overdue_tasks: 3, collected_amt: 6_150_000 }, "/pipeline?owner=u2"),
    ],
  },
  targets: {
    summary: { targets: 2, ahead: 1, on_track: 0, behind: 1 },
    columns: ["metric", "target_amount", "actual_amount", "expected_to_date", "variance", "progress_bps", "status", "currency"],
    rows: [
      memRow("t1", "Q4 Umrah collections", "info", { metric: "collected", target_amount: 50_000_000, actual_amount: 31_000_000, expected_to_date: 27_500_000, variance: 3_500_000, progress_bps: 6200, status: "ahead", currency: "SAR" }, "/targets"),
      memRow("t2", "Ramadan bookings", "critical", { metric: "booked", target_amount: 80_000_000, actual_amount: 22_000_000, expected_to_date: 36_000_000, variance: -14_000_000, progress_bps: 2750, status: "behind", currency: "SAR" }, "/targets"),
    ],
  },
  readiness: {
    summary: { bookings: 2, ready: 1, blocked: 1, overrides: 0 },
    columns: ["status", "pax_count", "balance_amt", "missing_docs", "can_confirm", "risk_count"],
    rows: [
      memRow("b1", "Ahmad Al-Saleh", "critical", { status: "partially_paid", pax_count: 3, balance_amt: 450_000, missing_docs: 2, can_confirm: false, risk_count: 2 }, "/bookings/b1"),
      memRow("b2", "Lina Haddad", "info", { status: "confirmed", pax_count: 2, balance_amt: 0, missing_docs: 0, can_confirm: true, risk_count: 0 }, "/bookings/b2"),
    ],
  },
  sla: {
    summary: { channels: 2, conversations: 140, breached: 9, breach_bps: 642 },
    columns: ["channel", "conversations", "breached", "breach_bps", "avg_unanswered_hours", "open_unassigned"],
    rows: [
      memRow("whatsapp", "whatsapp", "warning", { channel: "whatsapp", conversations: 112, breached: 8, breach_bps: 714, avg_unanswered_hours: 1.8, open_unassigned: 4 }, "/inbox?channel=whatsapp"),
      memRow("instagram", "instagram", "info", { channel: "instagram", conversations: 28, breached: 1, breach_bps: 357, avg_unanswered_hours: 0.9, open_unassigned: 0 }, "/inbox?channel=instagram"),
    ],
  },
  finance: {
    summary: { booked_amt: 96_000_000, collected_amt: 71_500_000, balance_amt: 24_500_000, overdue_count: 3, currencies: 1 },
    columns: ["booked_amt", "collected_amt", "balance_amt", "payment_count", "overdue_count", "currency"],
    rows: [
      memRow("SAR", "Currency SAR", "warning", { booked_amt: 96_000_000, collected_amt: 71_500_000, balance_amt: 24_500_000, payment_count: 58, overdue_count: 3, currency: "SAR" }, "/finance"),
      memRow("b1", "Ahmad Al-Saleh", "critical", { booked_amt: 0, collected_amt: 0, balance_amt: 450_000, payment_count: 0, overdue_count: 1, currency: "SAR" }, "/bookings/b1"),
    ],
  },
  integrations: {
    summary: { total: 2, errors: 1, rows: 2 },
    columns: ["provider", "direction", "status", "summary", "correlation_id", "created_at"],
    rows: [
      memRow("l1", "whatsapp · Message delivered", "info", { provider: "whatsapp", direction: "outbound", status: "ok", summary: "Message delivered", correlation_id: "wamid.HBgM", created_at: "2026-10-06T09:12:00Z" }, "/inbox"),
      memRow("l2", "gmail · Token refresh failed", "critical", { provider: "gmail", direction: "system", status: "error", summary: "Token refresh failed", correlation_id: "gm-7f21", created_at: "2026-10-06T08:40:00Z" }, "/inbox"),
    ],
  },
};

let mem: MemoryRepo | null = null;

export function createReportRepository(): ReportRepository {
  const api = new ApiRepo(http);
  if (!mem) mem = new MemoryRepo();
  return createRepository<ReportRepository>({
    api,
    memory: mem,
    reads: ["kinds", "run", "exportCsv"],
  });
}
