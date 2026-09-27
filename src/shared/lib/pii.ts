export const MASK = "••••";

/** How long a revealed secret stays on screen before it is masked again. */
export const REVEAL_MS = 30_000;

const MASK_CHARS = /[•*●]/;

/** True for server-masked values such as "••••1234" (or legacy "A12****78"). */
export function isMaskedSecret(value: string | null | undefined): boolean {
  return Boolean(value && MASK_CHARS.test(value));
}

/**
 * Display form of a secret. Already-masked values pass through; a plain value is
 * reduced to its last 4 characters so a full number never reaches the DOM from a read.
 */
export function toMaskedSecret(value: string | null | undefined, last4?: string | null): string {
  const v = (value ?? "").trim();
  if (isMaskedSecret(v)) return v;
  const tail = (last4 ?? "").trim() || (v.length > 4 ? v.slice(-4) : "");
  if (!v && !tail) return "";
  return `${MASK}${tail}`;
}

/** Last 4 visible characters of a masked value ("••••1234" → "1234"). */
export function maskedLast4(value: string | null | undefined): string {
  const tail = (value ?? "").split(MASK_CHARS).pop() ?? "";
  return tail.slice(-4);
}

/**
 * Passport value for an update request. Blank input or the masked placeholder the API
 * returned yields `undefined` (field omitted → the stored passport is kept); anything
 * else is a new passport number.
 */
export function passportPatchValue(input: string | null | undefined): string | undefined {
  const v = (input ?? "").trim();
  if (!v || isMaskedSecret(v)) return undefined;
  return v;
}
