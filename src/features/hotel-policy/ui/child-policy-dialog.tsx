"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Baby, BedSingle, Coins, Gift, Percent, Smile, UserRound, type LucideIcon } from "lucide-react";
import { childRuleCharge, hotelToInput, type ChildMode, type Hotel, type HotelRepository } from "@/entities/hotel";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/format";
import { ActionDialog, Button, FormSection, Input, MoneyInput, SegmentedControl, Stepper, TONES, type Tone, useMutationFeedback } from "@/shared/ui";
import {
  CHILD_RULES,
  RULE_MODES,
  childDraft,
  childDraftError,
  childPolicyOf,
  parseRule,
  type ChildDraft,
  type ChildRuleKey,
} from "../model/policy-draft";

type Props = {
  repository: HotelRepository;
  hotel: Hotel;
  /** Adult per-person net used for the live example (e.g. today's double rate). */
  adultReference: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (hotel: Hotel) => void;
};

const RULE_LOOK: Record<ChildRuleKey, { icon: LucideIcon; tone: Tone }> = {
  infant: { icon: Baby, tone: "rose" },
  child1: { icon: Smile, tone: "amber" },
  child2WithBed: { icon: BedSingle, tone: "sky" },
  child2NoBed: { icon: UserRound, tone: "violet" },
};

const MODE_ICON: Record<ChildMode, LucideIcon> = { free: Gift, percent: Percent, fixed: Coins };

export function ChildPolicyDialog({ repository, hotel, adultReference, open, onOpenChange, onSaved }: Props) {
  const t = useTranslations("hotels");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const [draft, setDraft] = useState<ChildDraft>(() => childDraft(hotel.childPolicy));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDraft(childDraft(hotel.childPolicy));
  }, [open, hotel]);

  const error = childDraftError(draft);
  const setRule = (k: ChildRuleKey, patch: Partial<ChildDraft["rules"][ChildRuleKey]>) =>
    setDraft((d) => ({ ...d, rules: { ...d.rules, [k]: { ...d.rules[k], ...patch } } }));
  const upTo = (n: number) => `${n - 1}.99`;
  const range = (k: ChildRuleKey) =>
    k === "infant"
      ? `0 – ${upTo(draft.infantMaxAge)}`
      : k === "child1"
        ? `${draft.infantMaxAge} – ${upTo(draft.child1MaxAge)}`
        : `${draft.child1MaxAge} – ${upTo(draft.child2MaxAge)}`;

  async function submit() {
    if (error) return;
    setSaving(true);
    try {
      const saved = await repository.update(hotel.id, { ...hotelToInput(hotel), childPolicy: childPolicyOf(draft) });
      feedback.success(t("policy.child.saved"));
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      feedback.error(e, t("policy.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Baby}
      tone="rose"
      size="lg"
      title={t("policy.child.title")}
      description={t("policy.child.subtitle")}
      testId="child-policy-dialog"
      footer={
        <>
          {error ? (
            <p className="me-auto self-center text-[12.5px] font-semibold text-rose-600" role="alert">
              {t(`policy.child.errors.${error}`)}
            </p>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={saving || Boolean(error)} onClick={() => void submit()} data-testid="child-policy-submit">
            {saving ? t("saving") : tc("save")}
          </Button>
        </>
      }
    >
      <div className="space-y-4 pb-2">
        <FormSection icon={Smile} tone="amber" title={t("policy.child.ages")} hint={t("policy.child.agesHint")}>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["infantMaxAge", 1, draft.child1MaxAge - 1],
                ["child1MaxAge", draft.infantMaxAge + 1, draft.child2MaxAge - 1],
                ["child2MaxAge", draft.child1MaxAge + 1, 18],
              ] as const
            ).map(([key, min, max]) => (
              <div key={key}>
                <p className="mb-1.5 text-[12.5px] font-semibold text-zinc-600">{t(`policy.child.${key}`)}</p>
                <Stepper
                  value={draft[key]}
                  min={min}
                  max={max}
                  onChange={(v) => setDraft((d) => ({ ...d, [key]: v }))}
                  suffix={t("policy.child.years")}
                  label={t(`policy.child.${key}`)}
                  testId={`child-${key}`}
                />
              </div>
            ))}
          </div>
        </FormSection>

        {CHILD_RULES.map((k) => {
          const rule = draft.rules[k];
          const look = RULE_LOOK[k];
          const parsed = parseRule(rule);
          const example = parsed && adultReference > 0 ? childRuleCharge(parsed, adultReference) : null;
          return (
            <FormSection key={k} icon={look.icon} tone={look.tone} title={t(`policy.child.rule.${k}`)} hint={t("policy.child.ageRange", { range: range(k) })}>
              <div className="flex flex-wrap items-center gap-3">
                <SegmentedControl<ChildMode>
                  aria-label={t(`policy.child.rule.${k}`)}
                  value={rule.mode}
                  onChange={(mode) => setRule(k, { mode, value: mode === "percent" ? "50" : "" })}
                  options={RULE_MODES[k].map((m) => ({ value: m, label: t(`policy.child.mode.${m}`), icon: MODE_ICON[m] }))}
                />
                {rule.mode === "percent" ? (
                  <div className="relative w-28">
                    <Input
                      inputMode="numeric"
                      aria-label={t("policy.child.percentOfAdult")}
                      value={rule.value}
                      onChange={(e) => setRule(k, { value: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                      className="h-11 pe-10 text-[15px] font-semibold tabular-nums"
                      data-testid={`child-${k}-value`}
                    />
                    <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-zinc-400">%</span>
                  </div>
                ) : rule.mode === "fixed" ? (
                  <div className="w-40">
                    <MoneyInput
                      aria-label={t("policy.child.fixedNight")}
                      currency={hotel.currency}
                      value={rule.value}
                      onChange={(v) => setRule(k, { value: v })}
                      className="h-11"
                      data-testid={`child-${k}-value`}
                    />
                  </div>
                ) : null}
                {example != null ? (
                  <span className={cn("ms-auto rounded-full px-3 py-1 text-[12px] font-semibold", example === 0 ? TONES.emerald.soft : TONES.zinc.soft)}>
                    {example === 0 ? t("policy.child.freeExample") : t("policy.child.example", { amount: formatMoney(example, locale, hotel.currency) })}
                  </span>
                ) : null}
              </div>
            </FormSection>
          );
        })}

        <FormSection icon={BedSingle} tone="teal" title={t("policy.child.extraBed")} hint={t("policy.child.extraBedHint")}>
          <div className="w-48">
            <MoneyInput currency={hotel.currency} value={draft.extraBedAdult} onChange={(v) => setDraft((d) => ({ ...d, extraBedAdult: v }))} aria-label={t("policy.child.extraBed")} data-testid="child-extra-bed" />
          </div>
        </FormSection>
      </div>
    </ActionDialog>
  );
}
