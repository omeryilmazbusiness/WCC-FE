"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import type { Customer, CustomerRepository } from "@/entities/customer";
import { useCan } from "@/entities/viewer";
import { isApiError } from "@/shared/api/api-error";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  useMutationFeedback,
} from "@/shared/ui";
import {
  ACTIVE_BOOKINGS_CODE,
  ANONYMIZE_REASON_MIN,
  canSubmitAnonymize,
  isNameConfirmed,
  isReasonValid,
} from "../model/anonymize";

type Props = {
  customer: Customer;
  repository: CustomerRepository;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnonymized?: (customer: Customer) => void;
};

/** Irreversible KVKK erasure (`privacy.manage`) behind a reason + typed-name confirmation. */
export function AnonymizeCustomerDialog({ customer, repository, open, onOpenChange, onAnonymized }: Props) {
  const t = useTranslations("privacy");
  const allowed = useCan("privacy.manage");
  const feedback = useMutationFeedback();
  const [reason, setReason] = useState("");
  const [typedName, setTypedName] = useState("");
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);

  if (!allowed) return null;

  const ready = canSubmitAnonymize({ reason, typedName, customerName: customer.fullName });

  function close() {
    setReason("");
    setTypedName("");
    setBlocked(false);
    onOpenChange(false);
  }

  function change(next: boolean) {
    if (busy) return;
    if (next) onOpenChange(true);
    else close();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setBlocked(false);
    try {
      const updated = await repository.anonymize(customer.id, reason.trim());
      feedback.success(t("anonymized"));
      setBusy(false);
      close();
      onAnonymized?.(updated);
    } catch (err) {
      setBusy(false);
      if (isApiError(err) && err.status === 409 && err.code === ACTIVE_BOOKINGS_CODE) {
        setBlocked(true);
      } else {
        feedback.error(err, t("anonymizeError"));
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="sm:max-w-lg" data-testid="anonymize-customer-dialog">
        <DialogHeader>
          <DialogTitle>{t("anonymizeTitle", { name: customer.fullName })}</DialogTitle>
          <DialogDescription>{t("anonymizeDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          <p className="font-medium">{t("anonymizeWarning")}</p>
        </div>

        {blocked ? (
          <div
            className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900"
            role="alert"
            data-testid="anonymize-active-bookings"
          >
            {t("activeBookings")}
          </div>
        ) : null}

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="anonymize-reason">{t("reasonLabel")}</Label>
            <Textarea
              id="anonymize-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
              disabled={busy}
              required
              minLength={ANONYMIZE_REASON_MIN}
            />
            <p className={reason && !isReasonValid(reason) ? "text-xs text-red-600" : "text-xs text-zinc-500"}>
              {t("reasonHint", { min: ANONYMIZE_REASON_MIN })}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="anonymize-confirm-name">{t("confirmNameLabel", { name: customer.fullName })}</Label>
            <Input
              id="anonymize-confirm-name"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              autoComplete="off"
              disabled={busy}
              data-testid="anonymize-confirm-name"
            />
            {typedName && !isNameConfirmed(typedName, customer.fullName) ? (
              <p className="text-xs text-red-600">{t("confirmNameMismatch")}</p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" disabled={busy} onClick={() => change(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={!ready || busy} data-testid="anonymize-submit">
              {t("confirm")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
