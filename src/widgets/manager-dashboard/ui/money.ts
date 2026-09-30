const MINOR_PER_MAJOR = 100;

/** Short display for minor-unit amounts on tiles ("12.4K"); integer major units, no fractions. */
export function formatCompactMinor(minor: number, locale: string): string {
  if (!Number.isFinite(minor) || minor === 0) return "0";
  const major = Math.trunc(minor / MINOR_PER_MAJOR);
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(major);
}

/** Compact currency ("SAR 14K"); falls back to a plain number when the code is unknown or missing. */
export function formatCompactMoney(minor: number, currency: string, locale: string): string {
  if (!currency) return formatCompactMinor(minor, locale);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(Math.trunc(minor / MINOR_PER_MAJOR));
  } catch {
    return `${formatCompactMinor(minor, locale)} ${currency}`;
  }
}
