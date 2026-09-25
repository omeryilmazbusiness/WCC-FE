import { env } from "@/shared/config/env";
import { FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import type {
  DrillRef,
  ReportFilter,
  ReportKind,
  ReportKindMeta,
  ReportResult,
  ReportRow,
} from "./model";

function tokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  const session = parseSession(raw ? decodeURIComponent(raw) : null);
  return session?.accessToken ?? null;
}

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
    const token = tokenFromCookie();
    const res = await fetch(
      `${env.apiBaseUrl}/reports/export?kind=${encodeURIComponent(kind)}${qs(filter).replace("?", "&")}`,
      {
        headers: {
          Accept: "text/csv",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );
    if (!res.ok) throw new Error("export failed");
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

  async run(kind: ReportKind) {
    return {
      kind,
      generatedAt: new Date().toISOString(),
      filter: {},
      summary: { rows: 1 },
      columns: ["sample"],
      rows: [
        {
          id: "1",
          label: "Sample row",
          metrics: { sample: 1 },
          severity: "info",
          drilldowns: [
            {
              entityType: "booking",
              entityId: "1",
              hrefHint: "/bookings",
              label: "Open",
            },
          ],
        },
      ],
    };
  }

  async exportCsv() {
    return new Blob(["id,label\n1,Sample\n"], { type: "text/csv" });
  }
}

let mem: MemoryRepo | null = null;

export function createReportRepository(): ReportRepository {
  const http = new FetchHttpClient(env.apiBaseUrl, tokenFromCookie);
  const api = new ApiRepo(http);
  if (!mem) mem = new MemoryRepo();
  const wrap =
    <A extends unknown[], R>(
      fn: (...args: A) => Promise<R>,
      fallback: (...args: A) => Promise<R>,
    ) =>
    async (...args: A) => {
      try {
        return await fn(...args);
      } catch {
        return fallback(...args);
      }
    };
  return {
    kinds: wrap(api.kinds.bind(api), mem.kinds.bind(mem)),
    run: wrap(api.run.bind(api), mem.run.bind(mem)),
    exportCsv: wrap(api.exportCsv.bind(api), mem.exportCsv.bind(mem)),
  };
}
