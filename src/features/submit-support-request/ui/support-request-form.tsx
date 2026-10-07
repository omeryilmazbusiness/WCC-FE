"use client";

import { useId, useState, type FormEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SUPPORT_LIMITS, draftIssues, supportApi, type SupportDraft, type SupportRequest } from "@/entities/support";
import { cn } from "@/shared/lib/cn";
import { Button, useMutationFeedback } from "@/shared/ui";

const EMPTY: SupportDraft = { title: "", description: "" };

/** Title + description, checked as the user types; on success the form clears and reports the new request. */
export function SupportRequestForm({ onSubmitted }: { onSubmitted: (request: SupportRequest) => void }) {
  const t = useTranslations("support.form");
  const locale = useLocale() === "ar" ? "ar" : "en";
  const feedback = useMutationFeedback();
  const ids = { title: useId(), description: useId(), titleHint: useId(), descriptionHint: useId() };
  const [draft, setDraft] = useState<SupportDraft>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof SupportDraft, boolean>>>({});
  const [sending, setSending] = useState(false);

  const issues = draftIssues(draft);
  const valid = Object.keys(issues).length === 0;
  const shown = (k: keyof SupportDraft) => (touched[k] ? issues[k] : undefined);
  const titleLen = [...draft.title.trim()].length;
  const descLen = [...draft.description.trim()].length;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched({ title: true, description: true });
    if (!valid || sending) return;
    setSending(true);
    try {
      const created = await supportApi.submit(draft, locale);
      setDraft(EMPTY);
      setTouched({});
      onSubmitted(created);
      feedback.success(t("sent", { number: created.number }), t("sentHint"));
    } catch (err) {
      feedback.error(err, t("failed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3" data-testid="support-form">
      <div className="overflow-hidden rounded-[22px] bg-white ring-1 ring-zinc-200/60">
        <label htmlFor={ids.title} className="block px-4 pt-3 text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
          {t("title")}
        </label>
        <input
          id={ids.title}
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          onBlur={() => setTouched((s) => ({ ...s, title: true }))}
          placeholder={t("titlePlaceholder")}
          maxLength={SUPPORT_LIMITS.titleMax + 20}
          aria-invalid={Boolean(shown("title"))}
          aria-describedby={ids.titleHint}
          required
          className="block h-11 w-full bg-transparent px-4 text-[15px] text-zinc-950 placeholder:text-zinc-400 focus:outline-none"
          data-testid="support-title"
        />
        <Hint id={ids.titleHint} issue={shown("title") && t(`issues.title.${shown("title")}`)} counter={`${titleLen}/${SUPPORT_LIMITS.titleMax}`} />
        <div className="mx-4 h-px bg-zinc-100" />
        <label htmlFor={ids.description} className="block px-4 pt-3 text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
          {t("description")}
        </label>
        <textarea
          id={ids.description}
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          onBlur={() => setTouched((s) => ({ ...s, description: true }))}
          placeholder={t("descriptionPlaceholder")}
          maxLength={SUPPORT_LIMITS.descriptionMax + 200}
          rows={6}
          aria-invalid={Boolean(shown("description"))}
          aria-describedby={ids.descriptionHint}
          required
          className="block min-h-[140px] w-full resize-y bg-transparent px-4 py-2 text-[15px] leading-relaxed text-zinc-950 placeholder:text-zinc-400 focus:outline-none"
          data-testid="support-description"
        />
        <Hint
          id={ids.descriptionHint}
          issue={shown("description") && t(`issues.description.${shown("description")}`)}
          counter={`${descLen}/${SUPPORT_LIMITS.descriptionMax}`}
        />
      </div>
      <div className="flex flex-col-reverse items-stretch gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] leading-snug text-zinc-500">{t("footer")}</p>
        <Button type="submit" disabled={sending} className="h-10 shrink-0 rounded-full px-5" data-testid="support-submit">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden />}
          {sending ? t("sending") : t("send")}
        </Button>
      </div>
    </form>
  );
}

function Hint({ id, issue, counter }: { id: string; issue?: string | false; counter: string }) {
  return (
    <p id={id} className="flex items-center justify-between gap-3 px-4 pb-2 text-[12px]">
      <span className={cn(issue ? "text-rose-600" : "text-transparent")} role={issue ? "alert" : undefined}>
        {issue || "·"}
      </span>
      <span className="tabular-nums text-zinc-400" dir="ltr">
        {counter}
      </span>
    </p>
  );
}
