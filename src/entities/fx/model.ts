export type FxRate = {
  id: string;
  base: string;
  quote: string;
  /** Decimal string as sent by the API ("3.75000000"); never parsed into a float for math. */
  rate: string;
  /** `YYYY-MM-DD` */
  effectiveDate: string;
  source: string;
  createdBy: string;
  createdAt: string;
};

export type FxFilters = {
  base?: string;
  quote?: string;
  /** `YYYY-MM-DD` */
  from?: string;
  /** `YYYY-MM-DD` */
  to?: string;
};

export type FxPageRequest = { limit: number; offset: number };

export type FxPage = {
  items: FxRate[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  totalPages: number;
};

export type FxRateCreateInput = {
  base: string;
  quote: string;
  rate: string;
  effectiveDate: string;
  source?: string;
};

export type FxRateUpdateInput = { rate: string; source?: string };

export type FxConversion = {
  /** Minor units in `from`. */
  amount: number;
  from: string;
  to: string;
  /** Minor units in `to`. */
  converted: number;
  rate: string;
  effectiveDate: string;
};

/** `POST /v1/fx-rates/adopt`: today's accounting rate from the live board. */
export type FxAdoptLiveInput = {
  currency: string;
  kind: "official" | "market";
  side: "mid" | "buy" | "sell";
};

export const FX_PAGE_SIZE = 25;
export const FX_RATE_MAX_DECIMALS = 8;
export const FX_RATE_EXISTS_CODE = "fx_rate_exists";
export const FX_RATE_NOT_FOUND_CODE = "fx_rate_not_found";

export type FxRateError = "required" | "format" | "precision" | "positive";

const DECIMAL = /^\d+(?:\.(\d+))?$/;

/** Validates a user-typed rate as a positive decimal string with at most 8 decimals. */
export function fxRateError(input: string): FxRateError | null {
  const value = input.trim();
  if (!value) return "required";
  const match = DECIMAL.exec(value);
  if (!match) return "format";
  if ((match[1]?.length ?? 0) > FX_RATE_MAX_DECIMALS) return "precision";
  if (!/[1-9]/.test(value)) return "positive";
  return null;
}

/** Canonical string for the API: trimmed, no leading zeros, no trailing fractional zeros. */
export function normalizeFxRate(input: string): string {
  const [whole, fraction = ""] = input.trim().split(".");
  const w = whole.replace(/^0+(?=\d)/, "");
  const f = fraction.replace(/0+$/, "");
  return f ? `${w}.${f}` : w;
}

/** Display form: "3.75000000" → "3.75", "1" → "1.00" (at least two decimals). */
export function formatFxRate(rate: string): string {
  if (fxRateError(rate)) return rate || "—";
  const [whole, fraction = ""] = normalizeFxRate(rate).split(".");
  return `${whole}.${fraction.padEnd(2, "0")}`;
}

export const CURRENCY_CODE = /^[A-Z]{3}$/;

export function normalizeCurrency(input: string): string {
  return input.trim().toUpperCase();
}

export function fxSearchParams(filters: FxFilters, page?: FxPageRequest): URLSearchParams {
  const sp = new URLSearchParams();
  const set = (key: string, value: string | undefined) => {
    const v = value?.trim();
    if (v) sp.set(key, v);
  };
  set("base", filters.base && normalizeCurrency(filters.base));
  set("quote", filters.quote && normalizeCurrency(filters.quote));
  set("from", filters.from);
  set("to", filters.to);
  if (page) {
    sp.set("limit", String(page.limit));
    sp.set("offset", String(page.offset));
  }
  return sp;
}
