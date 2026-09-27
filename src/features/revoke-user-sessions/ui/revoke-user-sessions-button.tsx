"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { revokeUserSessions } from "@/entities/identity";
import { useCan } from "@/entities/viewer";
import { Button, ConfirmDialog, useMutationFeedback } from "@/shared/ui";

type Props = {
  userId: string;
  userName: string;
  disabled?: boolean;
};

/** Admin "Sign out everywhere" for one user; renders nothing without `users.write`. */
export function RevokeUserSessionsButton({ userId, userName, disabled }: Props) {
  const t = useTranslations("admin.revokeSessions");
  const canWrite = useCan("users.write");
  const feedback = useMutationFeedback();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!canWrite) return null;

  async function confirm() {
    setBusy(true);
    try {
      const { revoked } = await revokeUserSessions(userId);
      feedback.success(t("success", { count: revoked }));
      setOpen(false);
    } catch (err) {
      feedback.error(err, t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled || busy}
        onClick={() => setOpen(true)}
        data-testid="user-revoke-sessions"
      >
        <LogOut className="h-3.5 w-3.5 rtl:-scale-x-100" />
        {t("action")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("confirmTitle", { name: userName })}
        description={t("confirmDescription")}
        confirmLabel={t("action")}
        cancelLabel={t("cancel")}
        onConfirm={() => void confirm()}
        pending={busy}
        destructive
      />
    </>
  );
}
