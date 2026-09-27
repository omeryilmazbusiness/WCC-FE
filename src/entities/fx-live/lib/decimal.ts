/**
 * Exact decimal-string arithmetic for live FX rates (BigInt fixed-point, never floats).
 * Rounding is half away from zero.
 */

type Fixed = { units: bigint; scale: number };

const DECIMAL = /^-?\d+(?:\.\d+)?$/;
const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const TEN = BigInt(10);

const pow10 = (n: number) => TEN ** BigInt(n);
const abs = (n: bigint) => (n < ZERO ? -n : n);

export function isDecimal(value: string): boolean {
  return DECIMAL.test(value.trim());
}

function parse(value: string): Fixed | null {
  const s = value.trim();
  if (!DECIMAL.test(s)) return null;
  const negative = s.startsWith("-");
  const [whole, fraction = ""] = (negative ? s.slice(1) : s).split(".");
  const units = BigInt(whole + fraction);
  return { units: negative ? -units : units, scale: fraction.length };
}

function divRound(n: bigint, d: bigint): bigint {
  const negative = n < ZERO !== d < ZERO;
  const an = abs(n);
  const ad = abs(d);
  let q = an / ad;
  if ((an % ad) * TWO >= ad) q += ONE;
  return negative ? -q : q;
}

function rescale(v: Fixed, scale: number): bigint {
  return scale >= v.scale
    ? v.units * pow10(scale - v.scale)
    : divRound(v.units, pow10(v.scale - scale));
}

function toFixedString(units: bigint, scale: number): string {
  const digits = abs(units).toString().padStart(scale + 1, "0");
  const whole = digits.slice(0, digits.length - scale);
  const out = scale ? `${whole}.${digits.slice(digits.length - scale)}` : whole;
  return units < ZERO ? `-${out}` : out;
}

function trimZeros(value: string): string {
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}

/**
 * User-typed amount → canonical decimal string: Arabic-Indic / Persian digits and the
 * Arabic decimal separator are accepted; grouping separators are dropped.
 */
export function normalizeDecimalInput(input: string): string {
  return input
    .trim()
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\u066b/g, ".")
    .replace(/[\u066c,\s]/g, "");
}

export function roundDecimal(value: string, scale = 2): string | null {
  const v = parse(value);
  return v ? toFixedString(rescale(v, scale), scale) : null;
}

/** `a × b` rounded to `scale` decimals. */
export function multiplyDecimal(a: string, b: string, scale = 2): string | null {
  const x = parse(a);
  const y = parse(b);
  if (!x || !y) return null;
  return toFixedString(rescale({ units: x.units * y.units, scale: x.scale + y.scale }, scale), scale);
}

/** `a ÷ b` rounded to `scale` decimals; `null` for invalid input or a zero divisor. */
export function divideDecimal(a: string, b: string, scale = 2): string | null {
  const x = parse(a);
  const y = parse(b);
  if (!x || !y || y.units === ZERO) return null;
  return toFixedString(divRound(x.units * pow10(y.scale + scale), y.units * pow10(x.scale)), scale);
}

/** Rounds to `digits` significant digits; trailing fractional zeros are dropped. */
export function roundSignificant(value: string, digits = 4): string | null {
  const v = parse(value);
  if (!v) return null;
  if (v.units === ZERO) return "0";
  const drop = abs(v.units).toString().length - digits;
  if (drop <= 0) return trimZeros(toFixedString(v.units, v.scale));
  const rounded = divRound(v.units, pow10(drop));
  const scale = v.scale - drop;
  return scale >= 0
    ? trimZeros(toFixedString(rounded, scale))
    : toFixedString(rounded * pow10(-scale), 0);
}

export function isPositiveDecimal(value: string): boolean {
  const v = parse(value);
  return Boolean(v && v.units > ZERO);
}

/** Exact localized digits for a decimal string (grouped whole part, fraction kept as-is). */
export function formatDecimalString(value: string, intlLocale: string): string {
  const v = parse(value);
  if (!v) return "—";
  const nf = new Intl.NumberFormat(intlLocale, { useGrouping: true });
  const separator = nf.formatToParts(1.5).find((p) => p.type === "decimal")?.value ?? ".";
  const [whole, fraction = ""] = toFixedString(abs(v.units), v.scale).split(".");
  const localizedFraction = fraction.replace(/\d/g, (d) => nf.format(Number(d)));
  const out = nf.format(BigInt(whole)) + (fraction ? separator + localizedFraction : "");
  return v.units < ZERO ? `-${out}` : out;
}

/** Rate: ≥ 1 → `decimals` places (2 for SYP per unit, 4 for crosses); < 1 → 4 significant digits. */
export function formatRate(value: string, intlLocale: string, decimals = 2): string {
  const v = parse(value);
  if (!v) return "—";
  const small = abs(v.units) < pow10(v.scale);
  const significant = small ? roundSignificant(value, 4) : null;
  const rounded =
    significant && significant.includes(".") ? significant : roundDecimal(value, decimals);
  return rounded ? formatDecimalString(rounded, intlLocale) : "—";
}
