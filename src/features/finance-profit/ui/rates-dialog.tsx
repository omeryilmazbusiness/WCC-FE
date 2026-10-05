"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Percent, SlidersHorizontal, UserRoundCheck } from "lucide-react";
import { bpsToPercent, percentToBps, type FinanceRepository, type FinanceSettings } from "@/entities/finance";
import { ActionDialog, Button, Field, IconInput, useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: FinanceRepository;
  settings: FinanceSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (s: FinanceSettings) => void;
};

/** Company-wide sales commission share (of margin). */
export function RatesDialog({ repository, settings, open, onOpenChange, onSaved }: Props) {
  const t = useTranslations("financeHub");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const [commission, setCommission] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCommission(String(bpsToPercent(settings.commissionBps)));
  }, [open, settings]);

  const c = percentToBps(commission);
  const valid = c !== null && c <= 10_000;

  async function submit() {
    if (!valid || c === null || saving) return;
    setSaving(true);
    try {
      const s = await repository.setRates({ commissionBps: c });
      feedback.success(t("profit.ratesSaved"));
      onSaved(s);
      onOpenChange(false);
    } catch (e) {
      feedback.error(e, t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={SlidersHorizontal}
      tone="zinc"
      title={t("profit.ratesTitle")}
      description={t("profit.ratesHint")}
      testId="finance-rates-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={!valid || saving} onClick={() => void submit()} data-testid="finance-rates-submit">
            {saving ? t("saving") : tc("save")}
          </Button>
        </>
      }
    >
      <Field label={t("profit.commissionRate")} htmlFor="rt-com" hint={t("profit.commissionRateHint")}>
        <IconInput id="rt-com" icon={UserRoundCheck} inputMode="decimal" dir="ltr" value={commission} onChange={(e) => setCommission(e.target.value)} data-testid="rt-commission" />
      </Field>
      {!valid ? (
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-rose-700">
          <Percent className="h-3.5 w-3.5" aria-hidden />
          {t("profit.rateInvalid")}
        </p>
      ) : null}
    </ActionDialog>
  );
}
