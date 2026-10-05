/** Minor units per major unit; every amount in the API is an integer in minor units. */
export const MINOR_PER_MAJOR = 100;
const MINOR_DIGITS = 2;

const MONEY_INPUT = /^(\d{1,13})(?:[.,](\d{0,2}))?$/;

/**
 * Parses a user-typed major amount ("1250", "1250.5", "1250,50") into integer minor units
 * using string arithmetic only. Returns `null` for empty, negative, malformed input or more
 * than two decimals.
 */
export function parseMoneyInput(input: string): number | null {
  const match = MONEY_INPUT.exec(input.trim());
  if (!match) return null;
  const [, whole, fraction = ""] = match;
  const minor = Number(whole) * MINOR_PER_MAJOR + Number(fraction.padEnd(MINOR_DIGITS, "0"));
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Integer minor units → plain decimal string for inputs ("1250.50"), no float math. */
export function minorToInput(minor: number): string {
  if (!Number.isFinite(minor)) return "";
  const value = Math.trunc(minor);
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const whole = Math.floor(abs / MINOR_PER_MAJOR);
  const fraction = String(abs % MINOR_PER_MAJOR).padStart(MINOR_DIGITS, "0");
  return `${sign}${whole}.${fraction}`;
}

/** Narrow symbols like "£" are shared by SYP, EGP, LBP and GBP, so only unambiguous ones are used. */
const UNAMBIGUOUS_SYMBOLS: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", TRY: "₺", JPY: "¥", INR: "₹" };

/** A short glyph for an ISO 4217 code; falls back to the code itself. */
export function currencySymbol(code: string): string {
  return UNAMBIGUOUS_SYMBOLS[code] ?? code;
}
