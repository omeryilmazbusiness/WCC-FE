"use client";

import { useCallback, useState } from "react";
import { CircleCheckBig, Download, LockKeyhole, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  REPORT_KIND_LOOK,
  REPORT_SPECS,
  createReportRepository,
  localToday,
  rangeIssue,
  reportFileName,
  type DayRange,
  type ReportFilter,
  type ReportKind,
  type ReportRepository,
} from "@/entities/report";
import { useCan } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";
import { saveBlob } from "@/shared/lib/download";
import { formatDay, formatRelativeTime } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Button, PageHeader, QueryState, Screen, TONES, useMutationFeedback, useToast } from "@/shared/ui";
import { useReportParams } from "../model/use-report-params";
import { KindPicker } from "./kind-picker";
import { ReportFilters } from "./report-filters";
import { ReportSummary } from "./report-summary";
import { ReportTable } from "./report-table";

const ROW_LIMIT = 200;

type Props = { repository?: ReportRepository };

/** Management reports: pick a report and period, read the headline tiles, drill into rows, export. */
export function ReportsBoard({ repository }: Props) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const { push } = useToast();
  const feedback = useMutationFeedback();
  const [repo] = useState(() => repository ?? createReportRepository());
  const [today] = useState(localToday);
  const [params, update] = useReportParams(today);
  const [exporting, setExporting] = useState(false);
  const canExport = useCan("reports.export");

  const { kind, range, channel, provider } = params;
  const spec = REPORT_SPECS[kind];
  const issue = rangeIssue(range);

  const filter: ReportFilter = { from: range.from, to: range.to, limit: ROW_LIMIT };
  if (spec.extraFilter === "channel" && channel) filter.channel = channel;
  if (spec.extraFilter === "provider" && provider) filter.provider = provider;
  const filterKey = [kind, range.from, range.to, filter.channel ?? "", filter.provider ?? ""];

  const report = useApiQuery(() => repo.run(kind, filter), [repo, ...filterKey], {
    enabled: issue === null,
    cacheKey: ["report", ...filterKey],
  });
  const result = report.data?.kind === kind ? report.data : undefined;
  const refreshing = report.loading && Boolean(result);

  const setKind = useCallback((k: ReportKind) => update({ kind: k }), [update]);
  const setRange = useCallback((r: DayRange) => update({ range: r }), [update]);
  const setChannel = useCallback((c: string) => update({ channel: c }), [update]);
  const setProvider = useCallback((p: string) => update({ provider: p }), [update]);

  async function exportCsv() {
    setExporting(true);
    try {
      saveBlob(await repo.exportCsv(kind, filter), reportFileName(kind, range));
      push({ title: t("exported"), tone: "success" });
    } catch (err) {
      feedback.error(err, t("exportError"));
    } finally {
      setExporting(false);
    }
  }

  const look = REPORT_KIND_LOOK[kind];
  const KindIcon = look.icon;

  return (
    <Screen data-testid="reports-board">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void report.refresh()}
              disabled={issue !== null || report.loading}
              aria-label={t("refresh")}
              data-testid="rp-refresh"
            >
              <RefreshCw className={cn("h-4 w-4", report.loading && "animate-spin")} aria-hidden />
              <span className="hidden sm:inline">{t("refresh")}</span>
            </Button>
            {canExport ? (
              <Button type="button" onClick={() => void exportCsv()} disabled={issue !== null || exporting || !result || result.rows.length === 0} data-testid="rp-export">
                <Download className="h-4 w-4" aria-hidden />
                {t("export")}
              </Button>
            ) : null}
          </div>
        }
      />

      <KindPicker value={kind} onChange={setKind} />

      <ReportFilters
        spec={spec}
        range={range}
        today={today}
        issue={issue}
        channel={channel}
        provider={provider}
        onRange={setRange}
        onChannel={setChannel}
        onProvider={setProvider}
      />

      <div className={cn("flex flex-wrap items-center gap-4 rounded-[28px] border border-zinc-200/60 bg-gradient-to-br p-5", TONES[look.tone].tint)} data-testid="rp-banner">
        <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]", TONES[look.tone].gradient)} aria-hidden>
          <KindIcon className="h-7 w-7" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[18px] font-semibold tracking-tight text-zinc-950">{t(`kinds.${kind}`)}</p>
          <p className="truncate text-[13px] text-zinc-500">
            {formatDay(range.from, locale)} – {formatDay(range.to, locale)}
            {result?.generatedAt ? ` · ${t("generated", { when: formatRelativeTime(result.generatedAt, locale) })}` : ""}
          </p>
        </div>
        {spec.sensitive && canExport ? (
          <span className="flex h-9 items-center gap-1.5 rounded-full bg-white/80 px-3.5 text-[12.5px] font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-900/[0.06]">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden />
            {t("auditedExport")}
          </span>
        ) : null}
      </div>

      {issue === null ? (
        <QueryState
          loading={report.loading && !result}
          loadingVariant="table"
          error={report.error}
          errorTitle={t("loadError")}
          onRetry={() => void report.reload()}
        >
          {result ? (
            <div className="space-y-5">
              <ReportSummary spec={spec} result={result} dimmed={refreshing} />
              {result.rows.length === 0 ? (
                <div className={cn("flex flex-col items-center gap-4 rounded-[28px] border border-zinc-200/60 bg-gradient-to-b px-6 py-14 text-center", TONES.emerald.tint)} data-testid="rp-empty">
                  <span className={cn("flex h-20 w-20 items-center justify-center rounded-[26px]", TONES.emerald.gradient)} aria-hidden>
                    <CircleCheckBig className="h-10 w-10" strokeWidth={1.9} />
                  </span>
                  <div className="max-w-md space-y-1.5">
                    <p className="text-[19px] font-semibold tracking-tight text-zinc-950">{t("empty")}</p>
                    <p className="text-[14px] text-zinc-500">{t("emptyHint")}</p>
                  </div>
                </div>
              ) : (
                <ReportTable key={kind} spec={spec} rows={result.rows} dimmed={refreshing} />
              )}
            </div>
          ) : null}
        </QueryState>
      ) : null}
    </Screen>
  );
}
