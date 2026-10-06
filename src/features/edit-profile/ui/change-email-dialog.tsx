"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AtSign, Loader2, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { changeEmail, emailIssue, type Profile } from "@/entities/profile";
import { isApiError } from "@/shared/api/api-error";
import { ActionDialog, Button, Field, IconInput, useMutationFeedback } from "@/shared/ui";
import { PasswordInput } from "./password-input";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; profile: Profile; onSaved: (profile: Profile) => void };

type Problem = "required" | "invalid" | "unchanged" | "taken";

/** New sign-in email, confirmed with the current password. */
export function ChangeEmailDialog({ open, onOpenChange, profile, onSaved }: Props) {
  const t = useTranslations("settings.profile.email");
  const feedback = useMutationFeedback();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailProblem, setEmailProblem] = useState<Problem | null>(null);
  const [passwordWrong, setPasswordWrong] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setPassword("");
    setEmailProblem(null);
    setPasswordWrong(false);
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const local = emailIssue(email);
    const same = email.trim().toLowerCase() === profile.email.toLowerCase();
    if (local || same) {
      setEmailProblem(local ?? "unchanged");
      return;
    }
    if (!password) return;
    setSaving(true);
    try {
      const next = await changeEmail(email, password);
      onSaved(next);
      feedback.success(t("saved"), next.email);
      onOpenChange(false);
    } catch (err) {
      const fields = isApiError(err) ? (err.fieldErrors ?? {}) : {};
      if (fields.password) setPasswordWrong(true);
      if (fields.email) setEmailProblem((["required", "invalid", "unchanged", "taken"] as const).find((p) => p === fields.email) ?? "invalid");
      if (!fields.password && !fields.email) feedback.error(err, t("failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={(next) => !saving && onOpenChange(next)}
      icon={Mail}
      tone="sky"
      title={t("title")}
      description={t("description", { email: profile.email })}
      testId="profile-email-dialog"
    >
      <form id="profile-email-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t("newEmail")} htmlFor="profile-new-email">
          <IconInput
            id="profile-new-email"
            icon={AtSign}
            type="email"
            dir="ltr"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailProblem(null);
            }}
            placeholder="name@company.com"
            aria-invalid={Boolean(emailProblem)}
            data-testid="profile-new-email"
          />
          {emailProblem ? <p className="text-[12px] font-medium text-rose-600" role="alert">{t(`problem.${emailProblem}`)}</p> : null}
        </Field>
        <Field label={t("currentPassword")} htmlFor="profile-email-password" hint={t("passwordHint")}>
          <PasswordInput
            id="profile-email-password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordWrong(false);
            }}
            aria-invalid={passwordWrong}
            data-testid="profile-email-password"
          />
          {passwordWrong ? <p className="text-[12px] font-medium text-rose-600" role="alert">{t("wrongPassword")}</p> : null}
        </Field>
        <p className="rounded-2xl bg-sky-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-sky-800">{t("notice")}</p>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={saving || !email.trim() || !password} data-testid="profile-email-submit">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {t("submit")}
          </Button>
        </div>
      </form>
    </ActionDialog>
  );
}
