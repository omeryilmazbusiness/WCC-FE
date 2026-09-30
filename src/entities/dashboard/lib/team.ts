import type { TeamMemberStat } from "../model";

/** Metrics a manager can rank the team by, in tile order. */
export const TEAM_METRICS = ["leads", "won", "collected", "openTasks", "overdue"] as const;
export type TeamMetric = (typeof TEAM_METRICS)[number];

export const DEFAULT_TEAM_METRIC: TeamMetric = "leads";

export function metricValue(m: TeamMemberStat, metric: TeamMetric): number {
  switch (metric) {
    case "leads":
      return m.leadsHandled;
    case "won":
      return m.leadsWon;
    case "collected":
      return m.collected;
    case "openTasks":
      return m.openTasks;
    case "overdue":
      return m.overdueTasks;
  }
}

/**
 * Highest first on the chosen metric; ties fall back to leads, wins, then name
 * so the order is stable across refreshes.
 */
export function rankTeam(members: readonly TeamMemberStat[], metric: TeamMetric): TeamMemberStat[] {
  return [...members].sort(
    (a, b) =>
      metricValue(b, metric) - metricValue(a, metric) ||
      b.leadsHandled - a.leadsHandled ||
      b.leadsWon - a.leadsWon ||
      a.name.localeCompare(b.name),
  );
}

/**
 * Won share of handled leads, 0–100, or null without leads. Wins are counted
 * when a lead closes and leads when they arrive, so the ratio is capped.
 */
export function winRate(m: TeamMemberStat): number | null {
  if (m.leadsHandled <= 0) return null;
  return Math.min(100, Math.round((m.leadsWon * 100) / m.leadsHandled));
}

export type TeamTotals = {
  leads: number;
  won: number;
  openTasks: number;
  overdue: number;
  collected: number;
  /** Currency of `collected`; "" when nobody collected anything. */
  currency: string;
  /** Some money is missing from `collected` (no FX rate, or members in other currencies). */
  partial: boolean;
};

export function teamTotals(members: readonly TeamMemberStat[]): TeamTotals {
  const byCurrency = new Map<string, number>();
  let partial = false;
  const totals = { leads: 0, won: 0, openTasks: 0, overdue: 0 };
  for (const m of members) {
    totals.leads += m.leadsHandled;
    totals.won += m.leadsWon;
    totals.openTasks += m.openTasks;
    totals.overdue += m.overdueTasks;
    if (m.unconverted.length > 0) partial = true;
    if (m.collected > 0 && m.currency) byCurrency.set(m.currency, (byCurrency.get(m.currency) ?? 0) + m.collected);
  }
  let currency = members.find((m) => m.currency)?.currency ?? "";
  let collected = 0;
  for (const [cur, amount] of byCurrency) {
    if (amount > collected) [currency, collected] = [cur, amount];
  }
  if (byCurrency.size > 1) partial = true;
  return { ...totals, collected, currency, partial };
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "";
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Stable index in [0, buckets) for a member id; keeps each person's avatar color fixed. */
export function colorIndex(id: string, buckets: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return buckets > 0 ? h % buckets : 0;
}
