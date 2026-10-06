"use client";

import { CircleCheckBig, CircleX, Download, Loader2, Play, SkipForward } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ENTITY_LOOK, PHASE_LOOK, jobPhase, resumeStep, type ImportJob } from "@/entities/importexport";
import { cn } from "@/shared/lib/cn";
import { formatDateTime, formatNumber, formatRelativeTime } from "@/shared/lib/format";
import { Button, TONES } from "@/shared/ui";

type Props = {
  job: ImportJob;
  canResume: boolean;
  downloading: boolean;
  onResume: (job: ImportJob) => void;
  onDownloadErrors: (id: string) => void;
};

/** One import job: what, when, outcome counts and the follow-up actions it allows. */
export function JobRow({ job, canResume, downloading, onResume, onDownloadErrors }: Props) {
  const t = useTranslations("importExport");
  const locale = useLocale();
  const phase = jobPhase(job);
  const look = ENTITY_LOOK[job.entityType] ?? ENTITY_LOOK.customers;
  const phaseLook = PHASE_LOOK[phase];
  const Icon = look.icon;
  const PhaseIcon = phaseLook.icon;
  const finished = phase === "done" || phase === "partial" || phase === "failed";
  const resumable = canResume && resumeStep(job) !== null;

  return (
    <li className="flex flex-wrap items-center gap-4 rounded-[22px] border border-zinc-200/60 bg-white p-4 transition hover:shadow-[0_14px_30px_-24px_rgba(15,23,42,0.45)]" data-testid="ie-job" data-phase={phase}>
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", TONES[look.tone].soft)} aria-hidden>
        <Icon className="h-6 w-6" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[14px] font-semibold text-zinc-950">{job.fileName || t("untitledFile")}</p>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", TONES[phaseLook.tone].soft)}>
            <PhaseIcon className={cn("h-3 w-3", phase === "running" && "animate-spin")} aria-hidden />
            {t(`phase.${phase}`)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[12.5px] text-zinc-500">
          {t(`entity.${job.entityType}`)} · {t(`mode.${job.mode}`)} · {t("rowCount", { count: job.totalRows, formatted: formatNumber(job.totalRows, locale) })}
          {job.createdAt ? (
            <>
              {" · "}
              <time dateTime={job.createdAt} title={formatDateTime(job.createdAt, locale)}>
                {formatRelativeTime(job.createdAt, locale)}
              </time>
            </>
          ) : null}
        </p>
        {job.errorMessage ? <p className="mt-1 line-clamp-2 text-[12px] font-medium text-rose-600">{job.errorMessage}</p> : null}
      </div>

      {finished ? (
        <div className="flex items-center gap-1.5 text-[12px] font-semibold tabular-nums">
          <Count icon={CircleCheckBig} tone="emerald" value={formatNumber(job.successCount, locale)} label={t("countSuccess")} />
          <Count icon={CircleX} tone="rose" value={formatNumber(job.failedCount, locale)} label={t("countFailed")} />
          <Count icon={SkipForward} tone="zinc" value={formatNumber(job.skippedCount, locale)} label={t("countSkipped")} />
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        {resumable ? (
          <Button type="button" size="sm" onClick={() => onResume(job)} data-testid="ie-job-resume">
            <Play className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
            {t("resume")}
          </Button>
        ) : null}
        {job.failedCount > 0 ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => onDownloadErrors(job.id)} disabled={downloading} aria-label={t("downloadErrors")} title={t("downloadErrors")}>
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Download className="h-3.5 w-3.5" aria-hidden />}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function Count({ icon: Icon, tone, value, label }: { icon: typeof CircleX; tone: "emerald" | "rose" | "zinc"; value: string; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1", TONES[tone].soft)} title={label}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">{label}: </span>
      {value}
    </span>
  );
}
