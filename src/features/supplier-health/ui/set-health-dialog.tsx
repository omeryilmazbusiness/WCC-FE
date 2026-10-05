"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Activity } from "lucide-react";
import { HEALTH_LOOK, HEALTH_STATUSES, type HealthStatus, type Supplier, type SupplierRepository } from "@/entities/supplier";
import { ActionDialog, Button, ChoiceGrid, Field, Textarea, useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: SupplierRepository;
  supplier: Supplier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (supplier: Supplier) => void;
};

/** Manual traffic light for feed / manual suppliers or an incident override. */
export function SetHealthDialog({ repository, supplier, open, onOpenChange, onSaved }: Props) {
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const [status, setStatus] = useState<HealthStatus>(supplier.health.status);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStatus(supplier.health.status);
    setNote("");
  }, [open, supplier.health.status]);

  async function submit() {
    setSaving(true);
    try {
      const s = await repository.setHealth(supplier.id, status, note.trim());
      feedback.success(t("healthDialog.saved"));
      onSaved(s);
      onOpenChange(false);
    } catch (e) {
      feedback.error(e, t("healthDialog.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Activity}
      tone="sky"
      title={t("healthDialog.title")}
      description={t("healthDialog.subtitle")}
      testId="supplier-health-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={saving} onClick={() => void submit()} data-testid="supplier-health-submit">
            {saving ? t("saving") : tc("save")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <ChoiceGrid
          name="health-status"
          value={status}
          onChange={setStatus}
          options={HEALTH_STATUSES.map((h) => ({ value: h, label: t(`health.${h}`), hint: t(`healthDialog.hint.${h}`), ...HEALTH_LOOK[h] }))}
        />
        <Field label={t("healthDialog.note")} htmlFor="health-note">
          <Textarea id="health-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={t("healthDialog.notePlaceholder")} />
        </Field>
      </div>
    </ActionDialog>
  );
}
