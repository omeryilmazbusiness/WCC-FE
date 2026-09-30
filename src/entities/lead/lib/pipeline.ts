import type { Lead } from "../model";

export type PipelineValue = {
  /** Sum of budgets in `currency`, minor units. */
  amount: number;
  currency: string;
  /** Leads whose budget is in `currency`. */
  count: number;
  /** Budgets in other currencies were left out. */
  partial: boolean;
};

/**
 * Budget total of a set of leads in the currency holding the most money;
 * null when none has a budget. Budgets are never summed across currencies.
 */
export function pipelineValue(leads: readonly Pick<Lead, "interest">[]): PipelineValue | null {
  const sums = new Map<string, { amount: number; count: number }>();
  for (const { interest } of leads) {
    const amount = interest.budgetAmount;
    const currency = interest.budgetCurrency;
    if (amount == null || amount <= 0 || !currency) continue;
    const cur = sums.get(currency) ?? { amount: 0, count: 0 };
    cur.amount += amount;
    cur.count += 1;
    sums.set(currency, cur);
  }
  let best: PipelineValue | null = null;
  for (const [currency, { amount, count }] of sums) {
    if (!best || amount > best.amount) best = { amount, currency, count, partial: false };
  }
  if (best && sums.size > 1) best.partial = true;
  return best;
}
