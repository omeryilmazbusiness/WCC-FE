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
