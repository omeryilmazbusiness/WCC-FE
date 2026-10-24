"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  IDLE_LOGOUT_DEFAULT,
  getCompanySecurity,
  idleLogoutChoices,
  saveCompanySecurity,
} from "@/entities/company-security";
import { useRefreshViewer, useViewer } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";
import { Button, InsetGroup, Switch, useMutationFeedback } from "@/shared/ui";

function optionLabel(t: (key: string, values?: { n: number }) => string, minutes: number): string {
  if (minutes === 60) return t("hour");
  if (minutes % 60 === 0) return t("hours", { n: minutes / 60 });
  return t("minutesValue", { n: minutes });
}

/** GM desk-lock policy: on/off plus minutes of no click / type / scroll. */
export function IdleLogoutForm() {
  const t = useTranslations("settings.session");
  const viewer = useViewer();
  const refreshViewer = useRefreshViewer();
  const feedback = useMutationFeedback();
  const selectId = useId();
  const fromViewer = viewer.workspace?.company.idleLogoutMinutes;
  const [saved, setSaved] = useState(() => (typeof fromViewer === "number" ? fromViewer : IDLE_LOGOUT_DEFAULT));
  const [draft, setDraft] = useState(saved);
  const [lastOn, setLastOn] = useState(saved > 0 ? saved : IDLE_LOGOUT_DEFAULT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof fromViewer !== "number") return;
    setSaved(fromViewer);
    setDraft(fromViewer);
    if (fromViewer > 0) setLastOn(fromViewer);
  }, [fromViewer]);

  useEffect(() => {
    void getCompanySecurity()
      .then((next) => {
        setSaved(next.idleLogoutMinutes);
        setDraft(next.idleLogoutMinutes);
        if (next.idleLogoutMinutes > 0) setLastOn(next.idleLogoutMinutes);
      })
      .catch(() => undefined);
  }, []);

  const enabled = draft > 0;
  const dirty = draft !== saved;
  const durations = idleLogoutChoices(lastOn).filter((n) => n > 0);

  function setEnabled(on: boolean) {
    setDraft(on ? lastOn : 0);
  }

  function setMinutes(n: number) {
    setDraft(n);
    if (n > 0) setLastOn(n);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const next = await saveCompanySecurity(draft);
      setSaved(next.idleLogoutMinutes);
      setDraft(next.idleLogoutMinutes);
      if (next.idleLogoutMinutes > 0) setLastOn(next.idleLogoutMinutes);
      await refreshViewer();
      feedback.success(t("saved"));
    } catch (err) {
      feedback.error(err, t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate data-testid="idle-logout-form">
      <InsetGroup title={t("policyTitle")} footer={t("footer")}>
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div className="min-w-0">
            <span className="block text-[15px] font-medium text-zinc-900">{t("enabled")}</span>
            <span className="mt-0.5 block text-[12.5px] text-zinc-500">{t("enabledHint")}</span>
          </div>
          <Switch
            checked={enabled}
            onChange={setEnabled}
            label={t("enabled")}
            data-testid="idle-logout-enabled"
          />
        </div>
        {enabled ? (
          <div className="flex items-center justify-between gap-4 px-4 py-3.5">
            <label htmlFor={selectId} className="text-[15px] font-medium text-zinc-900">
              {t("duration")}
            </label>
            <select
              id={selectId}
              value={draft}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="h-10 max-w-[58%] rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[14px] font-medium text-zinc-900 outline-none focus:border-zinc-400 focus:bg-white"
              data-testid="idle-logout-minutes"
            >
              {durations.map((n) => (
                <option key={n} value={n}>
                  {optionLabel(t, n)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
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
                onClick={() => setDraft(saved)}
                disabled={saving || !dirty}
                tabIndex={dirty ? 0 : -1}
                data-testid="idle-logout-discard"
              >
                {t("discard")}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-white text-zinc-900 hover:bg-zinc-100"
                disabled={saving || !dirty}
                tabIndex={dirty ? 0 : -1}
                data-testid="idle-logout-save"
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
