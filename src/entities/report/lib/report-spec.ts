import type { ReportKind, ReportResult, ReportRow } from "../model";

/** How a metric value is rendered; amounts arrive in minor units, ratios in basis points. */
export type MetricFormat =
  | "int"
  | "money"
  | "amount"
  | "bps"
  | "hours"
  | "bool"
  | "text"
  | "code"
  | "status"
  | "bookingStatus"
  | "datetime";

export type ColumnSpec = {
  key: string;
  format: MetricFormat;
  /** Ratio where a higher value is bad (breach rate) — flips the bar colour. */
  inverse?: boolean;
  /** Zero is rendered as "—" (rows where the figure does not apply). */
  zeroAsDash?: boolean;
  /** Positive values are worth a warning tint (overdue, missing). */
  warnAbove?: number;
};

export type SummarySpec = {
  key: string;
  format: MetricFormat;
  /** Summary key shown as the tile's caption count. */
  captionKey?: string;
};

export type ReportSpec = {
  kind: ReportKind;
  /** Exports leave an audit trail on the server. */
  sensitive: boolean;
  /** Extra free-text filter the endpoint understands. */
  extraFilter?: "channel" | "provider";
  summary: SummarySpec[];
  columns: ColumnSpec[];
};

/** One spec per report; adding a report is a new entry here, the board stays untouched. */
export const REPORT_SPECS: Record<ReportKind, ReportSpec> = {
  sales: {
    kind: "sales",
    sensitive: true,
    summary: [
      { key: "leads_handled", format: "int", captionKey: "owners" },
      { key: "leads_won", format: "int" },
      { key: "conversion_bps", format: "bps" },
      { key: "collected_amt", format: "amount" },
    ],
    columns: [
      { key: "leads_handled", format: "int" },
      { key: "leads_won", format: "int" },
      { key: "conversion_bps", format: "bps" },
      { key: "open_tasks", format: "int" },
      { key: "overdue_tasks", format: "int", warnAbove: 0 },
      { key: "collected_amt", format: "amount" },
    ],
  },
  targets: {
    kind: "targets",
    sensitive: false,
    summary: [
      { key: "targets", format: "int" },
      { key: "ahead", format: "int" },
      { key: "on_track", format: "int" },
      { key: "behind", format: "int" },
    ],
    columns: [
      { key: "metric", format: "text" },
      { key: "progress_bps", format: "bps" },
      { key: "actual_amount", format: "money" },
      { key: "target_amount", format: "money" },
      { key: "expected_to_date", format: "money" },
      { key: "variance", format: "money" },
      { key: "status", format: "status" },
    ],
  },
  readiness: {
    kind: "readiness",
    sensitive: false,
    summary: [
      { key: "bookings", format: "int" },
      { key: "ready", format: "int" },
      { key: "blocked", format: "int" },
      { key: "overrides", format: "int" },
    ],
    columns: [
      { key: "status", format: "bookingStatus" },
      { key: "pax_count", format: "int" },
      { key: "balance_amt", format: "amount", warnAbove: 0 },
      { key: "missing_docs", format: "int", warnAbove: 0 },
      { key: "risk_count", format: "int", warnAbove: 0 },
      { key: "can_confirm", format: "bool" },
    ],
  },
  sla: {
    kind: "sla",
    sensitive: false,
    extraFilter: "channel",
    summary: [
      { key: "conversations", format: "int", captionKey: "channels" },
      { key: "breached", format: "int" },
      { key: "breach_bps", format: "bps" },
      { key: "channels", format: "int" },
    ],
    columns: [
      { key: "conversations", format: "int" },
      { key: "breached", format: "int", warnAbove: 0 },
      { key: "breach_bps", format: "bps", inverse: true },
      { key: "avg_unanswered_hours", format: "hours" },
      { key: "open_unassigned", format: "int", warnAbove: 0 },
    ],
  },
  finance: {
    kind: "finance",
    sensitive: true,
    summary: [
      { key: "booked_amt", format: "money" },
      { key: "collected_amt", format: "money" },
      { key: "balance_amt", format: "money" },
      { key: "overdue_count", format: "int" },
    ],
    columns: [
      { key: "booked_amt", format: "money", zeroAsDash: true },
      { key: "collected_amt", format: "money", zeroAsDash: true },
      { key: "balance_amt", format: "money", warnAbove: 0 },
      { key: "payment_count", format: "int", zeroAsDash: true },
      { key: "overdue_count", format: "int", warnAbove: 0 },
    ],
  },
  integrations: {
    kind: "integrations",
    sensitive: true,
    extraFilter: "provider",
    summary: [
      { key: "total", format: "int" },
      { key: "errors", format: "int" },
      { key: "rows", format: "int" },
    ],
    columns: [
      { key: "direction", format: "text" },
      { key: "status", format: "status" },
      { key: "correlation_id", format: "code" },
      { key: "created_at", format: "datetime" },
    ],
  },
};

