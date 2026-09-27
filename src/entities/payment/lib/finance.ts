import type { FinancialSummary } from "../model";

export type DualAmountState = "single" | "dual" | "missing";

/**
 * Original only, original + reporting amount, or "FX rate missing". The backend
 * sends no reporting block at all when the rate was missing, so `fxMissing` wins.
 */
export function dualAmountState(input: {
  currency: string;
  amountReporting: number | null;
  reportingCurrency: string;
  fxMissing?: boolean;
}): DualAmountState {
  if (input.fxMissing) return "missing";
  const differs = Boolean(input.reportingCurrency) && input.reportingCurrency !== input.currency;
  if (!differs) return "single";
  return input.amountReporting === null ? "missing" : "dual";
}

export type BreakdownKey =
  | "subtotal"
  | "discount"
  | "tax"
  | "fees"
  | "total"
  | "cost"
  | "margin"
  | "collected"
  | "pending"
  | "balance";

export type BreakdownRow = {
  key: BreakdownKey;
  /** Signed minor units as displayed (discount is negative). */
  amount: number;
  emphasis?: boolean;
};

export type FinanceBreakdown = {
  pricing: BreakdownRow[];
  profitability: BreakdownRow[];
  collection: BreakdownRow[];
  /** `subtotal − discount + tax + fees − total`; non-zero means the server totals don't reconcile. */
  mismatch: number;
};

export function financeBreakdown(s: FinancialSummary): FinanceBreakdown {
  const profitability: BreakdownRow[] = [];
  if (s.cost !== null) profitability.push({ key: "cost", amount: s.cost });
  if (s.margin !== null) profitability.push({ key: "margin", amount: s.margin });
  return {
    pricing: [
      { key: "subtotal", amount: s.subtotal },
      { key: "discount", amount: -Math.abs(s.discount) },
      { key: "tax", amount: s.tax },
      { key: "fees", amount: s.fees },
      { key: "total", amount: s.total, emphasis: true },
    ],
    profitability,
    collection: [
      { key: "collected", amount: s.collected },
      { key: "pending", amount: s.pending },
      { key: "balance", amount: s.balance, emphasis: true },
    ],
    mismatch: s.subtotal - Math.abs(s.discount) + s.tax + s.fees - s.total,
  };
}

/** `YYYY-MM-DD` received date: optional, but never in the future. */
export function isReceivedAtValid(day: string, today: string): boolean {
  return !day || (/^\d{4}-\d{2}-\d{2}$/.test(day) && day <= today);
}
