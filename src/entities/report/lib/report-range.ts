import type { ReportKind } from "../model";

export type RangePreset = "7d" | "30d" | "90d" | "ytd";
export const RANGE_PRESETS: readonly RangePreset[] = ["7d", "30d", "90d", "ytd"];
export const DEFAULT_PRESET: RangePreset = "30d";

/** The server rejects longer periods. */
export const MAX_RANGE_DAYS = 366;

export type DayRange = { from: string; to: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

export function isDay(value: string): boolean {
  if (!DAY.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function toUtc(day: string): number {
  return Date.parse(`${day}T00:00:00Z`);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(day: string, days: number): string {
  return fromUtc(toUtc(day) + days * MS_PER_DAY);
}

/** Inclusive range ending today; "30d" covers today and the 29 days before it. */
export function presetRange(preset: RangePreset, today: string): DayRange {
  switch (preset) {
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "90d":
      return { from: addDays(today, -89), to: today };
    case "ytd":
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    default:
      return { from: addDays(today, -29), to: today };
  }
}

/** Preset matching the range, or null for a custom range. */
export function matchPreset(range: DayRange, today: string): RangePreset | null {
  for (const p of RANGE_PRESETS) {
    const r = presetRange(p, today);
    if (r.from === range.from && r.to === range.to) return p;
  }
  return null;
}

/** Inclusive length in days. */
export function rangeDays(range: DayRange): number {
  return Math.round((toUtc(range.to) - toUtc(range.from)) / MS_PER_DAY) + 1;
}

export type RangeIssue = "invalid" | "order" | "tooLong" | null;

export function rangeIssue(range: DayRange): RangeIssue {
  if (!isDay(range.from) || !isDay(range.to)) return "invalid";
  if (range.from > range.to) return "order";
  if (rangeDays(range) > MAX_RANGE_DAYS) return "tooLong";
  return null;
}

export function reportFileName(kind: ReportKind, range: DayRange): string {
  return `report-${kind}-${range.from}_${range.to}.csv`;
}

export function localToday(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
