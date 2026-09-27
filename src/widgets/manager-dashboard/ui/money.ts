const MINOR_PER_MAJOR = 100;

/** Short display for minor-unit amounts on tiles ("12.4K"); integer major units, no fractions. */
export function formatCompactMinor(minor: number, locale: string): string {
  if (!Number.isFinite(minor) || minor === 0) return "0";
  const major = Math.trunc(minor / MINOR_PER_MAJOR);
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(major);
}
