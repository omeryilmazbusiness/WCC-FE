export type FxLiveKind = "market" | "official";

export const FX_LIVE_KINDS: readonly FxLiveKind[] = ["market", "official"];

export type FxLiveSide = {
  /** Decimal strings, local currency per 1 unit; `""` when the backend omitted the value. */
  buy: string;
  sell: string;
  mid: string;
  observedAt: string;
  /** Calculated via the USD cross rather than quoted directly. */
  derived: boolean;
  stale: boolean;
};

export type FxLiveQuote = {
  currency: string;
  pinned: boolean;
  official: FxLiveSide | null;
  market: FxLiveSide | null;
  /** Units of this currency per 1 USD (EUR ≈ 0.8775, SAR = 3.75). */
  usdCross: string | null;
};

export type FxLiveSource = {
  id: string;
  name: string;
  url: string;
  attribution: string;
  kinds: string[];
  ok: boolean;
  fetchedAt: string;
  error: string;
};

export type FxLiveBoard = {
  localCurrency: string;
  updatedAt: string | null;
  stale: boolean;
  quotes: FxLiveQuote[];
  sources: FxLiveSource[];
  disclaimer: string;
};

export const FX_LIVE_PINNED = ["USD", "EUR", "SAR"] as const;
export const FX_LIVE_HEADLINE_CURRENCY = "USD";
export const FX_LIVE_POLL_MS = 5 * 60_000;
export const FX_LIVE_OPEN_MAX_AGE_MS = 60_000;
export const LIVE_QUOTE_UNAVAILABLE_CODE = "live_quote_unavailable";

/** ExchangeRate-API licence: this attribution link must always be visible next to the rates. */
export const EXCHANGE_RATE_API_SOURCE: FxLiveSource = {
  id: "exchangerate-api",
  name: "ExchangeRate-API",
  url: "https://www.exchangerate-api.com",
  attribution: "Rates By Exchange Rate API",
  kinds: ["reference"],
  ok: true,
  fetchedAt: "",
  error: "",
};

type Raw = Record<string, unknown>;

const RATE = /^\d+(?:\.\d+)?$/;

const asRecord = (value: unknown): Raw | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : null;
const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const rate = (value: unknown) => {
  const s = typeof value === "number" && Number.isFinite(value) ? String(value) : str(value);
  return RATE.test(s) ? s : "";
};

function mapSide(value: unknown): FxLiveSide | null {
  const raw = asRecord(value);
  if (!raw) return null;
  const side: FxLiveSide = {
    buy: rate(raw.buy),
    sell: rate(raw.sell),
    mid: rate(raw.mid),
    observedAt: str(raw.observed_at ?? raw.observedAt),
    derived: raw.derived === true,
    stale: raw.stale === true,
  };
  return side.buy || side.sell || side.mid ? side : null;
}

function mapQuote(value: unknown): FxLiveQuote | null {
  const raw = asRecord(value);
  const currency = str(raw?.currency).toUpperCase();
  if (!raw || !/^[A-Z]{3}$/.test(currency)) return null;
  return {
    currency,
    pinned:
      typeof raw.pinned === "boolean"
        ? raw.pinned
        : (FX_LIVE_PINNED as readonly string[]).includes(currency),
    official: mapSide(raw.official),
    market: mapSide(raw.market),
    usdCross: rate(raw.usd_cross ?? raw.usdCross) || null,
  };
}

function mapSource(value: unknown): FxLiveSource | null {
  const raw = asRecord(value);
  if (!raw) return null;
  const id = str(raw.id);
  const name = str(raw.name) || id;
  if (!name) return null;
  return {
    id,
    name,
    url: safeUrl(str(raw.url)),
    attribution: str(raw.attribution),
    kinds: Array.isArray(raw.kinds) ? raw.kinds.filter((k): k is string => typeof k === "string") : [],
    ok: raw.ok !== false,
    fetchedAt: str(raw.fetched_at ?? raw.fetchedAt),
    error: str(raw.error),
  };
}

