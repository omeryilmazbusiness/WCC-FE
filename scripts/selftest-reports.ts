/**
 * Self-test: reports screen — period presets and validation, row filtering/sorting, severity
 * counts, finance currency handling, drill-down keys, column contract with the API and en/ar
 * keys (pure, no I/O besides reading sources).
 * Run: npm run test:reports
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MAX_RANGE_DAYS,
  RANGE_PRESETS,
  addDays,
  isDay,
  localToday,
  matchPreset,
  presetRange,
  rangeDays,
  rangeIssue,
  reportFileName,
} from "../src/entities/report/lib/report-range.ts";
import {
  REPORT_SPECS,
  bpsToPercent,
  currencyRowCode,
  drillKey,
  filterRows,
  nextSort,
  num,
  severityCounts,
  sortRows,
  summaryCurrency,
} from "../src/entities/report/lib/report-spec.ts";
import type { ReportKind, ReportRow } from "../src/entities/report/model.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function row(id: string, label: string, severity: string, metrics: Record<string, unknown> = {}): ReportRow {
  return { id, label, severity, metrics, drilldowns: [] };
}

function ranges() {
  const today = "2026-10-06";
  assert.deepEqual(presetRange("7d", today), { from: "2026-09-30", to: today });
  assert.deepEqual(presetRange("30d", today), { from: "2026-09-07", to: today });
  assert.deepEqual(presetRange("90d", today), { from: "2026-07-09", to: today });
  assert.deepEqual(presetRange("ytd", today), { from: "2026-01-01", to: today });
  assert.equal(rangeDays(presetRange("7d", today)), 7);
  assert.equal(rangeDays(presetRange("30d", today)), 30);
  for (const p of RANGE_PRESETS) assert.equal(matchPreset(presetRange(p, today), today), p);
  assert.equal(matchPreset({ from: "2026-09-01", to: today }, today), null);

  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.ok(isDay("2026-02-28"));
  assert.ok(!isDay("2026-02-30"));
  assert.ok(!isDay("06/10/2026"));

  assert.equal(rangeIssue({ from: "2026-10-01", to: "2026-10-01" }), null);
  assert.equal(rangeIssue({ from: "", to: today }), "invalid");
  assert.equal(rangeIssue({ from: "2026-10-07", to: today }), "order");
  assert.equal(rangeIssue({ from: addDays(today, -(MAX_RANGE_DAYS - 1)), to: today }), null);
  assert.equal(rangeIssue({ from: addDays(today, -MAX_RANGE_DAYS), to: today }), "tooLong");

  assert.equal(reportFileName("finance", { from: "2026-09-07", to: today }), "report-finance-2026-09-07_2026-10-06.csv");
  assert.equal(localToday(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
}

function rows() {
  const list = [
    row("a", "Sara Mansour", "info", { leads_won: 9, channel: "whatsapp" }),
    row("b", "Khaled Odeh", "warning", { leads_won: 4 }),
    row("c", "Omar Nasser", "critical", { leads_won: 12 }),
    row("d", "Lina Haddad", "", { leads_won: null }),
  ];
  assert.deepEqual(severityCounts(list), { all: 4, critical: 1, warning: 1, info: 2 });

  assert.deepEqual(filterRows(list, { query: "  KHALED " }).map((r) => r.id), ["b"]);
  assert.deepEqual(filterRows(list, { query: "whats" }).map((r) => r.id), ["a"], "searches string metrics");
  assert.deepEqual(filterRows(list, { severity: "info" }).map((r) => r.id), ["a", "d"], "blank severity counts as info");
  assert.deepEqual(filterRows(list, { query: "", severity: "" }).length, 4);

  assert.deepEqual(sortRows(list, null).map((r) => r.id), ["c", "b", "a", "d"], "most severe first, stable");
  assert.deepEqual(sortRows(list, { key: "leads_won", dir: "desc" }).map((r) => r.id), ["c", "a", "b", "d"], "nulls last");
  assert.deepEqual(sortRows(list, { key: "leads_won", dir: "asc" }).map((r) => r.id), ["b", "a", "c", "d"], "nulls last ascending too");
  assert.deepEqual(sortRows(list, { key: "label", dir: "asc" }).map((r) => r.id), ["b", "d", "c", "a"]);

  assert.deepEqual(nextSort(null, "x"), { key: "x", dir: "desc" });
  assert.deepEqual(nextSort({ key: "x", dir: "desc" }, "x"), { key: "x", dir: "asc" });
  assert.equal(nextSort({ key: "x", dir: "asc" }, "x"), null);
  assert.deepEqual(nextSort({ key: "x", dir: "asc" }, "y"), { key: "y", dir: "desc" });
}

function values() {
  assert.equal(num(12), 12);
  assert.equal(num("3.5"), 3.5);
  assert.equal(num(""), null);
  assert.equal(num("abc"), null);
  assert.equal(num(Number.NaN), null);
  assert.equal(bpsToPercent(2826), 28.26);
  assert.equal(bpsToPercent(10000), 100);

  assert.equal(drillKey("/bookings/0b1c"), "booking");
  assert.equal(drillKey("/bookings?owner=u1"), "bookings");
  assert.equal(drillKey("/pipeline?owner=u1"), "pipeline");
  assert.equal(drillKey("/missing-docs"), "missing-docs");
  assert.equal(drillKey("/inbox?channel=whatsapp"), "inbox");
  assert.equal(drillKey(""), "open");
}

function currencies() {
  const sar = row("SAR", "Currency SAR", "warning", { currency: "SAR" });
  const usd = row("USD", "Currency USD", "info", { currency: "USD" });
  const booking = row("b1", "Currency SAR", "critical", { currency: "SAR" });
  assert.equal(currencyRowCode(sar), "SAR");
  assert.equal(currencyRowCode(booking), null, "a customer literally named like the label is not a currency row");
  assert.equal(currencyRowCode(row("x", "Ahmad", "info")), null);

  assert.equal(summaryCurrency({ kind: "finance", summary: { currencies: 1 }, rows: [sar, booking] }), "SAR");
  assert.equal(summaryCurrency({ kind: "finance", summary: { currencies: 2 }, rows: [sar, usd] }), null);
  assert.equal(summaryCurrency({ kind: "finance", summary: { currencies: 0 }, rows: [] }), null);
  assert.equal(summaryCurrency({ kind: "targets", summary: {}, rows: [row("t", "T", "info", { currency: "SAR" })] }), "SAR");
  assert.equal(summaryCurrency({ kind: "targets", summary: {}, rows: [row("t", "T", "info", { currency: "SAR" }), row("u", "U", "info", { currency: "USD" })] }), null);
}

/** Columns the API sends per report (`report.ColumnsFor` in the backend). */
const API_COLUMNS: Record<ReportKind, string[]> = {
  sales: ["leads_handled", "leads_won", "conversion_bps", "open_tasks", "overdue_tasks", "collected_amt"],
  targets: ["metric", "target_amount", "actual_amount", "expected_to_date", "variance", "progress_bps", "status", "currency"],
  readiness: ["status", "pax_count", "balance_amt", "missing_docs", "can_confirm", "risk_count"],
  sla: ["channel", "conversations", "breached", "breach_bps", "avg_unanswered_hours", "open_unassigned"],
  finance: ["booked_amt", "collected_amt", "balance_amt", "payment_count", "overdue_count", "currency"],
  integrations: ["provider", "direction", "status", "summary", "correlation_id", "created_at"],
};

