"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { revokeUserSessions } from "@/entities/identity";
import { useCan } from "@/entities/viewer";
import { Button, ConfirmDialog, useMutationFeedback } from "@/shared/ui";

type DialogProps = {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Confirmation that ends every session of one user; the caller owns `open`. */
export function RevokeUserSessionsDialog({ userId, userName, open, onOpenChange }: DialogProps) {
  const t = useTranslations("admin.revokeSessions");
  const feedback = useMutationFeedback();
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      const { revoked } = await revokeUserSessions(userId);
      feedback.success(t("success", { count: revoked }));
      onOpenChange(false);
    } catch (err) {
      feedback.error(err, t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("confirmTitle", { name: userName })}
      description={t("confirmDescription")}
      confirmLabel={t("action")}
      cancelLabel={t("cancel")}
      onConfirm={() => void confirm()}
      pending={busy}
      destructive
    />
  );
}

type Props = {
  userId: string;
  userName: string;
  disabled?: boolean;
};

/** Admin "Sign out everywhere" for one user; renders nothing without `users.write`. */
export function RevokeUserSessionsButton({ userId, userName, disabled }: Props) {
  const t = useTranslations("admin.revokeSessions");
  const canWrite = useCan("users.write");
  const [open, setOpen] = useState(false);

  if (!canWrite) return null;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled}
        onClick={() => setOpen(true)}
        data-testid="user-revoke-sessions"
      >
        <LogOut className="h-3.5 w-3.5 rtl:-scale-x-100" />
        {t("action")}
      </Button>
      <RevokeUserSessionsDialog userId={userId} userName={userName} open={open} onOpenChange={setOpen} />
    </>
  );
}
