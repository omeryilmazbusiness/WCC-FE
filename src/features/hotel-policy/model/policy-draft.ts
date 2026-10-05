import type { CancellationPolicy, ChildMode, ChildPolicy, ChildRule, PenaltyTier } from "@/entities/hotel";
import { minorToInput, parseMoneyInput } from "@/shared/lib/money";

export type RuleDraft = { mode: ChildMode; value: string };
export type ChildRuleKey = "infant" | "child1" | "child2WithBed" | "child2NoBed";
export const CHILD_RULES: readonly ChildRuleKey[] = ["infant", "child1", "child2WithBed", "child2NoBed"];

/** Infants are free or a fixed fee; the other bands may also be a share of the adult rate. */
export const RULE_MODES: Record<ChildRuleKey, readonly ChildMode[]> = {
  infant: ["free", "fixed"],
  child1: ["free", "percent", "fixed"],
  child2WithBed: ["free", "percent", "fixed"],
  child2NoBed: ["free", "percent", "fixed"],
};

export type ChildDraft = {
  infantMaxAge: number;
  child1MaxAge: number;
  child2MaxAge: number;
  rules: Record<ChildRuleKey, RuleDraft>;
  extraBedAdult: string;
};

const ruleDraft = (r: ChildRule): RuleDraft => ({
  mode: r.mode,
  value: r.mode === "fixed" ? minorToInput(r.value) : r.mode === "percent" ? String(r.value) : "",
});

export function childDraft(p: ChildPolicy): ChildDraft {
  return {
    infantMaxAge: p.infantMaxAge,
    child1MaxAge: p.child1MaxAge,
    child2MaxAge: p.child2MaxAge,
    rules: Object.fromEntries(CHILD_RULES.map((k) => [k, ruleDraft(p[k])])) as Record<ChildRuleKey, RuleDraft>,
    extraBedAdult: p.extraBedAdult ? minorToInput(p.extraBedAdult) : "",
  };
}

export function parseRule(r: RuleDraft): ChildRule | null {
  if (r.mode === "free") return { mode: "free", value: 0 };
  if (r.mode === "percent") {
    if (!/^\d{1,3}$/.test(r.value.trim())) return null;
    const v = Number(r.value.trim());
    return v <= 100 ? { mode: "percent", value: v } : null;
  }
  const v = parseMoneyInput(r.value || "0");
  return v == null ? null : { mode: "fixed", value: v };
}

export type ChildDraftError = "ages" | ChildRuleKey | "extraBed";

export function childDraftError(d: ChildDraft): ChildDraftError | null {
  if (!(d.infantMaxAge >= 1 && d.infantMaxAge < d.child1MaxAge && d.child1MaxAge < d.child2MaxAge && d.child2MaxAge <= 18)) return "ages";
  for (const k of CHILD_RULES) if (!parseRule(d.rules[k])) return k;
  if (d.extraBedAdult.trim() && parseMoneyInput(d.extraBedAdult) == null) return "extraBed";
  return null;
}

export function childPolicyOf(d: ChildDraft): ChildPolicy {
  const rule = (k: ChildRuleKey) => parseRule(d.rules[k]) ?? { mode: "free" as const, value: 0 };
  return {
    infantMaxAge: d.infantMaxAge,
    child1MaxAge: d.child1MaxAge,
    child2MaxAge: d.child2MaxAge,
    infant: rule("infant"),
    child1: rule("child1"),
    child2WithBed: rule("child2WithBed"),
    child2NoBed: rule("child2NoBed"),
    extraBedAdult: parseMoneyInput(d.extraBedAdult || "0") ?? 0,
  };
}

export type CancellationDraftError = "freeDays" | "tierDays" | "tierDuplicate" | "tierValue" | "noShow";

const TIER_LIMIT: Record<PenaltyTier["kind"], [number, number]> = { nights: [1, 60], percent: [1, 100] };

export function cancellationError(p: CancellationPolicy): CancellationDraftError | null {
  if (p.freeDays < 0 || p.freeDays > 365) return "freeDays";
  if (p.noShowPct < 0 || p.noShowPct > 100) return "noShow";
  const seen = new Set<number>();
  for (const t of p.tiers) {
    if (t.minDays < 0 || t.minDays >= p.freeDays) return "tierDays";
    if (seen.has(t.minDays)) return "tierDuplicate";
    seen.add(t.minDays);
    const [lo, hi] = TIER_LIMIT[t.kind];
    if (t.value < lo || t.value > hi) return "tierValue";
  }
  return null;
}

/** A new tier on the latest free day slot inside the penalty window; null when every day is taken. */
export function nextTier(p: CancellationPolicy): PenaltyTier | null {
  const used = new Set(p.tiers.map((t) => t.minDays));
  for (let d = p.freeDays - 1; d >= 0; d -= 1) {
    if (!used.has(d)) return { minDays: d, kind: "percent", value: 50 };
  }
  return null;
}
