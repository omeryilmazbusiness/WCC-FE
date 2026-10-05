"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertOctagon, AlertTriangle, Ban, Clock, FileWarning, Info, MessageSquareText, NotebookPen, Send, Sparkles, type LucideIcon } from "lucide-react";
import { ISSUE_KINDS, ISSUE_SEVERITIES, type IssueKind, type IssueSeverity, type SupplierRepository } from "@/entities/supplier";
import { useCan } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";
import { formatDateTime } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Button, EmptyState, InfoSection, QueryState, SegmentedControl, Textarea, TONES, useMutationFeedback, type Tone } from "@/shared/ui";

const KIND_ICON: Record<IssueKind, LucideIcon> = {
  note: NotebookPen,
  delay: Clock,
  quality: Sparkles,
  cancellation: Ban,
  invoice: FileWarning,
  other: MessageSquareText,
};

const SEVERITY_LOOK: Record<IssueSeverity, { icon: LucideIcon; tone: Tone }> = {
  info: { icon: Info, tone: "sky" },
  warning: { icon: AlertTriangle, tone: "amber" },
  critical: { icon: AlertOctagon, tone: "rose" },
};

type Props = { supplierId: string; repository: SupplierRepository };

/** Running log of service incidents with the supplier (delays, quality, cancellations…). */
export function SupplierIssueLogPanel({ supplierId, repository }: Props) {
  const t = useTranslations("suppliers.issues");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const canWrite = useCan("suppliers.write");
  const [kind, setKind] = useState<IssueKind>("note");
  const [severity, setSeverity] = useState<IssueSeverity>("info");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const query = useApiQuery(() => repository.listIssues(supplierId), [repository, supplierId], { cacheKey: ["supplier-issues", supplierId] });
  const issues = query.data ?? [];

  async function submit() {
    if (!note.trim() || saving) return;
    setSaving(true);
    try {
      const ev = await repository.createIssue(supplierId, { note: note.trim(), kind, severity });
      query.setData((list) => [ev, ...(list ?? [])]);
      setNote("");
      feedback.success(t("logged"));
    } catch (e) {
      feedback.error(e, t("actionError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <InfoSection icon={NotebookPen} tone="amber" title={t("title")} data-testid="supplier-issues">
      {canWrite ? (
        <div className="mb-4 space-y-2.5 rounded-[22px] border border-zinc-200/70 bg-zinc-50/60 p-3">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("kind")}>
            {ISSUE_KINDS.map((k) => {
              const Icon = KIND_ICON[k];
              const active = k === kind;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setKind(k)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition",
                    active ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-100",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {t(`kindLabel.${k}`)}
                </button>
              );
            })}
          </div>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder={t("placeholder")} aria-label={t("placeholder")} data-testid="supplier-issue-note" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SegmentedControl
              aria-label={t("severity")}
              value={severity}
              onChange={setSeverity}
              options={ISSUE_SEVERITIES.map((s) => ({ value: s, label: t(`severityLabel.${s}`), icon: SEVERITY_LOOK[s].icon }))}
            />
            <Button size="sm" disabled={!note.trim() || saving} onClick={() => void submit()} data-testid="supplier-issue-submit">
              <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
              {t("log")}
            </Button>
          </div>
        </div>
      ) : null}
      <QueryState loading={query.loading && !query.data} error={query.error} onRetry={() => void query.reload()}>
        {issues.length === 0 ? (
          <EmptyState icon={NotebookPen} title={t("empty")} description={t("emptyHint")} />
        ) : (
          <ol className="relative space-y-3 ps-6 before:absolute before:inset-y-1 before:start-[9px] before:w-px before:bg-zinc-200">
            {issues.map((ev) => {
              const look = SEVERITY_LOOK[ev.severity];
              const Icon = KIND_ICON[ev.kind];
              return (
                <li key={ev.id} className="relative">
                  <span className={cn("absolute -start-6 top-1 flex h-[19px] w-[19px] items-center justify-center rounded-full ring-4 ring-white", TONES[look.tone].solid)} aria-hidden>
                    <Icon className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  <p className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold text-zinc-500">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-bold", TONES[look.tone].soft)}>{t(`severityLabel.${ev.severity}`)}</span>
                    {t(`kindLabel.${ev.kind}`)} · {ev.createdAt ? formatDateTime(ev.createdAt, locale) : ""}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[13.5px] text-zinc-800">{ev.note}</p>
                </li>
              );
            })}
          </ol>
        )}
      </QueryState>
    </InfoSection>
  );
}
