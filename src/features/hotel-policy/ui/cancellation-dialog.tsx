"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarCheck2, CalendarX2, Layers, Moon, Percent, Plus, Trash2, UserX } from "lucide-react";
import { CancellationLadder, DEFAULT_CANCELLATION, hotelToInput, type CancellationPolicy, type Hotel, type HotelRepository, type PenaltyKind } from "@/entities/hotel";
import { ActionDialog, Button, FormSection, IconButton, SegmentedControl, Stepper, useMutationFeedback } from "@/shared/ui";
import { cancellationError, nextTier } from "../model/policy-draft";

type Props = {
  repository: HotelRepository;
  hotel: Hotel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (hotel: Hotel) => void;
};

const clone = (p: CancellationPolicy): CancellationPolicy => ({ ...p, tiers: p.tiers.map((t) => ({ ...t })) });

export function CancellationDialog({ repository, hotel, open, onOpenChange, onSaved }: Props) {
  const t = useTranslations("hotels");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const [policy, setPolicy] = useState<CancellationPolicy>(() => clone(hotel.cancellation));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setPolicy(clone(hotel.cancellation));
  }, [open, hotel]);

  const error = cancellationError(policy);
  const tiers = [...policy.tiers].map((tier, index) => ({ tier, index })).sort((a, b) => b.tier.minDays - a.tier.minDays);
  const patchTier = (index: number, patch: Partial<CancellationPolicy["tiers"][number]>) =>
    setPolicy((p) => ({ ...p, tiers: p.tiers.map((x, i) => (i === index ? { ...x, ...patch } : x)) }));
  const added = nextTier(policy);

  async function submit() {
    if (error) return;
    setSaving(true);
    try {
      const sorted = { ...policy, tiers: [...policy.tiers].sort((a, b) => b.minDays - a.minDays) };
      const saved = await repository.update(hotel.id, { ...hotelToInput(hotel), cancellation: sorted });
      feedback.success(t("policy.cancel.saved"));
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
      icon={CalendarX2}
      tone="amber"
      size="lg"
      title={t("policy.cancel.title")}
      description={t("policy.cancel.subtitle")}
      testId="cancellation-dialog"
      footer={
        <>
          {error ? (
            <p className="me-auto self-center text-[12.5px] font-semibold text-rose-600" role="alert">
              {t(`policy.cancel.errors.${error}`)}
            </p>
          ) : null}
          <Button variant="ghost" className="me-auto" onClick={() => setPolicy(clone(DEFAULT_CANCELLATION))}>
            {t("policy.cancel.reset")}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={saving || Boolean(error)} onClick={() => void submit()} data-testid="cancellation-submit">
            {saving ? t("saving") : tc("save")}
          </Button>
        </>
      }
    >
      <div className="space-y-4 pb-2">
        <FormSection icon={CalendarCheck2} tone="emerald" title={t("policy.cancel.free")} hint={t("policy.cancel.freeHint")}>
          <div className="max-w-xs">
            <Stepper
              value={policy.freeDays}
              min={0}
              max={365}
              onChange={(v) => setPolicy((p) => ({ ...p, freeDays: v }))}
              suffix={t("policy.cancel.daysBefore")}
              label={t("policy.cancel.free")}
              testId="cancel-free-days"
            />
          </div>
        </FormSection>

        <FormSection
          icon={Layers}
          tone="amber"
          title={t("policy.cancel.tiers")}
          hint={t("policy.cancel.tiersHint")}
          aside={
            <Button
              size="sm"
              variant="outline"
              disabled={!added}
              onClick={() => added && setPolicy((p) => ({ ...p, tiers: [...p.tiers, added] }))}
              data-testid="cancel-add-tier"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t("policy.cancel.addTier")}
            </Button>
          }
        >
          {tiers.length === 0 ? (
            <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-[13px] text-zinc-500">{t("policy.cancel.noTiers")}</p>
          ) : (
            <ul className="space-y-2.5">
              {tiers.map(({ tier, index }) => (
                <li key={index} className="grid items-end gap-3 rounded-[20px] bg-zinc-50/80 p-3 ring-1 ring-inset ring-zinc-900/[0.04] sm:grid-cols-[1fr_auto_1fr_auto]" data-testid="cancel-tier">
                  <div>
                    <p className="mb-1.5 text-[12px] font-semibold text-zinc-500">{t("policy.cancel.fromDays")}</p>
                    <Stepper
                      value={tier.minDays}
                      min={0}
                      max={Math.max(0, policy.freeDays - 1)}
                      onChange={(v) => patchTier(index, { minDays: v })}
                      suffix={t("policy.cancel.daysBefore")}
                      label={t("policy.cancel.fromDays")}
                    />
                  </div>
                  <SegmentedControl<PenaltyKind>
                    aria-label={t("policy.cancel.kind")}
                    value={tier.kind}
                    onChange={(kind) => patchTier(index, { kind, value: kind === "nights" ? 1 : 100 })}
                    options={[
                      { value: "nights", label: t("policy.cancel.nights"), icon: Moon },
                      { value: "percent", label: t("policy.cancel.percent"), icon: Percent },
                    ]}
                  />
                  <div>
                    <p className="mb-1.5 text-[12px] font-semibold text-zinc-500">{tier.kind === "nights" ? t("policy.cancel.nightsCharged") : t("policy.cancel.percentCharged")}</p>
                    <Stepper
                      value={tier.value}
                      min={1}
                      max={tier.kind === "nights" ? 60 : 100}
                      onChange={(v) => patchTier(index, { value: v })}
                      suffix={tier.kind === "nights" ? t("policy.cancel.nightsUnit") : "%"}
                      label={t("policy.cancel.kind")}
                    />
                  </div>
                  <IconButton
                    label={t("policy.cancel.removeTier")}
                    onClick={() => setPolicy((p) => ({ ...p, tiers: p.tiers.filter((_, i) => i !== index) }))}
                    className="text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </FormSection>

        <FormSection icon={UserX} tone="rose" title={t("policy.cancel.noShow")} hint={t("policy.cancel.noShowHint")}>
          <div className="max-w-xs">
            <Stepper
              value={policy.noShowPct}
              min={0}
              max={100}
              onChange={(v) => setPolicy((p) => ({ ...p, noShowPct: v }))}
              suffix="%"
              label={t("policy.cancel.noShow")}
              testId="cancel-no-show"
            />
          </div>
        </FormSection>

        {!error ? <CancellationLadder policy={policy} /> : null}
      </div>
    </ActionDialog>
  );
}
