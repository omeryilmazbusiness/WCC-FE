"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { passwordIssues, type ApiUser } from "@/entities/identity";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui";
import { PasswordField } from "./password-field";

type Props = {
  member: ApiUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onReset: (member: ApiUser, password: string) => Promise<boolean>;
};

/** Sets a new password for a member and signs them out everywhere. */
export function ResetPasswordDialog({ member, open, onOpenChange, busy, onReset }: Props) {
  const t = useTranslations("team");
  const [password, setPassword] = useState("");
  const ok = passwordIssues(password).length === 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ok) return;
    if (await onReset(member, password)) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("reset.title", { name: member.full_name })}</DialogTitle>
          <DialogDescription>{t("reset.hint")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-5">
          <PasswordField label={t("reset.label")} value={password} onChange={setPassword} />
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
              {t("form.cancel")}
            </Button>
            <Button type="submit" disabled={busy || !ok}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {t("reset.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
