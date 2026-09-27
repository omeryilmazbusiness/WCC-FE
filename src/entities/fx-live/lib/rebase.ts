import type { FxLiveKind, FxLiveQuote, FxLiveSide } from "../model";

/** `a ÷ b` as a decimal string, `null` when undefined (see `divideDecimal`). */
export type DecimalDivide = (a: string, b: string, scale?: number) => string | null;

const CROSS_SCALE = 10;
const KINDS: readonly FxLiveKind[] = ["market", "official"];

const positive = (value: string) => /[1-9]/.test(value);

function olderOf(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(a) <= Date.parse(b) ? a : b;
}

/**
 * `quote` in `base` units. A dealer cross widens the spread: buying X for base costs
 * X.buy ÷ base.sell, selling it yields X.sell ÷ base.buy.
 */
function crossSide(quote: FxLiveSide, base: FxLiveSide, divide: DecimalDivide): FxLiveSide | null {
  const mid = positive(quote.mid) && positive(base.mid) ? divide(quote.mid, base.mid, CROSS_SCALE) : null;
  if (!mid) return null;
  const leg = (a: string, b: string) =>
    positive(a) && positive(b) ? (divide(a, b, CROSS_SCALE) ?? "") : "";
  return {
    buy: leg(quote.buy, base.sell),
    sell: leg(quote.sell, base.buy),
    mid,
    observedAt: olderOf(quote.observedAt, base.observedAt),
    derived: quote.derived || base.derived,
    stale: quote.stale || base.stale,
  };
}

const ONE: FxLiveSide = { buy: "1", sell: "1", mid: "1", observedAt: "", derived: false, stale: false };

/**
 * Re-expresses a board quoted in `local` per unit as `base` per unit. The local currency
 * becomes a pinned row; the base currency's own row is dropped. Identity when base = local
 * or base has no quote.
 */
export function rebaseQuotes(
  quotes: readonly FxLiveQuote[],
  local: string,
  base: string,
  divide: DecimalDivide,
): FxLiveQuote[] {
  const baseQuote = quotes.find((q) => q.currency === base);
  if (base === local || !baseQuote) return [...quotes];

  const rebase = (sides: (kind: FxLiveKind) => FxLiveSide | null): Pick<FxLiveQuote, FxLiveKind> => {
    const out = { market: null, official: null } as Pick<FxLiveQuote, FxLiveKind>;
    for (const kind of KINDS) {
      const side = sides(kind);
      const baseSide = baseQuote[kind];
      out[kind] = side && baseSide ? crossSide(side, baseSide, divide) : null;
    }
    return out;
  };

  const localRow: FxLiveQuote = { currency: local, pinned: true, usdCross: null, ...rebase(() => ONE) };
  const rows = quotes
    .filter((q) => q.currency !== base)
    .map((q) => ({ ...q, usdCross: null, ...rebase((kind) => q[kind]) }));
  return [localRow, ...rows];
}

/** Local currency first, then every currency with a usable mid in any kind. */
export function baseCurrencyOptions(quotes: readonly FxLiveQuote[], local: string): string[] {
  const codes = quotes
    .filter((q) => KINDS.some((kind) => positive(q[kind]?.mid ?? "")))
    .map((q) => q.currency);
  return [local, ...codes.filter((c) => c !== local)];
}
