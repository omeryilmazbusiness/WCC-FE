"use client";

import { ArrowLeft, CircleCheckBig, Download, Loader2, Rows3, Rocket, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ENTITY_LOOK, MODE_LOOK, type ImportJob, type ImportMode } from "@/entities/importexport";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { Button, StatTile, TONES } from "@/shared/ui";

type Props = {
  job: ImportJob;
  mode: ImportMode;
  busy: boolean;
  downloading: boolean;
  onDownloadErrors: () => void;
  onBack: () => void;
  onConfirm: () => void;
};

/** Step 3: validation outcome and the final go — nothing is written before this. */
export function ReviewStep({ job, mode, busy, downloading, onDownloadErrors, onBack, onConfirm }: Props) {
  const t = useTranslations("importExport");
  const locale = useLocale();
  const issues = job.failedCount;
  const clean = issues === 0;
  const entityName = t(`entity.${job.entityType}`);

  return (
    <div className="space-y-5" data-testid="ie-review-step">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label={t("reviewRows")} value={formatNumber(job.totalRows, locale)} icon={Rows3} tone={ENTITY_LOOK[job.entityType].tone} caption={entityName} />
        <StatTile
          label={t("reviewIssues")}
          value={formatNumber(issues, locale)}
          icon={clean ? CircleCheckBig : TriangleAlert}
          tone={clean ? "emerald" : "rose"}
          caption={clean ? t("reviewClean") : t("reviewIssuesCaption")}
          data-testid="ie-issues"
        />
        <StatTile label={t("reviewMode")} value={t(`mode.${mode}`)} icon={MODE_LOOK[mode].icon} tone={MODE_LOOK[mode].tone} caption={t(`modeHint.${mode}`)} />
      </div>

      {clean ? (
        <div className={cn("flex items-center gap-3 rounded-[20px] bg-gradient-to-br px-4 py-3.5 text-[13.5px] text-emerald-900", TONES.emerald.tint)}>
          <CircleCheckBig className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          {t("readyBody", { count: job.totalRows, formatted: formatNumber(job.totalRows, locale), entity: entityName })}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-[20px] bg-amber-50 px-4 py-3.5 text-[13.5px] text-amber-900" data-testid="ie-issues-note">
          <TriangleAlert className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <span className="min-w-0 flex-1">{t("issuesBody", { count: issues, formatted: formatNumber(issues, locale) })}</span>
          <Button type="button" size="sm" variant="secondary" onClick={onDownloadErrors} disabled={downloading}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
            {t("downloadErrors")}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-5">
        <Button type="button" variant="secondary" onClick={onBack} disabled={busy}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
          {t("backMatch")}
        </Button>
        <Button type="button" onClick={onConfirm} disabled={busy} data-testid="ie-confirm">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Rocket className="h-4 w-4" aria-hidden />}
          {busy ? t("importing") : t("confirmImport", { formatted: formatNumber(job.totalRows, locale) })}
        </Button>
      </div>
    </div>
  );
}
