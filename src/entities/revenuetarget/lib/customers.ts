/** Mirrors the backend's MaxTargetCustomers. */
export const MAX_TARGET_CUSTOMERS = 1_000_000;

/** Accepts "1,250,000", "1 250 000" or "1250000.50" and returns minor units. */
export function parseMajorAmount(raw: string): number | null {
  const cleaned = raw.replace(/[\s,_]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const minor = Math.round(Number(cleaned) * 100);
  return minor > 0 && Number.isSafeInteger(minor) ? minor : null;
}

/** Whole number of customers to send; empty string means no volume goal. */
export function parseCustomers(raw: string): number | null | "invalid" {
  const cleaned = raw.replace(/[\s,_]/g, "").trim();
  if (!cleaned) return null;
  if (!/^\d+$/.test(cleaned)) return "invalid";
  const n = Number(cleaned);
  if (!Number.isSafeInteger(n) || n <= 0 || n > MAX_TARGET_CUSTOMERS) return "invalid";
  return n;
}
