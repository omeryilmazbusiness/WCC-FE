import type { TargetPeriodKind } from "../model";

/** Display order, shortest horizon first; mirrors the backend ranking. */
export const TARGET_PERIOD_KINDS: readonly TargetPeriodKind[] = [
  "weekly",
  "monthly",
  "season",
  "yearly",
  "custom",
];

/** Calendar kinds derive the whole range from any day inside it. */
export function isCalendarPeriod(kind: TargetPeriodKind): boolean {
  return kind === "weekly" || kind === "monthly" || kind === "yearly";
}

/** Longest explicit range the backend accepts. */
export const MAX_PERIOD_DAYS = 3 * 366;

export type PeriodRange = { start: string; end: string };
export type PeriodError = "start" | "end" | "span";

const DAY_MS = 86_400_000;

function parseDay(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : d;
}

function toDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayISO(now: Date = new Date()): string {
  return toDay(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function daysInclusive(start: string, end: string): number {
  const s = parseDay(start);
  const e = parseDay(end);
  if (!s || !e) return 0;
  return Math.round((e.getTime() - s.getTime()) / DAY_MS) + 1;
}

/**
 * Canonical [start, end] for a target, matching the backend's ResolvePeriod:
 * weekly snaps to the ISO week (Mon–Sun), monthly to the calendar month and
 * yearly to the calendar year around `start`; season and custom use both dates.
 */
export function resolvePeriod(
  kind: TargetPeriodKind,
  start: string,
  end?: string,
): { ok: true; range: PeriodRange } | { ok: false; error: PeriodError } {
  const s = parseDay(start);
  if (!s) return { ok: false, error: "start" };
  const y = s.getUTCFullYear();
  const m = s.getUTCMonth();
  if (kind === "weekly") {
    const monday = new Date(s.getTime() - ((s.getUTCDay() + 6) % 7) * DAY_MS);
    return { ok: true, range: { start: toDay(monday), end: toDay(new Date(monday.getTime() + 6 * DAY_MS)) } };
  }
  if (kind === "monthly") {
    return { ok: true, range: { start: toDay(new Date(Date.UTC(y, m, 1))), end: toDay(new Date(Date.UTC(y, m + 1, 0))) } };
  }
  if (kind === "yearly") {
    return { ok: true, range: { start: `${y}-01-01`, end: `${y}-12-31` } };
  }
  const e = end ? parseDay(end) : null;
  if (!e || e < s) return { ok: false, error: "end" };
  if (daysInclusive(start, end!) > MAX_PERIOD_DAYS) return { ok: false, error: "span" };
  return { ok: true, range: { start, end: end! } };
}

/** Anchor → next/previous period of the same calendar kind. */
export function shiftPeriod(kind: TargetPeriodKind, start: string, step: number): string {
  const s = parseDay(start);
  if (!s) return start;
  if (kind === "weekly") return toDay(new Date(s.getTime() + step * 7 * DAY_MS));
  if (kind === "monthly") return toDay(new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + step, 1)));
  if (kind === "yearly") return `${s.getUTCFullYear() + step}-01-01`;
  return start;
}

/** ISO-8601 week number of the week containing `iso`. */
export function isoWeek(iso: string): number {
  const d = parseDay(iso);
  if (!d) return 0;
  const thursday = new Date(d.getTime() + (3 - ((d.getUTCDay() + 6) % 7)) * DAY_MS);
  const jan4 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const week1Thursday = new Date(jan4.getTime() + (3 - ((jan4.getUTCDay() + 6) % 7)) * DAY_MS);
  return 1 + Math.round((thursday.getTime() - week1Thursday.getTime()) / (7 * DAY_MS));
}