export type Severity = "critical" | "warning" | "info";
export const SEVERITIES: readonly Severity[] = ["critical", "warning", "info"];

export function severityOf(row: Pick<ReportRow, "severity">): Severity {
  return row.severity === "critical" || row.severity === "warning" ? row.severity : "info";
}

export function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/** Basis points (10000 = 100%) → percent number. */
export function bpsToPercent(bps: number): number {
  return Math.round(bps) / 100;
}

const CURRENCY_ROW = /^Currency ([A-Z]{3})$/;

/** Finance per-currency aggregate rows carry the code in an English label; null for other rows. */
export function currencyRowCode(row: Pick<ReportRow, "id" | "label">): string | null {
  const m = CURRENCY_ROW.exec(row.label);
  return m && m[1] === row.id ? m[1] : null;
}

/** Currency of the summary totals; null when they mix currencies and cannot be shown as money. */
export function summaryCurrency(result: Pick<ReportResult, "kind" | "summary" | "rows">): string | null {
  if (result.kind === "finance") {
    if (num(result.summary.currencies) !== 1) return null;
    const row = result.rows.find((r) => currencyRowCode(r));
    return row ? currencyRowCode(row) : null;
  }
  const codes = new Set(result.rows.map((r) => r.metrics.currency).filter((c): c is string => typeof c === "string" && c !== ""));
  return codes.size === 1 ? [...codes][0] : null;
}

export type SeverityCounts = Record<Severity, number> & { all: number };

export function severityCounts(rows: readonly ReportRow[]): SeverityCounts {
  const out: SeverityCounts = { all: rows.length, critical: 0, warning: 0, info: 0 };
  for (const r of rows) out[severityOf(r)] += 1;
  return out;
}

export type RowFilter = { query?: string; severity?: Severity | "" };

export function filterRows(rows: readonly ReportRow[], { query = "", severity = "" }: RowFilter): ReportRow[] {
  const q = query.trim().toLocaleLowerCase();
  return rows.filter((r) => {
    if (severity && severityOf(r) !== severity) return false;
    if (!q) return true;
    if (r.label.toLocaleLowerCase().includes(q)) return true;
    return Object.values(r.metrics).some((v) => typeof v === "string" && v.toLocaleLowerCase().includes(q));
  });
}

export type SortState = { key: string; dir: "asc" | "desc" } | null;

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

function isBlank(v: unknown): boolean {
  return v == null || v === "";
}

/** Explicit column sort (blanks always last), otherwise the server order with the most severe rows first. */
export function sortRows(rows: readonly ReportRow[], sort: SortState): ReportRow[] {
  const indexed = rows.map((row, i) => ({ row, i }));
  const pick = (r: ReportRow, key: string) => (key === "label" ? r.label : r.metrics[key]);
  indexed.sort((a, b) => {
    if (sort) {
      const va = pick(a.row, sort.key);
      const vb = pick(b.row, sort.key);
      if (isBlank(va) !== isBlank(vb)) return isBlank(va) ? 1 : -1;
      const cmp = compareValues(va, vb);
      if (cmp !== 0) return sort.dir === "asc" ? cmp : -cmp;
    } else {
      const sev = SEVERITY_RANK[severityOf(a.row)] - SEVERITY_RANK[severityOf(b.row)];
      if (sev !== 0) return sev;
    }
    return a.i - b.i;
  });
  return indexed.map((x) => x.row);
}

function compareValues(a: unknown, b: unknown): number {
  const na = num(a);
  const nb = num(b);
  if (na !== null && nb !== null) return na - nb;
  if (typeof a === "boolean" || typeof b === "boolean") return Number(Boolean(a)) - Number(Boolean(b));
  return String(a ?? "").localeCompare(String(b ?? ""));
}

/** Next sort after clicking a column header: desc → asc → server order. */
export function nextSort(current: SortState, key: string): SortState {
  if (!current || current.key !== key) return { key, dir: "desc" };
  return current.dir === "desc" ? { key, dir: "asc" } : null;
}

/** Translation key for a drill-down link, derived from its route ("/bookings/1" → "booking"). */
export function drillKey(hrefHint: string): string {
  const path = hrefHint.split("?")[0].replace(/^\/+/, "");
  const [head = "", id] = path.split("/");
  if (head === "bookings" && id) return "booking";
  return head || "open";
}
