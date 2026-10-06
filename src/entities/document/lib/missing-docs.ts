import type { MissingDocsRow } from "../model";

export type MissingKindCount = { kind: string; count: number };

export type MissingDocsSummary = {
  /** Bookings with at least one gap. */
  bookings: number;
  /** Travellers on those bookings. */
  travellers: number;
  /** Missing required documents across all bookings. */
  gaps: number;
  /** Most frequent first, then alphabetical. */
  byKind: MissingKindCount[];
};

export type MissingDocsFilter = {
  /** Only rows missing this kind; empty = all. */
  kind?: string;
  /** Matches customer name (EN/AR), booking number or id, case-insensitive. */
  query?: string;
};

export type DepartureUrgency = "past" | "critical" | "soon" | "planned";

/** Days before departure under which missing documents are critical. */
export const CRITICAL_DAYS = 7;
/** Days before departure under which missing documents need attention. */
export const SOON_DAYS = 21;

export function summarizeMissing(rows: readonly MissingDocsRow[]): MissingDocsSummary {
  const counts = new Map<string, number>();
  let travellers = 0;
  let gaps = 0;
  for (const row of rows) {
    travellers += Math.max(row.paxCount, 1);
    gaps += row.missingKinds.length;
    for (const kind of new Set(row.missingKinds)) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  const byKind = [...counts]
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind));
  return { bookings: rows.length, travellers, gaps, byKind };
}

export function filterMissing(rows: readonly MissingDocsRow[], filter: MissingDocsFilter): MissingDocsRow[] {
  const kind = filter.kind?.trim();
  const query = filter.query?.trim().toLocaleLowerCase();
  return rows.filter((row) => {
    if (kind && !row.missingKinds.includes(kind)) return false;
    if (!query) return true;
    return [row.customerName, row.customerNameAr, row.refCode, row.bookingId].some((v) =>
      v.toLocaleLowerCase().includes(query),
    );
  });
}

/** Most gaps first, then most travellers, then booking number. */
export function sortMissing(rows: readonly MissingDocsRow[]): MissingDocsRow[] {
  return [...rows].sort(
    (a, b) =>
      b.missingKinds.length - a.missingKinds.length ||
      b.paxCount - a.paxCount ||
      (a.refCode || a.bookingId).localeCompare(b.refCode || b.bookingId),
  );
}

/** Whole days from `today` to `departDate` (both `YYYY-MM-DD`, or ISO); `null` when unknown. */
export function daysUntil(departDate: string, today: string): number | null {
  const a = Date.parse(`${today.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${departDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

export function departureUrgency(days: number | null): DepartureUrgency {
  if (days === null) return "planned";
  if (days < 0) return "past";
  if (days <= CRITICAL_DAYS) return "critical";
  return days <= SOON_DAYS ? "soon" : "planned";
}

function csvCell(value: string | number): string {
  const text = String(value);
  // Leading =, +, -, @ would be evaluated as formulas by spreadsheet apps.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export type MissingDocsCsvLabels = {
  headers: [booking: string, customer: string, travellers: string, status: string, missing: string, bookingId: string];
  kind: (kind: string) => string;
  status: (status: string) => string;
};

/** Spreadsheet-safe CSV (UTF-8 BOM, CRLF) with translated headers and kind names. */
export function missingDocsCsv(rows: readonly MissingDocsRow[], labels: MissingDocsCsvLabels): string {
  const lines = [labels.headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.refCode || row.bookingId,
        row.customerName,
        row.paxCount,
        row.bookingStatus ? labels.status(row.bookingStatus) : "",
        row.missingKinds.map(labels.kind).join("; "),
        row.bookingId,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return "\uFEFF" + lines.join("\r\n");
}
