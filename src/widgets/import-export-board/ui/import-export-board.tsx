"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  SECTION_LOOK,
  createImportExportRepository,
  summarizeJobs,
  type FieldDef,
  type ImportExportRepository,
  type ImportJob,
  type Section,
} from "@/entities/importexport";
import { useCan } from "@/entities/viewer";
import { formatNumber } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { PageHeader, QueryState, Screen } from "@/shared/ui";
import { useImportWizard } from "../model/use-import-wizard";
import { useSectionParam } from "../model/use-section-param";
import { ChoiceGrid } from "./choice-grid";
import { ExportPanel } from "./export-panel";
import { HistoryPanel } from "./history-panel";
import { ImportWizard } from "./import-wizard";

type Props = { repository?: ImportExportRepository };

const NO_SCHEMAS: Record<string, FieldDef[]> = {};

/** Import/export hub: guided CSV/Excel import, dataset exports and job history. */
export function ImportExportBoard({ repository }: Props) {
  const t = useTranslations("importExport");
  const locale = useLocale();
  const [repo] = useState(() => repository ?? createImportExportRepository());
  const canWrite = useCan("imports.write");

  const allowed = useMemo<Section[]>(
    () => [...(canWrite ? (["import", "export"] as const) : []), "history"],
    [canWrite],
  );
  const [section, setSection] = useSectionParam(allowed);

  const schemas = useApiQuery(() => repo.schemas(), [repo], { cacheKey: ["import-schemas"] });
  const jobs = useApiQuery(() => repo.listJobs(), [repo], { cacheKey: ["import-jobs"] });
  const { refresh: refreshJobs } = jobs;
  const onJobsChanged = useCallback(() => void refreshJobs(), [refreshJobs]);

  const wizard = useImportWizard({ repo, schemas: schemas.data ?? NO_SCHEMAS, onJobsChanged });
  const { resume } = wizard;
  const onResume = useCallback(
    (job: ImportJob) => {
      resume(job);
      setSection("import");
    },
    [resume, setSection],
  );

  const summary = summarizeJobs(jobs.data ?? []);
  const hints: Record<Section, string> = {
    import: t("sectionHint.import"),
    export: t("sectionHint.export"),
    history: summary.total
      ? t("sectionHint.historyCount", { count: summary.total, formatted: formatNumber(summary.total, locale) })
      : t("sectionHint.history"),
  };

  return (
    <Screen data-testid="import-export-board">
      <PageHeader title={t("title")} description={t("subtitle")} />

      {section ? (
        <ChoiceGrid
          label={t("sectionsLabel")}
          value={section}
          onChange={setSection}
          className="grid-cols-1 sm:grid-cols-3"
          data-testid="ie-sections"
          choices={allowed.map((s) => ({
            value: s,
            look: SECTION_LOOK[s],
            title: t(`section.${s}`),
            hint: hints[s],
            badge: s === "history" && summary.attention ? t("attentionBadge", { formatted: formatNumber(summary.attention, locale) }) : undefined,
          }))}
        />
      ) : null}

      {section === "import" || section === "export" ? (
        <QueryState
          loading={schemas.loading && !schemas.data}
          error={schemas.error}
          errorTitle={t("loadError")}
          onRetry={() => void schemas.reload()}
        >
          {schemas.data ? (
            section === "import" ? <ImportWizard repo={repo} wizard={wizard} /> : <ExportPanel repo={repo} schemas={schemas.data} />
          ) : null}
        </QueryState>
      ) : null}

      {section === "history" ? (
        <HistoryPanel
          repo={repo}
          jobs={jobs.data ?? []}
          loading={jobs.loading}
          error={jobs.error}
          canResume={canWrite}
          onReload={() => void jobs.reload()}
          onRefresh={() => void jobs.refresh()}
          onResume={onResume}
        />
      ) : null}

    </Screen>
  );
}
