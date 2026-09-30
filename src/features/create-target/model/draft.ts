import {
  isCalendarPeriod,
  isoWeek,
  resolvePeriod,
  type CreateTargetInput,
  type PeriodError,
  type PeriodRange,
  type TargetMetric,
  type TargetPeriodKind,
} from "@/entities/revenuetarget";

export type TargetDraft = {
  kind: TargetPeriodKind;
  /** Any day inside the period for calendar kinds; the first day otherwise. */
  start: string;
  end: string;
  amount: string;
  currency: string;
  metric: TargetMetric;
  label: string;
};

export type DraftErrors = Partial<Record<"amount" | "currency" | "label" | "period", PeriodError | "required" | "invalid">>;

/** Accepts "1,250,000", "1 250 000" or "1250000.50" and returns minor units. */
export function parseMajorAmount(raw: string): number | null {
  const cleaned = raw.replace(/[\s,_]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const minor = Math.round(Number(cleaned) * 100);
  return minor > 0 && Number.isSafeInteger(minor) ? minor : null;
}

export function draftRange(d: TargetDraft) {
  return resolvePeriod(d.kind, d.start, isCalendarPeriod(d.kind) ? undefined : d.end);
}

type Formatters = {
  week: (values: { week: number; year: number }) => string;
  year: (values: { year: number }) => string;
  season: (values: { range: string }) => string;
  custom: (values: { range: string }) => string;
};

export function formatDay(iso: string, locale: string, withYear = false): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** Locale-aware range ("Sep 1 – 30, 2026", "1–30 سبتمبر 2026"); collapses shared month/year. */
export function formatRange(range: PeriodRange, locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return fmt.formatRange(new Date(`${range.start}T00:00:00Z`), new Date(`${range.end}T00:00:00Z`));
}

/** Human label for a period, e.g. "September 2026" or "Week 40 · 2026". */
export function suggestLabel(kind: TargetPeriodKind, range: PeriodRange, locale: string, f: Formatters): string {
  const year = Number(range.start.slice(0, 4));
  switch (kind) {
    case "weekly":
      return f.week({ week: isoWeek(range.start), year: Number(range.end.slice(0, 4)) });
    case "monthly":
      return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
        new Date(`${range.start}T00:00:00Z`),
      );
    case "yearly":
      return f.year({ year });
    case "season":
      return f.season({ range: formatRange(range, locale) });
    default:
      return f.custom({ range: formatRange(range, locale) });
  }
}

export function validateDraft(d: TargetDraft): { errors: DraftErrors; input?: CreateTargetInput } {
  const errors: DraftErrors = {};
  const period = draftRange(d);
  if (!period.ok) errors.period = period.error;
  const amount = parseMajorAmount(d.amount);
  if (!d.amount.trim()) errors.amount = "required";
  else if (amount === null) errors.amount = "invalid";
  const currency = d.currency.trim().toUpperCase();
  if (currency && !/^[A-Z]{3}$/.test(currency)) errors.currency = "invalid";
  if (!d.label.trim()) errors.label = "required";
  if (Object.keys(errors).length > 0 || !period.ok || amount === null) return { errors };
  return {
    errors,
    input: {
      label: d.label.trim(),
      targetAmount: amount,
      currency: currency || undefined,
      metric: d.metric,
      scopeType: "branch",
      curveType: "linear",
      periodKind: d.kind,
      periodStart: period.range.start,
      periodEnd: period.range.end,
    },
  };
}
