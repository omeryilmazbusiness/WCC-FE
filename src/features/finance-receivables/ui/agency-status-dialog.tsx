"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Ban, CirclePause, CirclePlay, ShieldAlert } from "lucide-react";
import type { Agency, AgencyStatus, FinanceRepository } from "@/entities/finance";
import { ActionDialog, Button, ChoiceGrid, useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: FinanceRepository;
  agency: Agency;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (a: Agency) => void;
};

/** Opens, stops or closes B2B sales for an agency by hand. */
export function AgencyStatusDialog({ repository, agency, open, onOpenChange, onSaved }: Props) {
  const t = useTranslations("financeHub");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const [status, setStatus] = useState<AgencyStatus>(agency.status);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setStatus(agency.status);
  }, [open, agency.status]);

  async function submit() {
    if (status === agency.status || saving) return;
    setSaving(true);
    try {
      const saved = await repository.setAgencyStatus(agency.id, status);
      feedback.success(t("receivables.statusSaved"));
      onSaved(saved);
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
      icon={ShieldAlert}
      tone="rose"
      title={t("receivables.statusTitle", { name: agency.name })}
      description={agency.suspendReason || t("receivables.statusHint")}
      testId="finance-agency-status"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={status === agency.status || saving} onClick={() => void submit()} data-testid="finance-status-submit">
            {saving ? t("saving") : tc("save")}
          </Button>
        </>
      }
    >
      <ChoiceGrid
        name="agency-status"
        columns={3}
        value={status}
        onChange={setStatus}
        options={[
          { value: "active", label: t("agencyStatus.active"), icon: CirclePlay, tone: "emerald" },
          { value: "suspended", label: t("agencyStatus.suspended"), icon: CirclePause, tone: "amber" },
          { value: "closed", label: t("agencyStatus.closed"), icon: Ban, tone: "zinc" },
        ]}
      />
    </ActionDialog>
  );
}
