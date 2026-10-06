"use client";

import { useEffect, useId, useMemo, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  PROFILE_LIMITS,
  personalInfoChanges,
  personalInfoIssues,
  updateProfile,
  type PersonalInfo,
  type PersonalInfoIssues,
  type Profile,
  type ProfileIssue,
} from "@/entities/profile";
import { isApiError } from "@/shared/api/api-error";
import { cn } from "@/shared/lib/cn";
import { Button, InsetGroup, useMutationFeedback } from "@/shared/ui";

type Props = { profile: Profile; onSaved: (profile: Profile) => void };

const API_FIELD: Record<string, keyof PersonalInfo> = { full_name: "fullName", job_title: "jobTitle", phone: "phone" };

function toIssue(reason: string): ProfileIssue {
  if (reason === "required") return "required";
  if (reason === "too_long") return "tooLong";
  return "invalid";
}

function pick(p: Profile): PersonalInfo {
  return { fullName: p.fullName, jobTitle: p.jobTitle, phone: p.phone };
}

/** Name, job title and phone as iOS rows with live checks and a save bar while edited. */
export function PersonalInfoForm({ profile, onSaved }: Props) {
  const t = useTranslations("settings.profile.info");
  const feedback = useMutationFeedback();
  const saved = useMemo(() => pick(profile), [profile]);
  const [draft, setDraft] = useState<PersonalInfo>(saved);
  const [touched, setTouched] = useState<Partial<Record<keyof PersonalInfo, boolean>>>({});
  const [serverIssues, setServerIssues] = useState<PersonalInfoIssues>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(saved), [saved]);

  const changes = personalInfoChanges(saved, draft);
  const dirty = Object.keys(changes).length > 0;
  const issues = { ...personalInfoIssues(draft), ...serverIssues };
  const valid = Object.keys(personalInfoIssues(draft)).length === 0;

  function set(key: keyof PersonalInfo, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
    setServerIssues((s) => ({ ...s, [key]: undefined }));
  }

  function shown(key: keyof PersonalInfo): ProfileIssue | undefined {
    return touched[key] || serverIssues[key] ? issues[key] : undefined;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched({ fullName: true, jobTitle: true, phone: true });
    if (!dirty || !valid || saving) return;
    setSaving(true);
    try {
      const next = await updateProfile(changes);
      onSaved(next);
      setTouched({});
      feedback.success(t("saved"));
    } catch (err) {
      const fields = isApiError(err) ? err.fieldErrors : undefined;
      const mapped: PersonalInfoIssues = {};
      for (const [field, reason] of Object.entries(fields ?? {})) {
        const key = API_FIELD[field];
        if (key) mapped[key] = toIssue(reason);
      }
      setServerIssues(mapped);
      feedback.error(err, t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate data-testid="profile-info-form">
      <InsetGroup title={t("title")} footer={t("footer")}>
        <Row
          label={t("fullName")}
          issue={shown("fullName") ? t(`issue.fullName.${shown("fullName")}`) : undefined}
          value={draft.fullName}
          onChange={(v) => set("fullName", v)}
          onBlur={() => setTouched((s) => ({ ...s, fullName: true }))}
          placeholder={t("fullNamePlaceholder")}
          autoComplete="name"
          maxLength={PROFILE_LIMITS.fullNameMax + 20}
          required
          testId="profile-full-name"
        />
        <Row
          label={t("jobTitle")}
          issue={shown("jobTitle") ? t(`issue.jobTitle.${shown("jobTitle")}`) : undefined}
          value={draft.jobTitle}
          onChange={(v) => set("jobTitle", v)}
          onBlur={() => setTouched((s) => ({ ...s, jobTitle: true }))}
          placeholder={t("jobTitlePlaceholder")}
          autoComplete="organization-title"
          maxLength={PROFILE_LIMITS.jobTitleMax + 20}
          counter={`${[...draft.jobTitle.trim()].length}/${PROFILE_LIMITS.jobTitleMax}`}
          testId="profile-job-title"
        />
        <Row
          label={t("phone")}
          issue={shown("phone") ? t(`issue.phone.${shown("phone")}`) : undefined}
          value={draft.phone}
          onChange={(v) => set("phone", v)}
          onBlur={() => setTouched((s) => ({ ...s, phone: true }))}
          placeholder={t("phonePlaceholder")}
          autoComplete="tel"
          type="tel"
          inputMode="tel"
          dir="ltr"
          className="sm:rtl:text-left"
          maxLength={PROFILE_LIMITS.phoneMaxChars + 8}
          testId="profile-phone"
        />
      </InsetGroup>
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          dirty ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        aria-hidden={!dirty}
      >
        <div className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 rounded-[18px] bg-zinc-900 px-4 py-2.5 text-white shadow-lg">
            <span className="text-[13px] text-white/80">{t("unsaved")}</span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={() => {
                  setDraft(saved);
                  setTouched({});
                  setServerIssues({});
                }}
                disabled={saving || !dirty}
                tabIndex={dirty ? 0 : -1}
                data-testid="profile-info-discard"
              >
                {t("discard")}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-white text-zinc-900 hover:bg-zinc-100"
                disabled={saving || !dirty || !valid}
                tabIndex={dirty ? 0 : -1}
                data-testid="profile-info-save"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                {t("save")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

type RowProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  issue?: string;
  counter?: string;
  testId: string;
};

function Row({ label, value, onChange, issue, counter, testId, className, ...input }: RowProps) {
  const id = useId();
  return (
    <div className="px-4 py-2.5">
      <div className="flex min-h-[40px] flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
        <label htmlFor={id} className="shrink-0 text-[13px] font-medium text-zinc-500 sm:w-40 sm:text-[14.5px] sm:text-zinc-900">
          {label}
        </label>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(issue)}
          aria-describedby={issue ? `${id}-issue` : undefined}
          data-testid={testId}
          className={cn(
            "min-w-0 flex-1 bg-transparent py-1 text-[15px] text-zinc-950 outline-none placeholder:text-zinc-300 sm:text-end",
            className,
          )}
          {...input}
        />
        {counter ? <span className="hidden text-[11px] tabular-nums text-zinc-300 sm:block">{counter}</span> : null}
      </div>
      {issue ? (
        <p id={`${id}-issue`} className="pt-1 text-[12px] font-medium text-rose-600 sm:text-end" role="alert">
          {issue}
        </p>
      ) : null}
    </div>
  );
}
