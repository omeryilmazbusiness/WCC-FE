import {
  CONTRACT_WARN_DAYS,
  SLOW_LATENCY_MS,
  type Availability,
  type AvailabilityWarning,
  type BlockReason,
  type EntryKind,
  type Finance,
  type HealthStatus,
  type PaymentTerms,
  type Product,
  type Supplier,
  type SupplierCategory,
} from "../model";

/** Pure rules mirrored from `internal/domain/supplier` for previews and the offline repository. */

export type Funds = { amount: number; limited: boolean };

/** Money still spendable: the deposit (prepaid) or the unused credit line; cards and limitless lines are unlimited. */
export function available(fi: Finance): Funds {
  switch (fi.paymentModel) {
    case "prepaid":
      return { amount: fi.depositBalance, limited: true };
    case "postpaid":
      return fi.creditLimit > 0 ? { amount: fi.creditLimit - fi.creditUsed, limited: true } : { amount: 0, limited: false };
    default:
      return { amount: 0, limited: false };
  }
}

export function isLowBalance(fi: Finance): boolean {
  const a = available(fi);
  return a.limited && fi.lowBalanceThreshold > 0 && a.amount < fi.lowBalanceThreshold;
}

export function isExhausted(fi: Finance): boolean {
  const a = available(fi);
  return a.limited && a.amount <= 0;
}

/** Share of the credit line in use, 0-100 (postpaid with a limit only). */
export function usedPct(fi: Finance): number {
  if (fi.paymentModel !== "postpaid" || fi.creditLimit <= 0) return 0;
  return Math.min(100, Math.max(0, Math.floor((fi.creditUsed * 100) / fi.creditLimit)));
}

/** How full the funding gauge is, 0-100: deposit vs 4× threshold, or unused credit share. */
export function fundingPct(fi: Finance): number {
  const a = available(fi);
  if (!a.limited) return 100;
  if (a.amount <= 0) return 0;
  if (fi.paymentModel === "postpaid") return 100 - usedPct(fi);
  if (fi.lowBalanceThreshold > 0) return Math.min(100, Math.round((a.amount * 100) / (4 * fi.lowBalanceThreshold)));
  return 100;
}

/** The running figure a ledger row records: deposit (prepaid), owed amount (postpaid), 0 for cards. */
export function balance(fi: Finance): number {
  if (fi.paymentModel === "prepaid") return fi.depositBalance;
  if (fi.paymentModel === "postpaid") return fi.creditUsed;
  return 0;
}

export type ApplyError = "amount" | "model" | "funds" | "limit" | "outstanding" | "negative";

export type ApplyResult = { ok: true; finance: Finance; balanceAfter: number } | { ok: false; error: ApplyError };

const MAX_MONEY = 1_000_000_000_000;

/** Books a movement on a copy of the account (mirrors `Finance.Apply`). */
export function applyEntry(fi: Finance, kind: EntryKind, amount: number): ApplyResult {
  if (!Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > MAX_MONEY) return { ok: false, error: "amount" };
  if (kind !== "adjustment" && amount <= 0) return { ok: false, error: "amount" };
  const next = { ...fi };
  switch (kind) {
    case "topup":
      if (fi.paymentModel !== "prepaid") return { ok: false, error: "model" };
      next.depositBalance += amount;
      break;
    case "charge":
      if (fi.paymentModel === "prepaid") {
        if (amount > fi.depositBalance) return { ok: false, error: "funds" };
        next.depositBalance -= amount;
      } else if (fi.paymentModel === "postpaid") {
        if (fi.creditLimit > 0 && fi.creditUsed + amount > fi.creditLimit) return { ok: false, error: "limit" };
        next.creditUsed += amount;
      }
      break;
    case "refund":
      if (fi.paymentModel === "prepaid") next.depositBalance += amount;
      else if (fi.paymentModel === "postpaid") {
        if (amount > fi.creditUsed) return { ok: false, error: "outstanding" };
        next.creditUsed -= amount;
      }
      break;
    case "payment":
      if (fi.paymentModel !== "postpaid") return { ok: false, error: "model" };
      if (amount > fi.creditUsed) return { ok: false, error: "outstanding" };
      next.creditUsed -= amount;
      break;
    case "adjustment":
      if (fi.paymentModel === "prepaid") {
        if (fi.depositBalance + amount < 0) return { ok: false, error: "negative" };
        next.depositBalance += amount;
      } else if (fi.paymentModel === "postpaid") {
        if (fi.creditUsed + amount < 0) return { ok: false, error: "negative" };
        next.creditUsed += amount;
      } else return { ok: false, error: "model" };
      break;
  }
  return { ok: true, finance: next, balanceAfter: balance(next) };
}

/** Entry kinds that make sense for a payment model. */
export function entryKindsFor(model: Finance["paymentModel"]): EntryKind[] {
  if (model === "prepaid") return ["topup", "charge", "refund", "adjustment"];
  if (model === "postpaid") return ["charge", "payment", "refund", "adjustment"];
  return ["charge", "refund"];
}

/** Whole calendar days from `from` to `to` (YYYY-MM-DD), timezone free. */
export function daysBetween(from: string, to: string): number {
  const ms = (d: string) => {
    const [y, m, dd] = d.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, dd);
  };
  return Math.round((ms(to) - ms(from)) / 86_400_000);
}

