/**
 * Dashboard reporting window. Presets roll back from "now"; a custom window
 * covers whole calendar days in the viewer's local time zone, both ends inclusive.
 * Pure: every function that depends on the clock takes `now`.
 */

export const PERIOD_PRESETS = [7, 30, 90] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export type DashboardPeriod =
  | { kind: "preset"; days: PeriodPreset }
  | { kind: "custom"; from: string; to: string };

export type PeriodWindow = { from: Date; to: Date };

export type RangeError = "required" | "order" | "future" | "tooLong";

const DEFAULT_DAYS: PeriodPreset = 30;
export const DEFAULT_PERIOD: DashboardPeriod = { kind: "preset", days: DEFAULT_DAYS };

/** Longest window the dashboard API accepts (366 days). */
export const MAX_RANGE_DAYS = 366;

const DAY_MS = 86_400_000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Local calendar day as YYYY-MM-DD. */
export function toISODay(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Local midnight of a YYYY-MM-DD day, or null when it is not a real date. */
export function parseISODay(iso: string): Date | null {
  if (!ISO_DAY.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

/** Calendar days in [from, to], both inclusive; 0 when either end is invalid. */
export function daysInclusive(from: string, to: string): number {
  const f = parseISODay(from);
  const t = parseISODay(to);
  if (!f || !t) return 0;
  return Math.round((Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) - Date.UTC(f.getFullYear(), f.getMonth(), f.getDate())) / DAY_MS) + 1;
}

export function validateRange(from: string, to: string, now: Date): RangeError | null {
  const f = parseISODay(from);
  const t = parseISODay(to);
  if (!f || !t) return "required";
  if (f > t) return "order";
  if (to > toISODay(now)) return "future";
  if (daysInclusive(from, to) > MAX_RANGE_DAYS) return "tooLong";
  return null;
}

export function isPreset(value: number): value is PeriodPreset {
  return (PERIOD_PRESETS as readonly number[]).includes(value);
}

/** Concrete instants for the API; a custom window that ends today stops at `now`. */
export function resolveWindow(period: DashboardPeriod, now: Date): PeriodWindow {
  if (period.kind === "preset") {
    return { from: new Date(now.getTime() - period.days * DAY_MS), to: now };
  }
  const from = parseISODay(period.from) ?? now;
  const endDay = parseISODay(period.to) ?? now;
  const dayAfter = new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate() + 1);
  return { from, to: dayAfter < now ? dayAfter : now };
}

export function periodDays(period: DashboardPeriod): number {
  return period.kind === "preset" ? period.days : daysInclusive(period.from, period.to);
}

/** Stable identity for query dependencies and URL comparison. */
export function periodKey(period: DashboardPeriod): string {
  return period.kind === "preset" ? String(period.days) : `${period.from}_${period.to}`;
}

/** The last `days` calendar days up to today; seeds the custom editor from a preset. */
export function trailingRange(days: number, now: Date): { from: string; to: string } {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  return { from: toISODay(from), to: toISODay(now) };
}

export type RangeShortcut = "thisMonth" | "lastMonth" | "quarter" | "yearToDate";
export const RANGE_SHORTCUTS: readonly RangeShortcut[] = ["thisMonth", "lastMonth", "quarter", "yearToDate"];

export function shortcutRange(shortcut: RangeShortcut, now: Date): { from: string; to: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = toISODay(now);
  switch (shortcut) {
    case "thisMonth":
      return { from: toISODay(new Date(y, m, 1)), to: today };
    case "lastMonth":
      return { from: toISODay(new Date(y, m - 1, 1)), to: toISODay(new Date(y, m, 0)) };
    case "quarter":
      return { from: toISODay(new Date(y, m - (m % 3), 1)), to: today };
    case "yearToDate":
      return { from: toISODay(new Date(y, 0, 1)), to: today };
  }
}

type Params = { get(name: string): string | null };

/** Reads `?period=7` or `?from=YYYY-MM-DD&to=YYYY-MM-DD`; anything invalid falls back to the default. */
export function parsePeriodParams(params: Params, now: Date): DashboardPeriod {
  const from = params.get("from");
  const to = params.get("to");
  if (from && to && validateRange(from, to, now) === null) return { kind: "custom", from, to };
  const days = Number(params.get("period"));
  return isPreset(days) ? { kind: "preset", days } : DEFAULT_PERIOD;
}

/** Writes the period into `params`, leaving unrelated keys alone; the default is omitted. */
export function writePeriodParams(params: URLSearchParams, period: DashboardPeriod): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete("period");
  next.delete("from");
  next.delete("to");
  if (period.kind === "custom") {
    next.set("from", period.from);
    next.set("to", period.to);
  } else if (period.days !== DEFAULT_DAYS) {
    next.set("period", String(period.days));
  }
  return next;
}
