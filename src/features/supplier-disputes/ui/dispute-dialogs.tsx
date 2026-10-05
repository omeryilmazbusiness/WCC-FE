"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Gavel, Hash, Scale, XCircle } from "lucide-react";
import type { Dispute, Supplier, SupplierRepository } from "@/entities/supplier";
import { parseMoneyInput } from "@/shared/lib/money";
import { ActionDialog, Button, ChoiceGrid, Field, IconInput, MoneyInput, Textarea, useMutationFeedback } from "@/shared/ui";

type OpenProps = {
  repository: SupplierRepository;
  supplier: Supplier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (dispute: Dispute) => void;
};

/** Logs a billing or service dispute against the supplier. */
export function OpenDisputeDialog({ repository, supplier, open, onOpenChange, onSaved }: OpenProps) {
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const [title, setTitle] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setBookingRef("");
    setAmount("");
  }, [open]);

  const minor = amount.trim() ? parseMoneyInput(amount) : 0;
  const valid = title.trim().length >= 3 && minor !== null && !saving;

  async function submit() {
    if (!valid || minor === null) return;
    setSaving(true);
    try {
      const d = await repository.openDispute(supplier.id, { title: title.trim(), bookingRef: bookingRef.trim(), amount: minor, currency: supplier.finance.currency });
      feedback.success(t("disputes.opened"));
      onSaved(d);
      onOpenChange(false);
    } catch (e) {
      feedback.error(e, t("disputes.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Scale}
      tone="rose"
      title={t("disputes.openTitle")}
      description={t("disputes.openSubtitle")}
      testId="supplier-dispute-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={!valid} onClick={() => void submit()} data-testid="supplier-dispute-submit">
            {saving ? t("saving") : t("disputes.open")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t("disputes.subject")} htmlFor="dispute-title" hint={t("disputes.subjectHint")}>
          <Textarea id="dispute-title" rows={2} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus data-testid="dispute-title" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("disputes.bookingRef")} htmlFor="dispute-ref">
            <IconInput id="dispute-ref" icon={Hash} dir="ltr" value={bookingRef} onChange={(e) => setBookingRef(e.target.value)} maxLength={80} />
          </Field>
          <Field label={t("disputes.amount")} htmlFor="dispute-amount">
            <MoneyInput id="dispute-amount" currency={supplier.finance.currency} value={amount} onChange={setAmount} />
          </Field>
        </div>
      </div>
    </ActionDialog>
  );
}

type CloseProps = {
  repository: SupplierRepository;
  supplierId: string;
  dispute: Dispute | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (dispute: Dispute) => void;
};

/** Resolves or rejects an open dispute with a mandatory outcome note. */
export function CloseDisputeDialog({ repository, supplierId, dispute, onOpenChange, onSaved }: CloseProps) {
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const [status, setStatus] = useState<"resolved" | "rejected">("resolved");
  const [resolution, setResolution] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dispute) return;
    setStatus("resolved");
    setResolution("");
  }, [dispute]);

  const valid = resolution.trim().length >= 3 && !saving;

  async function submit() {
    if (!dispute || !valid) return;
    setSaving(true);
    try {
      const d = await repository.closeDispute(supplierId, dispute.id, status, resolution.trim());
      feedback.success(t("disputes.closed"));
      onSaved(d);
      onOpenChange(false);
    } catch (e) {
      feedback.error(e, t("disputes.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionDialog
      open={Boolean(dispute)}
      onOpenChange={onOpenChange}
      icon={Gavel}
      tone="violet"
      title={t("disputes.closeTitle")}
      description={dispute?.title}
      testId="supplier-dispute-close-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button disabled={!valid} onClick={() => void submit()} data-testid="supplier-dispute-close-submit">
            {saving ? t("saving") : t("disputes.close")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <ChoiceGrid
          name="dispute-outcome"
          value={status}
          onChange={setStatus}
          options={[
            { value: "resolved", label: t("dispute.resolved"), hint: t("disputes.resolvedHint"), icon: CheckCircle2, tone: "emerald" },
            { value: "rejected", label: t("dispute.rejected"), hint: t("disputes.rejectedHint"), icon: XCircle, tone: "zinc" },
          ]}
        />
        <Field label={t("disputes.resolution")} htmlFor="dispute-resolution">
          <Textarea id="dispute-resolution" rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} maxLength={1000} data-testid="dispute-resolution" />
        </Field>
      </div>
    </ActionDialog>
  );
}
