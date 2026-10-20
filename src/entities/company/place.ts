/** Limits mirrored by `internal/domain/company` Normalize. */
export const COUNTRY_MAX = 80;
export const CITY_MAX = 80;
export const ADDRESS_MAX = 300;

const COUNTRY_NAME = /^[\p{L}][\p{L} .,'()\-]{1,79}$/u;

function collapseSpace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * A country display name, or a legacy ISO 3166-1 alpha-2 code (upper-cased).
 * Names keep the casing the operator typed.
 */
export function normalizeCountry(raw: string): string {
  const s = collapseSpace(raw);
  return /^[A-Za-z]{2}$/.test(s) ? s.toUpperCase() : s;
}

export function isCountryName(raw: string): boolean {
  const s = normalizeCountry(raw);
  if (s.length < 2 || s.length > COUNTRY_MAX) return false;
  return COUNTRY_NAME.test(s);
}

export function normalizeCity(raw: string): string {
  return collapseSpace(raw);
}

export function isCityName(raw: string): boolean {
  const n = [...normalizeCity(raw)].length;
  return n >= 2 && n <= CITY_MAX;
}

export function normalizeAddress(raw: string): string {
  return collapseSpace(raw);
}

export function isStreetAddress(raw: string): boolean {
  const n = [...normalizeAddress(raw)].length;
  return n >= 2 && n <= ADDRESS_MAX;
}
