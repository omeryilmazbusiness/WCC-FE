"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PaymentPromise, PaymentRepository } from "@/entities/payment";
import { useCan } from "@/entities/viewer";
import { Button, ConfirmDialog, useMutationFeedback } from "@/shared/ui";

type Props = {
  promise: PaymentPromise;
  repository: PaymentRepository;
  onCancelled: (promise: PaymentPromise) => void;
};

export function CancelPaymentPromiseButton({ promise, repository, onCancelled }: Props) {
  const t = useTranslations("finance.promises");
  const allowed = useCan("payments.write");
  const feedback = useMutationFeedback();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!allowed || promise.status !== "open") return null;

  async function confirm() {
    setBusy(true);
    try {
      const updated = await repository.cancelPromise(promise.id);
      feedback.success(t("cancelled"));
      setOpen(false);
      onCancelled(updated);
    } catch (err) {
      feedback.error(err, t("cancelError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)} data-testid="promise-cancel">
        {t("cancelPromise")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("cancelTitle")}
        description={t("cancelDescription")}
        confirmLabel={t("cancelPromise")}
        cancelLabel={t("keep")}
        onConfirm={() => void confirm()}
        pending={busy}
        destructive
      />
    </>
  );
}
