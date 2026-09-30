"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PartyPopper, TrendingDown } from "lucide-react";
import { createAIRepository, type LostLeadsAnalysis } from "@/entities/ai";
import { useCan } from "@/entities/viewer";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { QueryState, useMutationFeedback } from "@/shared/ui";
import { AIConnectState, AIHeaderButton, AIInsightCard, AISkeleton } from "./ai-insight-card";

const repo = createAIRepository();

const BAR_COLORS = ["bg-rose-500", "bg-orange-400", "bg-amber-400", "bg-fuchsia-400", "bg-sky-400", "bg-zinc-300"];

function periodLabel(a: LostLeadsAnalysis, locale: string): { from: string; to: string } {
  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const end = new Date(Date.parse(a.periodEnd) - 1);
  return { from: fmt.format(new Date(a.periodStart)), to: fmt.format(end) };
}

/** Weekly read of why leads were lost: a short summary and simple actions. */
export function LostLeadsCard() {
  const t = useTranslations("ai");
  const tReason = useTranslations("pipeline.lostReasons");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const canRun = useCan("ai.write");
  const [busy, setBusy] = useState(false);
  const query = useApiQuery(() => repo.lostLeadsAnalysis(), []);
  const [fresh, setFresh] = useState<LostLeadsAnalysis | null>(null);
  const data = fresh ?? query.data;

  async function analyze() {
    setBusy(true);
    try {
      setFresh({ ...(await repo.analyzeLostLeads()), available: true, aiEnabled: true });
    } catch (err) {
      feedback.error(err, t("lostError"));
    } finally {
      setBusy(false);
    }
  }

  const ar = locale === "ar";
  const summary = data ? (ar && data.summary.ar) || data.summary.en : "";
  const actions = data ? (ar && data.actions.ar.length > 0 ? data.actions.ar : data.actions.en) : [];
  const reasonLabel = (code: string) => (tReason.has(code) ? tReason(code) : code);
  const enabled = Boolean(data?.aiEnabled);
  const shown = data?.available ? data : null;

  return (
    <AIInsightCard
      title={t("lostTitle")}
      subtitle={shown ? t("lostPeriod", { ...periodLabel(shown, locale), count: shown.lostCount }) : t("lostSubtitle")}
      icon={TrendingDown}
      accent="rose"
      model={shown?.model || undefined}
      updatedAt={shown?.createdAt || undefined}
      data-testid="lost-leads-card"
      action={
        enabled && canRun ? (
          <AIHeaderButton onClick={() => void analyze()} disabled={busy}>
            {busy ? t("loading") : t("lostAnalyze")}
          </AIHeaderButton>
        ) : null
      }
    >
      <QueryState loading={query.loading && !data} error={fresh ? null : query.error} onRetry={() => void query.reload()}>
        {!data ? null : !enabled ? (
          <AIConnectState text={t("lostNoAi")} />
        ) : busy ? (
          <AISkeleton />
        ) : !shown ? (
          <p className="text-sm font-medium text-zinc-500">{t("lostEmpty")}</p>
        ) : shown.lostCount === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-100">
            <PartyPopper className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
            {t("lostNone")}
          </div>
        ) : (
          <div className="space-y-5">
            <ul className="space-y-2" aria-label={t("lostReasonsLabel")}>
              {shown.reasons.map((r, i) => (
                <li key={r.code} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 text-xs">
                  <span className="truncate font-semibold text-zinc-700">{reasonLabel(r.code)}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-zinc-100">
                    <span
                      className={`block h-full rounded-full ${BAR_COLORS[Math.min(i, BAR_COLORS.length - 1)]}`}
                      style={{ width: `${Math.max(6, Math.round((r.count / shown.lostCount) * 100))}%` }}
                    />
                  </span>
                  <span className="tabular-nums font-semibold text-zinc-500">{r.count}</span>
                </li>
              ))}
            </ul>

            {summary ? (
              <p className="border-s-2 border-rose-300 ps-3 text-sm font-medium leading-relaxed text-zinc-900">{summary}</p>
            ) : null}

            {actions.length > 0 ? (
              <div>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">{t("lostActions")}</p>
                <ol className="space-y-2" data-testid="lost-leads-actions">
                  {actions.map((a, i) => (
                    <li key={a} className="flex items-start gap-3 rounded-2xl bg-zinc-50 px-3 py-2.5 text-sm text-zinc-800">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-400 text-[11px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{a}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        )}
      </QueryState>
    </AIInsightCard>
  );
}
