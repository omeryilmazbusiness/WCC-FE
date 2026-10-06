"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { passwordIssues, type PasswordIssue } from "@/entities/identity";
import { changePassword } from "@/entities/profile";
import { useRefreshViewer } from "@/entities/viewer";
import { isApiError } from "@/shared/api/api-error";
import { cn } from "@/shared/lib/cn";
import { ActionDialog, Button, Field, useMutationFeedback } from "@/shared/ui";
import { passwordStrength } from "../lib/password-strength";
import { PasswordInput } from "./password-input";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; email: string };

const RULES: readonly PasswordIssue[] = ["length", "mix", "common"];
const METER = ["bg-zinc-200", "bg-rose-500", "bg-amber-500", "bg-sky-500", "bg-emerald-500"] as const;
const STRENGTH = ["", "weak", "fair", "good", "strong"] as const;

/** Current, new and repeated password; this device stays signed in, every other one is signed out. */
export function ChangePasswordDialog({ open, onOpenChange, email }: Props) {
  const t = useTranslations("settings.profile.password");
  const feedback = useMutationFeedback();
  const refreshViewer = useRefreshViewer();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [currentWrong, setCurrentWrong] = useState(false);
  const [serverNew, setServerNew] = useState<"weak" | "unchanged" | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrent("");
    setNext("");
    setConfirm("");
    setCurrentWrong(false);
    setServerNew(null);
  }, [open]);

  const issues = passwordIssues(next);
  const strength = passwordStrength(next);
  const mismatch = confirm.length > 0 && confirm !== next;
  const same = next.length > 0 && next === current;
  const ready = current.length > 0 && issues.length === 0 && !same && confirm === next;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    try {
      await changePassword(current, next);
      await refreshViewer();
      feedback.success(t("saved"), t("savedBody"));
      onOpenChange(false);
    } catch (err) {
      const fields = isApiError(err) ? (err.fieldErrors ?? {}) : {};
      if (fields.current_password) setCurrentWrong(true);
      if (fields.new_password) setServerNew(fields.new_password === "unchanged" ? "unchanged" : "weak");
      if (!fields.current_password && !fields.new_password) feedback.error(err, t("failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={(o) => !saving && onOpenChange(o)}
      icon={KeyRound}
      tone="amber"
      title={t("title")}
      description={t("description")}
      testId="profile-password-dialog"
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {/* Lets password managers pair the new password with the account. */}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        <Field label={t("current")} htmlFor="profile-current-password">
          <PasswordInput
            id="profile-current-password"
            autoComplete="current-password"
            autoFocus
            value={current}
            onChange={(e) => {
              setCurrent(e.target.value);
              setCurrentWrong(false);
            }}
            aria-invalid={currentWrong}
            data-testid="profile-current-password"
          />
          {currentWrong ? <p className="text-[12px] font-medium text-rose-600" role="alert">{t("wrongCurrent")}</p> : null}
        </Field>
        <Field label={t("new")} htmlFor="profile-new-password">
          <PasswordInput
            id="profile-new-password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => {
              setNext(e.target.value);
              setServerNew(null);
            }}
            aria-invalid={Boolean(serverNew) || same}
            aria-describedby="profile-password-rules"
            data-testid="profile-new-password"
          />
          <div className="flex items-center gap-2 pt-1" aria-live="polite">
            <div className="flex flex-1 gap-1" aria-hidden>
              {[1, 2, 3, 4].map((step) => (
                <span key={step} className={cn("h-1.5 flex-1 rounded-full transition-colors", strength >= step ? METER[strength] : METER[0])} />
              ))}
            </div>
            <span className="w-14 text-end text-[11.5px] font-semibold text-zinc-500">{strength ? t(`strength.${STRENGTH[strength]}`) : ""}</span>
          </div>
          <ul id="profile-password-rules" className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
            {RULES.map((rule) => {
              const ok = next.length > 0 && !issues.includes(rule);
              return (
                <li key={rule} className={cn("flex items-center gap-1.5 text-[12px]", ok ? "text-emerald-700" : "text-zinc-400")}>
                  <span
                    className={cn("flex h-4 w-4 items-center justify-center rounded-full", ok ? "bg-emerald-500 text-white" : "bg-zinc-200 text-transparent")}
                    aria-hidden
                  >
                    <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                  </span>
                  {t(`rule.${rule}`)}
                </li>
              );
            })}
          </ul>
          {same || serverNew ? (
            <p className="text-[12px] font-medium text-rose-600" role="alert">
              {t(same || serverNew === "unchanged" ? "sameAsCurrent" : "weak")}
            </p>
          ) : null}
        </Field>
        <Field label={t("confirm")} htmlFor="profile-confirm-password">
          <PasswordInput
            id="profile-confirm-password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={mismatch}
            data-testid="profile-confirm-password"
          />
          {mismatch ? <p className="text-[12px] font-medium text-rose-600" role="alert">{t("mismatch")}</p> : null}
        </Field>
        <div className="flex gap-2.5 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{t("notice")}</p>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={!ready || saving} data-testid="profile-password-submit">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {t("submit")}
          </Button>
        </div>
      </form>
    </ActionDialog>
  );
}
