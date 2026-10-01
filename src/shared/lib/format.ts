import { locales, type AppLocale } from "@/shared/i18n/routing";

const localeTag: Record<AppLocale, string> = {
  en: "en-US",
  ar: "ar-SA",
};

export function toIntlLocale(locale: string): string {
  if ((locales as readonly string[]).includes(locale)) {
    return localeTag[locale as AppLocale];
  }
  return localeTag.en;
}

/** Format calendar date for AR/EN (LTR/RTL-aware locale tag). */
export function formatDate(
  value: string | number | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(toIntlLocale(locale), options).format(d);
}

/** Calendar day `YYYY-MM-DD` (no time zone) → localized date, without a UTC day shift. */
export function formatDay(day: string, locale: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? formatDate(`${day}T00:00:00`, locale) : formatDate(day, locale);
}

/** Format date+time. */
export function formatDateTime(
  value: string | number | Date,
  locale: string,
): string {
  return formatDate(value, locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "5 minutes ago" / "in 2 days" / "now" in the UI locale. */
export function formatRelativeTime(
  value: string | number | Date,
  locale: string,
  now: number = Date.now(),
): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const seconds = Math.round((d.getTime() - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(toIntlLocale(locale), { numeric: "auto" });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(0, "second");
}

/** Compact elapsed time — "45m", "3h", "2d" — in the UI locale. */
export function formatDurationShort(minutes: number, locale: string): string {
  const m = Math.max(0, Math.round(minutes));
  const [value, unit] = m < 60 ? [m, "minute"] : m < 1440 ? [Math.floor(m / 60), "hour"] : [Math.floor(m / 1440), "day"];
  return new Intl.NumberFormat(toIntlLocale(locale), { style: "unit", unit, unitDisplay: "narrow" }).format(value);
}

/** Locale-aware number formatting. */
export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(toIntlLocale(locale), options).format(value);
}

/** Currency formatting — default SAR (Hajj/Umrah ops). */
export function formatCurrency(
  value: number,
  locale: string,
  currency = "SAR",
  options?: Intl.NumberFormatOptions,
): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

/** Integer minor units (API money) → localized currency string. */
export function formatMoney(minor: number, locale: string, currency: string): string {
  if (!Number.isFinite(minor)) return "—";
  try {
    return formatCurrency(minor / 100, locale, currency);
  } catch {
    return `${formatNumber(minor / 100, locale, { maximumFractionDigits: 2 })} ${currency}`;
  }
}

/** Minor units → localized currency in whole major units ("SAR 36,000"), for estimates such as budgets. */
export function formatMoneyWhole(minor: number, locale: string, currency: string): string {
  if (!Number.isFinite(minor)) return "—";
  try {
    return formatCurrency(Math.round(minor / 100), locale, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  } catch {
    return `${formatNumber(Math.round(minor / 100), locale)} ${currency}`;
  }
}

/** Whole units below a million, compact above (SAR 57.1M), for tight tiles. */
export function formatMoneyShort(minor: number, locale: string, currency: string): string {
  if (!Number.isFinite(minor)) return "—";
  const whole = Math.round(minor / 100);
  if (Math.abs(whole) < 1_000_000) return formatMoneyWhole(minor, locale, currency);
  try {
    return formatCurrency(whole, locale, currency, { notation: "compact", maximumFractionDigits: 1 });
  } catch {
    return formatMoneyWhole(minor, locale, currency);
  }
}

/** Compact percent e.g. 42.5% */
export function formatPercent(
  value: number,
  locale: string,
  fractionDigits = 1,
): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "percent",
    maximumFractionDigits: fractionDigits,
  }).format(value / 100);
}
