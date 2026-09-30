import type { Lead, LeadStage } from "../model";

export type PipelineValue = {
  /** Sum of budgets in `currency`, minor units. */
  amount: number;
  currency: string;
  /** Leads whose budget is in `currency`. */
  count: number;
  /** Budgets in other currencies were left out. */
  partial: boolean;
};

/** Budget total in one currency, minor units — the backend's per-lane `budgets`. */
export type BudgetSum = { currency: string; amount: number; count: number };

/** Per-currency budget totals of a set of leads; empty and zero budgets are skipped. */
export function budgetSums(leads: readonly Pick<Lead, "interest">[]): BudgetSum[] {
  const sums = new Map<string, BudgetSum>();
  for (const { interest } of leads) {
    const amount = interest.budgetAmount;
    const currency = interest.budgetCurrency;
    if (amount == null || amount <= 0 || !currency) continue;
    const cur = sums.get(currency) ?? { currency, amount: 0, count: 0 };
    cur.amount += amount;
    cur.count += 1;
    sums.set(currency, cur);
  }
  return [...sums.values()];
}

/**
 * The currency holding the most money; null when nothing is budgeted.
 * Budgets are never summed across currencies.
 */
export function valueFromBudgets(sums: readonly BudgetSum[]): PipelineValue | null {
  const live = sums.filter((s) => s.amount > 0 && s.count > 0 && s.currency);
  let best: PipelineValue | null = null;
  for (const { amount, currency, count } of live) {
    if (!best || amount > best.amount) best = { amount, currency, count, partial: false };
  }
  if (best && live.length > 1) best.partial = true;
  return best;
}

/** Budget total of a set of leads in the currency holding the most money. */
export function pipelineValue(leads: readonly Pick<Lead, "interest">[]): PipelineValue | null {
  return valueFromBudgets(budgetSums(leads));
}

/** Adds (sign 1) or removes (sign -1) budget totals, dropping emptied currencies. */
export function combineBudgets(
  base: readonly BudgetSum[],
  delta: readonly BudgetSum[],
  sign: 1 | -1 = 1,
): BudgetSum[] {
  const map = new Map(base.map((b) => [b.currency, { ...b }]));
  for (const d of delta) {
    const cur = map.get(d.currency) ?? { currency: d.currency, amount: 0, count: 0 };
    cur.amount += sign * d.amount;
    cur.count += sign * d.count;
    map.set(d.currency, cur);
  }
  return [...map.values()]
    .filter((b) => b.count > 0 && b.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

/** One kanban lane as the board endpoint returns it: filtered totals plus the loaded cards. */
export type BoardColumn = {
  stage: LeadStage;
  total: number;
  noFollowUp: number;
  budgets: BudgetSum[];
  items: Lead[];
};

function leaveColumn(col: BoardColumn, lead: Lead): BoardColumn {
  return {
    ...col,
    items: col.items.filter((l) => l.id !== lead.id),
    total: Math.max(0, col.total - 1),
    noFollowUp: Math.max(0, col.noFollowUp - (lead.noFollowUp ? 1 : 0)),
    budgets: combineBudgets(col.budgets, budgetSums([lead]), -1),
  };
}

function enterColumn(col: BoardColumn, lead: Lead): BoardColumn {
  return {
    ...col,
    items: [lead, ...col.items.filter((l) => l.id !== lead.id)],
    total: col.total + 1,
    noFollowUp: col.noFollowUp + (lead.noFollowUp ? 1 : 0),
    budgets: combineBudgets(col.budgets, budgetSums([lead])),
  };
}

/**
 * Applies a created or changed lead to the lanes: replaced in place when its
 * stage is unchanged, otherwise moved to the top of its new lane. Totals and
 * budgets follow so the board stays right until the next server summary.
 */
export function upsertBoardLead(cols: readonly BoardColumn[], lead: Lead): BoardColumn[] {
  const prev = cols.flatMap((c) => c.items).find((l) => l.id === lead.id);
  return cols.map((col) => {
    if (prev && prev.stage === lead.stage && col.stage === lead.stage) {
      const swapped = leaveColumn(col, prev);
      const next = enterColumn(swapped, lead);
      const at = col.items.findIndex((l) => l.id === lead.id);
      const items = [...col.items];
      items[at] = lead;
      return { ...next, items };
    }
    if (prev && col.stage === prev.stage) return leaveColumn(col, prev);
    if (col.stage === lead.stage) return enterColumn(col, lead);
    return col;
  });
}

/** Drops leads from the lanes, adjusting totals for the ones that were loaded. */
export function removeBoardLeads(cols: readonly BoardColumn[], ids: ReadonlySet<string>): BoardColumn[] {
  return cols.map((col) =>
    col.items.filter((l) => ids.has(l.id)).reduce(leaveColumn, col),
  );
}

/** Appends a fetched page to a lane, skipping cards already shown (offset pages can shift). */
export function appendBoardPage(
  cols: readonly BoardColumn[],
  stage: LeadStage,
  page: readonly Lead[],
): BoardColumn[] {
  return cols.map((col) => {
    if (col.stage !== stage) return col;
    const seen = new Set(col.items.map((l) => l.id));
    return { ...col, items: [...col.items, ...page.filter((l) => !seen.has(l.id))] };
  });
}

/** Takes totals and budgets from a fresh server summary, keeping the loaded cards. */
export function mergeBoardSummary(
  cols: readonly BoardColumn[],
  summary: readonly BoardColumn[],
): BoardColumn[] {
  return cols.map((col) => {
    const s = summary.find((x) => x.stage === col.stage);
    return s ? { ...col, total: s.total, noFollowUp: s.noFollowUp, budgets: s.budgets } : col;
  });
}
