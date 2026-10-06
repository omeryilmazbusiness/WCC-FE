"use client";

import { CircleCheckBig, CircleX, Download, ExternalLink, FileUp, Loader2, SkipForward } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PHASE_LOOK, jobPhase, type ImportJob } from "@/entities/importexport";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { formatNumber } from "@/shared/lib/format";
import { Button, StatTile, buttonVariants } from "@/shared/ui";
import { Hero } from "./panel";

const ENTITY_HREF: Partial<Record<ImportJob["entityType"], string>> = {
  customers: routes.customers,
};

type Props = {
  job: ImportJob;
  downloading: boolean;
  onDownloadErrors: () => void;
  onAgain: () => void;
};

/** Step 4: what was written, what failed, and where to go next. */
export function ResultStep({ job, downloading, onDownloadErrors, onAgain }: Props) {
  const t = useTranslations("importExport");
  const locale = useLocale();
  const phase = jobPhase(job);
  const href = job.successCount > 0 ? ENTITY_HREF[job.entityType] : undefined;

  return (
    <div className="space-y-5" data-testid="ie-result-step" data-phase={phase}>
      <Hero look={PHASE_LOOK[phase]} title={t(`resultTitle.${phase}`)} body={job.errorMessage || t(`resultBody.${phase}`)}>
        <div className="flex flex-wrap justify-center gap-2">
          {job.failedCount > 0 ? (
            <Button type="button" variant="secondary" onClick={onDownloadErrors} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
              {t("downloadErrors")}
            </Button>
          ) : null}
          {href ? (
            <Link href={href} className={buttonVariants({ variant: "secondary" })}>
              <ExternalLink className="h-4 w-4" aria-hidden />
              {t("openEntity", { entity: t(`entity.${job.entityType}`) })}
            </Link>
          ) : null}
          <Button type="button" onClick={onAgain} data-testid="ie-again">
            <FileUp className="h-4 w-4" aria-hidden />
            {t("importAnother")}
          </Button>
        </div>
      </Hero>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label={t("countSuccess")} value={formatNumber(job.successCount, locale)} icon={CircleCheckBig} tone="emerald" />
        <StatTile label={t("countFailed")} value={formatNumber(job.failedCount, locale)} icon={CircleX} tone="rose" />
        <StatTile label={t("countSkipped")} value={formatNumber(job.skippedCount, locale)} icon={SkipForward} tone="zinc" />
      </div>
    </div>
  );
}
