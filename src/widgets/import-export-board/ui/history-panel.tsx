"use client";

import { useState } from "react";
import { CircleCheckBig, FileStack, PencilLine, RefreshCw, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  ENTITY_TYPES,
  SECTION_LOOK,
  filterJobs,
  sortJobs,
  summarizeJobs,
  type ImportExportRepository,
  type ImportJob,
  type JobFilter,
} from "@/entities/importexport";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { Button, QueryState, StatTile } from "@/shared/ui";
import { useErrorReport } from "../model/use-error-report";
import { JobRow } from "./job-row";
import { Hero, Panel } from "./panel";

type Props = {
  repo: ImportExportRepository;
  jobs: ImportJob[];
  loading: boolean;
  error: unknown;
  canResume: boolean;
  onReload: () => void;
  onRefresh: () => void;
  onResume: (job: ImportJob) => void;
};

/** Recent import jobs (latest 50) with outcome totals, an entity filter and per-job actions. */
export function HistoryPanel({ repo, jobs, loading, error, canResume, onReload, onRefresh, onResume }: Props) {
  const t = useTranslations("importExport");
  const locale = useLocale();
  const errors = useErrorReport(repo);
  const [filter, setFilter] = useState<JobFilter>("all");
  const summary = summarizeJobs(jobs);
  const visible = sortJobs(filterJobs(jobs, filter));
  const chips: JobFilter[] = ["all", ...ENTITY_TYPES.filter((e) => summary.byEntity[e])];

  return (
    <Panel
      look={SECTION_LOOK.history}
      title={t("historyTitle")}
      description={t("historySubtitle")}
      data-testid="ie-history"
      actions={
        <Button type="button" variant="secondary" onClick={onRefresh} disabled={loading} aria-label={t("refresh")}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
          <span className="hidden sm:inline">{t("refresh")}</span>
        </Button>
      }
    >
      <QueryState loading={loading && jobs.length === 0} loadingVariant="table" error={error} errorTitle={t("loadError")} onRetry={onReload}>
        {jobs.length === 0 ? (
          <Hero look={SECTION_LOOK.history} title={t("historyEmpty")} body={t("historyEmptyHint")} data-testid="ie-history-empty" />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label={t("statJobs")} value={formatNumber(summary.total, locale)} icon={FileStack} tone="indigo" />
              <StatTile label={t("statImported")} value={formatNumber(summary.imported, locale)} icon={CircleCheckBig} tone="emerald" />
              <StatTile label={t("statAttention")} value={formatNumber(summary.attention, locale)} icon={TriangleAlert} tone={summary.attention ? "rose" : "zinc"} />
              <StatTile label={t("statDrafts")} value={formatNumber(summary.drafts, locale)} icon={PencilLine} tone={summary.drafts ? "amber" : "zinc"} />
            </div>

            {chips.length > 2 ? (
              <div className="flex flex-wrap gap-2" role="group" aria-label={t("filterLabel")}>
                {chips.map((c) => {
                  const on = c === filter;
                  const count = c === "all" ? summary.total : (summary.byEntity[c] ?? 0);
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setFilter(c)}
                      className={cn(
                        "flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold transition",
                        on ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                      )}
                    >
                      {c === "all" ? t("filterAll") : t(`entity.${c}`)}
                      <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", on ? "bg-white/20" : "bg-white")}>{formatNumber(count, locale)}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <ul className="space-y-2.5" data-testid="import-history">
              {visible.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  canResume={canResume}
                  downloading={errors.pending === job.id}
                  onResume={onResume}
                  onDownloadErrors={(id) => void errors.download(id)}
                />
              ))}
            </ul>
          </div>
        )}
      </QueryState>
    </Panel>
  );
}