/** Summary keys the API sends per report. */
const API_SUMMARY: Record<ReportKind, string[]> = {
  sales: ["owners", "leads_handled", "leads_won", "conversion_bps", "collected_amt"],
  targets: ["targets", "ahead", "on_track", "behind"],
  readiness: ["bookings", "ready", "blocked", "overrides"],
  sla: ["channels", "conversations", "breached", "breach_bps"],
  finance: ["booked_amt", "collected_amt", "balance_amt", "overdue_count", "currencies"],
  integrations: ["total", "errors", "rows"],
};

function contract() {
  for (const [kind, spec] of Object.entries(REPORT_SPECS) as [ReportKind, (typeof REPORT_SPECS)[ReportKind]][]) {
    assert.equal(spec.kind, kind);
    for (const c of spec.columns) assert.ok(API_COLUMNS[kind].includes(c.key), `${kind} column ${c.key}`);
    for (const s of spec.summary) {
      assert.ok(API_SUMMARY[kind].includes(s.key), `${kind} summary ${s.key}`);
      if (s.captionKey) assert.ok(API_SUMMARY[kind].includes(s.captionKey), `${kind} caption ${s.captionKey}`);
    }
    assert.ok(spec.summary.length >= 3 && spec.summary.length <= 4, `${kind} tile count`);
  }
  assert.deepEqual(
    (Object.keys(REPORT_SPECS) as ReportKind[]).filter((k) => REPORT_SPECS[k].sensitive).sort(),
    ["finance", "integrations", "sales"],
    "matches report.IsSensitive",
  );
}

