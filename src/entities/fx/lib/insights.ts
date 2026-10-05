import type { FxRate } from "../model";

const ZERO = BigInt(0);
const TWO = BigInt(2);
const TEN = BigInt(10);
const BPS = BigInt(10_000);
const SCALE_DIGITS = 8;
const SCALE = pow10(SCALE_DIGITS);

function pow10(digits: number): bigint {
  let out = BigInt(1);
  for (let i = 0; i < digits; i++) out *= TEN;
  return out;
}

const DECIMAL = /^(\d+)(?:\.(\d+))?$/;

/** Points kept per pair for the trend line. */
export const FX_TREND_POINTS = 12;
/** A pair whose latest rate is older than this many days needs attention. */
export const FX_STALE_AFTER_DAYS = 3;

export type FxFreshness = "today" | "recent" | "stale";

export type FxPairSnapshot = {
  pair: string;
  base: string;
  quote: string;
  latest: FxRate;
  previous: FxRate | null;
  /** Change from `previous` in basis points (1/100 of a percent); `null` without a previous rate. */
  changeBps: number | null;
  /** Oldest → newest, at most `FX_TREND_POINTS`. */
  trend: FxRate[];
};

export type FxDayGroup = { day: string; items: FxRate[] };

export function pairOf(rate: Pick<FxRate, "base" | "quote">): string {
  return `${rate.base}/${rate.quote}`;
}

function toScaled(value: string): bigint | null {
  const match = DECIMAL.exec(value.trim());
  if (!match) return null;
  const fraction = (match[2] ?? "").slice(0, SCALE_DIGITS).padEnd(SCALE_DIGITS, "0");
  return BigInt(match[1]) * SCALE + BigInt(fraction);
}

/** Exact change between two decimal rates in basis points, rounded half away from zero. */
export function rateChangeBps(previous: string, next: string): number | null {
  const p = toScaled(previous);
  const n = toScaled(next);
  if (p === null || n === null || p === ZERO) return null;
  const diff = (n - p) * BPS;
  const magnitude = ((diff < ZERO ? -diff : diff) * TWO + p) / (TWO * p);
  return Number(diff < ZERO ? -magnitude : magnitude);
}

/** `1 / rate` as a decimal string with `decimals` places, rounded half up; `null` for zero or junk. */
export function invertRate(rate: string, decimals = 6): string | null {
  const r = toScaled(rate);
  if (r === null || r === ZERO) return null;
  const digits = Math.min(Math.max(decimals, 0), SCALE_DIGITS);
  const unit = pow10(digits);
  const scaled = (unit * SCALE * TWO + r) / (TWO * r);
  if (digits === 0) return scaled.toString();
  return `${scaled / unit}.${(scaled % unit).toString().padStart(digits, "0")}`;
}

/**
 * Latest rate per pair with its predecessor and a short trend. Input order does not matter;
 * pairs come back newest first, then alphabetically.
 */
export function pairSnapshots(rates: readonly FxRate[]): FxPairSnapshot[] {
  const byPair = new Map<string, FxRate[]>();
  for (const rate of rates) {
    const key = pairOf(rate);
    const list = byPair.get(key);
    if (list) list.push(rate);
    else byPair.set(key, [rate]);
  }
  const snapshots: FxPairSnapshot[] = [];
  for (const [pair, list] of byPair) {
    const desc = [...list].sort(newestFirst);
    const latest = desc[0];
    const previous = desc[1] ?? null;
    snapshots.push({
      pair,
      base: latest.base,
      quote: latest.quote,
      latest,
      previous,
      changeBps: previous ? rateChangeBps(previous.rate, latest.rate) : null,
      trend: desc.slice(0, FX_TREND_POINTS).reverse(),
    });
  }
  return snapshots.sort(
    (a, b) => b.latest.effectiveDate.localeCompare(a.latest.effectiveDate) || a.pair.localeCompare(b.pair),
  );
}

/** Consecutive rows sharing an effective date; keeps the server's order. */
export function groupByDay(rates: readonly FxRate[]): FxDayGroup[] {
  const groups: FxDayGroup[] = [];
  for (const rate of rates) {
    const last = groups[groups.length - 1];
    if (last && last.day === rate.effectiveDate) last.items.push(rate);
    else groups.push({ day: rate.effectiveDate, items: [rate] });
  }
  return groups;
}

/** Whole calendar days from `day` to `today` (both `YYYY-MM-DD`); negative for future dates. */
export function daysBetween(day: string, today: string): number {
  const a = Date.parse(`${day}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY;
  return Math.round((b - a) / 86_400_000);
}

export function freshness(day: string, today: string): FxFreshness {
  const age = daysBetween(day, today);
  if (age <= 0) return "today";
  return age <= FX_STALE_AFTER_DAYS ? "recent" : "stale";
}

/** Today's date in the viewer's time zone, as `YYYY-MM-DD`. */
export function localToday(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Display-only magnitude for trend lines; exact math stays on decimal strings. */
export function trendValues(trend: readonly FxRate[]): number[] {
  return trend.map((r) => Number(r.rate)).filter(Number.isFinite);
}

function newestFirst(a: FxRate, b: FxRate): number {
  return b.effectiveDate.localeCompare(a.effectiveDate) || b.createdAt.localeCompare(a.createdAt);
}
