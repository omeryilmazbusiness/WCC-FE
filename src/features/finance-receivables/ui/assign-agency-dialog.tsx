"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Building2, Unlink } from "lucide-react";
import { RISK_LOOK, refCode, type Agency, type Debtor, type FinanceRepository } from "@/entities/finance";
import { formatMoney } from "@/shared/lib/format";
import { ActionDialog, Button, ChoiceCard, useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: FinanceRepository;
  debtor: Debtor;
  agencies: Agency[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
};

/** Moves a booking onto an agency's open account (B2B channel), or back to direct sale. */
export function AssignAgencyDialog({ repository, debtor, agencies, open, onOpenChange, onDone }: Props) {
  const t = useTranslations("financeHub");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setAgencyId(debtor.agencyId);
  }, [open, debtor.agencyId]);

  const choices = agencies.filter((a) => a.status !== "closed");
  const changed = agencyId !== debtor.agencyId;

  async function submit() {
    if (!changed || saving) return;
    setSaving(true);
    try {
      if (agencyId) await repository.assignBooking(agencyId, debtor.bookingId);
      else await repository.unassignBooking(debtor.bookingId);
      feedback.success(t("receivables.assigned"));
      onDone();
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
      icon={Building2}
      tone="indigo"
      title={t("receivables.assignTitle", { ref: refCode(debtor.refNo) })}
      description={t("receivables.assignHint", { amount: formatMoney(debtor.balance, locale, debtor.currency) })}
      testId="finance-assign-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={!changed || saving} onClick={() => void submit()} data-testid="finance-assign-submit">
            {saving ? t("saving") : tc("save")}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <ChoiceCard selected={agencyId === null} onSelect={() => setAgencyId(null)} icon={Unlink} tone="zinc" label={t("receivables.direct")} hint={t("receivables.directHint")} />
        {choices.map((a) => (
          <ChoiceCard
            key={a.id}
            selected={agencyId === a.id}
            onSelect={() => setAgencyId(a.id)}
            icon={RISK_LOOK[a.risk.level].icon}
            tone={RISK_LOOK[a.risk.level].tone}
            label={`${a.code} · ${a.name}`}
            hint={t("receivables.available", { amount: formatMoney(a.risk.available, locale, a.currency) })}
            disabled={a.status === "suspended" && a.id !== debtor.agencyId}
            testId={`assign-${a.code}`}
          />
        ))}
      </div>
    </ActionDialog>
  );
}