const TERM_DAYS: Record<PaymentTerms, number> = { on_booking: 0, net7: 7, net15: 15, net30: 30, weekly: 7 };

/** Due date (YYYY-MM-DD) implied by the supplier's payment terms; empty when the issue date is not a valid day. */
export function dueDateFor(issueDate: string, terms: PaymentTerms): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(issueDate);
  if (!m) return "";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + TERM_DAYS[terms]));
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function contractDaysLeft(contractEnd: string | null, today: string): number | null {
  return contractEnd ? daysBetween(today, contractEnd) : null;
}

type AvailabilityInput = Pick<Supplier, "isActive" | "health" | "finance" | "contractEnd">;

/** Critical-balance block and other guards (mirrors `AvailabilityOn`). */
export function availabilityOn(s: AvailabilityInput, today: string): Availability {
  const days = contractDaysLeft(s.contractEnd, today);
  let reason: BlockReason | "" = "";
  if (!s.isActive) reason = "inactive";
  else if (days !== null && days < 0) reason = "contract_expired";
  else if (s.health.status === "down") reason = "down";
  else if (s.finance.paymentModel === "prepaid" && isExhausted(s.finance)) reason = "deposit_exhausted";
  else if (s.finance.paymentModel === "postpaid" && isExhausted(s.finance)) reason = "credit_exhausted";
  const warnings: AvailabilityWarning[] = [];
  if (isLowBalance(s.finance) && !isExhausted(s.finance)) warnings.push("low_balance");
  if (days !== null && days >= 0 && days <= CONTRACT_WARN_DAYS) warnings.push("contract_expiring");
  if (s.health.status === "degraded") warnings.push("degraded");
  return { bookable: reason === "", reason, warnings };
}

/** Status of a probe result (mirrors `ClassifyProbe`); 4xx still means reachable. */
export function classifyProbe(latencyMs: number, statusCode: number, failed: boolean): HealthStatus {
  if (failed || statusCode === 0 || statusCode >= 500) return "down";
  if (latencyMs > SLOW_LATENCY_MS) return "degraded";
  return "active";
}

export function categoriesFor(product: Product): SupplierCategory[] {
  switch (product) {
    case "flight":
      return ["gds"];
    case "hotel":
      return ["wholesaler", "dmc"];
    case "transfer":
      return ["transfer", "dmc"];
    case "visa":
      return ["visa", "dmc"];
    case "insurance":
      return ["insurance"];
    case "package":
      return ["dmc", "wholesaler"];
  }
}

/** Routing score 0-100: health 40, funding 30, latency 20, contract runway 10 (mirrors `routeScore`). */
export function routeScore(s: Pick<Supplier, "health" | "finance" | "contractEnd" | "integration">, today: string): number {
  let score = { active: 40, unknown: 20, degraded: 10, down: 0 }[s.health.status];
  const a = available(s.finance);
  if (!a.limited) score += 30;
  else if (a.amount > 0 && s.finance.lowBalanceThreshold > 0) {
    score += Math.min(30, Math.floor((30 * a.amount) / (4 * s.finance.lowBalanceThreshold)));
  } else if (a.amount > 0) score += 20;
  const lat = s.health.latencyMs;
  if (lat > 0) {
    if (lat <= 400) score += 20;
    else if (lat <= 1000) score += 12;
    else if (lat <= SLOW_LATENCY_MS) score += 6;
  } else if (s.integration.type !== "api") score += 10;
  const days = contractDaysLeft(s.contractEnd, today);
  if (days === null || days > CONTRACT_WARN_DAYS) score += 10;
  else if (days >= 0) score += 4;
  return Math.min(score, 100);
}

export type Ranked<T> = { supplier: T; availability: Availability; score: number; markupBps: number };

/** Bookable first, then score, then code — the order searches are routed in. */
export function rankSuppliers<T extends Supplier>(suppliers: readonly T[], product: Product, today: string): Ranked<T>[] {
  const cats = categoriesFor(product);
  return suppliers
    .filter((s) => cats.includes(s.category))
    .map((s) => ({ supplier: s, availability: availabilityOn(s, today), score: routeScore(s, today), markupBps: s.markups[product] ?? 0 }))
    .sort((a, b) => {
      if (a.availability.bookable !== b.availability.bookable) return a.availability.bookable ? -1 : 1;
      if (a.score !== b.score) return b.score - a.score;
      return a.supplier.code.localeCompare(b.supplier.code);
    });
}

/** Look-to-book as the industry "searches : 1 booking" ratio, or null before the first booking. */
export function lookToBookRatio(searches: number, bookings: number): string | null {
  if (bookings <= 0 || searches <= 0) return null;
  return `${Math.max(1, Math.round(searches / bookings))}:1`;
}

export function bpsToPercent(bps: number): string {
  const whole = Math.trunc(bps / 100);
  const frac = Math.abs(bps % 100);
  return frac ? `${whole}.${String(frac).padStart(2, "0").replace(/0$/, "")}` : String(whole);
}

export function parsePercent(input: string): number | null {
  const m = /^(\d{1,3})(?:[.,](\d{0,2}))?$/.exec(input.trim());
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

/** A product's sell price from a net cost and markup in basis points, rounded half up in minor units. */
export function grossFromNet(net: number, bps: number): number {
  return net + Math.floor((net * bps + 5_000) / 10_000);
}
