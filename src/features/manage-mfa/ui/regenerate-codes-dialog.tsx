"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { isApiError } from "@/shared/api/api-error";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { useMutationFeedback } from "@/shared/ui";
import { RecoveryCodesPanel, TotpInput, TOTP_CODE_PATTERN } from "@/shared/ui/mfa";
import { regenerateRecoveryCodes } from "../model/mfa-api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RegenerateCodesDialog({ open, onOpenChange }: Props) {
  const t = useTranslations("security");
  const feedback = useMutationFeedback();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);

  function close() {
    setCode("");
    setError(null);
    setCodes(null);
    onOpenChange(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!TOTP_CODE_PATTERN.test(code) || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await regenerateRecoveryCodes(code);
      setCodes(res.recovery_codes ?? []);
      feedback.success(t("regeneratedToast"));
    } catch (err) {
      if (isApiError(err) && [400, 401, 422].includes(err.status)) {
        setError(t("invalidCode"));
      } else {
        feedback.error(err, t("regenerateError"));
      }
      setCode("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("regenerateTitle")}</DialogTitle>
          <DialogDescription>{t("regenerateDescription")}</DialogDescription>
        </DialogHeader>
        {codes ? (
          <RecoveryCodesPanel codes={codes} onDone={close} />
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <TotpInput id="mfa-regenerate-code" label={t("code")} value={code} onChange={setCode} error={error} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={!TOTP_CODE_PATTERN.test(code) || submitting}>
                {t("regenerate")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