/** `GET /v1/fx/live` data → board; tolerates nulls, missing fields and malformed rows. */
export function mapLiveBoard(value: unknown): FxLiveBoard {
  const raw = asRecord(value) ?? {};
  const list = (v: unknown) => (Array.isArray(v) ? v : []);
  return {
    localCurrency: str(raw.local_currency ?? raw.localCurrency).toUpperCase() || "SYP",
    updatedAt: str(raw.updated_at ?? raw.updatedAt) || null,
    stale: raw.stale === true,
    quotes: list(raw.quotes).map(mapQuote).filter((q): q is FxLiveQuote => q !== null),
    sources: list(raw.sources).map(mapSource).filter((s): s is FxLiveSource => s !== null),
    disclaimer: str(raw.disclaimer),
  };
}

/** Only absolute http(s) links are rendered. */
export function safeUrl(url: string): string {
  return /^https?:\/\/[^\s]+$/i.test(url) ? url : "";
}

/** Pinned first (`lead`, then USD, EUR, SAR, then other pinned), otherwise backend order. */
export function orderQuotes(
  quotes: readonly FxLiveQuote[],
  lead?: string,
): {
  pinned: FxLiveQuote[];
  others: FxLiveQuote[];
} {
  const rank = (code: string) => {
    if (code === lead) return -1;
    const i = (FX_LIVE_PINNED as readonly string[]).indexOf(code);
    return i === -1 ? FX_LIVE_PINNED.length : i;
  };
  const pinned = quotes
    .map((quote, index) => ({ quote, index }))
    .filter(({ quote }) => quote.pinned)
    .sort((a, b) => rank(a.quote.currency) - rank(b.quote.currency) || a.index - b.index)
    .map(({ quote }) => quote);
  return { pinned, others: quotes.filter((q) => !q.pinned) };
}

export type QuoteBadges = {
  missing: boolean;
  derived: boolean;
  stale: boolean;
  observedAt: string;
};

export function quoteBadges(quote: FxLiveQuote, kind: FxLiveKind): QuoteBadges {
  const side = quote[kind];
  if (!side) return { missing: true, derived: false, stale: false, observedAt: "" };
  return { missing: false, derived: side.derived, stale: side.stale, observedAt: side.observedAt };
}

/** Mid rate usable for conversion / adoption, or `null`. */
export function usableMid(quote: FxLiveQuote | undefined, kind: FxLiveKind): string | null {
  const mid = quote?.[kind]?.mid ?? "";
  return mid && /[1-9]/.test(mid) ? mid : null;
}

export type BoardHealth = {
  /** Show the "live source unavailable" banner. */
  degraded: boolean;
  failedSources: FxLiveSource[];
};

export function boardHealth(board: FxLiveBoard): BoardHealth {
  const failedSources = board.sources.filter((s) => !s.ok);
  return { degraded: board.stale || failedSources.length > 0, failedSources };
}

export type Headline = { mid: string | null; stale: boolean };

/** Header number: USD market mid; stale when the board is degraded or the quote itself is. */
export function headline(board: FxLiveBoard | null): Headline {
  if (!board) return { mid: null, stale: false };
  const quote = board.quotes.find((q) => q.currency === FX_LIVE_HEADLINE_CURRENCY);
  return {
    mid: usableMid(quote, "market"),
    stale: boardHealth(board).degraded || Boolean(quote?.market?.stale),
  };
}

/** Footer sources, always including the ExchangeRate-API attribution. */
export function footerSources(sources: readonly FxLiveSource[]): FxLiveSource[] {
  const era = EXCHANGE_RATE_API_SOURCE;
  const out = sources.map((s) =>
    s.id === era.id
      ? { ...s, attribution: s.attribution || era.attribution, url: s.url || era.url }
      : s,
  );
  return out.some((s) => s.id === era.id) ? out : [...out, era];
}

export function isOlderThan(fetchedAt: number, maxAgeMs: number, now = Date.now()): boolean {
  return !fetchedAt || now - fetchedAt >= maxAgeMs;
}
