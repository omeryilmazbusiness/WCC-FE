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
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useMutationFeedback } from "@/shared/ui";
import { TotpInput, TOTP_CODE_PATTERN } from "@/shared/ui/mfa";
import { disableMfa } from "../model/mfa-api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDisabled: () => void;
};

export function MfaDisableDialog({ open, onOpenChange, onDisabled }: Props) {
  const t = useTranslations("security");
  const feedback = useMutationFeedback();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setPassword("");
    setCode("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || !TOTP_CODE_PATTERN.test(code) || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await disableMfa({ password, code });
      feedback.success(t("disabledToast"));
      reset();
      onOpenChange(false);
      onDisabled();
    } catch (err) {
      if (isApiError(err) && [400, 401, 422].includes(err.status)) {
        setError(t("invalidPasswordOrCode"));
      } else {
        feedback.error(err, t("disableError"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("disableTitle")}</DialogTitle>
          <DialogDescription>{t("disableDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-disable-password">{t("password")}</Label>
            <Input
              id="mfa-disable-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <TotpInput id="mfa-disable-code" label={t("code")} value={code} onChange={setCode} error={error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!password || !TOTP_CODE_PATTERN.test(code) || submitting}
            >
              {t("disable")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