function i18n() {
  const load = (l: string) => JSON.parse(fs.readFileSync(path.join(root, `src/shared/i18n/messages/${l}.json`), "utf8"));
  const files = ["reports-board.tsx", "kind-picker.tsx", "report-filters.tsx", "report-summary.tsx", "report-table.tsx", "metric-value.tsx"].map(
    (f) => `src/widgets/reports-board/ui/${f}`,
  );
  const keys = new Set<string>();
  for (const file of files) {
    for (const text of fs.readFileSync(path.join(root, file), "utf8").split(/\n(?=(?:export )?function )/)) {
      const bindings = new Map<string, string>();
      for (const m of text.matchAll(/const (\w+) = useTranslations\("([^"]+)"\)/g)) bindings.set(m[1], m[2]);
      for (const [fn, ns] of bindings) {
        for (const m of text.matchAll(new RegExp(`\\b${fn}\\(\\s*"([^"]+)"`, "g"))) keys.add(`${ns}.${m[1]}`);
      }
    }
  }
  for (const kind of Object.keys(REPORT_SPECS) as ReportKind[]) {
    keys.add(`reports.kinds.${kind}`);
    keys.add(`reports.kindHint.${kind}`);
    for (const c of REPORT_SPECS[kind].columns) keys.add(`reports.metrics.${c.key}`);
    for (const s of REPORT_SPECS[kind].summary) {
      keys.add(`reports.metrics.${s.key}`);
      if (s.captionKey) keys.add(`reports.caption.${s.captionKey}`);
    }
  }
  for (const p of [...RANGE_PRESETS, "custom"]) keys.add(`reports.filters.preset.${p}`);
  for (const i of ["invalid", "order", "tooLong"]) keys.add(`reports.filters.issue.${i}`);
  for (const s of ["all", "critical", "warning", "info"]) keys.add(`reports.severity.${s}`);
  for (const s of ["ahead", "on_track", "behind", "unknown", "ok", "error", "degraded", "retry"]) keys.add(`reports.statusValue.${s}`);
  for (const s of ["collected", "booked", "inbound", "outbound", "system"]) keys.add(`reports.textValue.${s}`);
  for (const d of ["booking", "bookings", "pipeline", "missing-docs", "inbox", "finance", "targets"]) keys.add(`reports.drill.${d}`);
  assert.ok(keys.size > 100, `found ${keys.size} keys`);

  for (const locale of ["en", "ar"]) {
    const messages = load(locale);
    for (const key of keys) {
      const value = key.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)?.[p], messages);
      assert.equal(typeof value, "string", `[${locale}] ${key}`);
    }
  }
}

ranges();
rows();
values();
currencies();
contract();
i18n();
console.log("reports selftest OK");
