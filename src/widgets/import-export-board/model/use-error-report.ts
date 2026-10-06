"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import type { ImportExportRepository } from "@/entities/importexport";
import { saveBlob } from "@/shared/lib/download";
import { useMutationFeedback } from "@/shared/ui";

/** Downloads the row-error CSV of an import job; `pending` is the job id being fetched. */
export function useErrorReport(repo: ImportExportRepository) {
  const t = useTranslations("importExport");
  const feedback = useMutationFeedback();
  const [pending, setPending] = useState<string | null>(null);

  const download = useCallback(
    async (jobId: string) => {
      setPending(jobId);
      try {
        saveBlob(await repo.downloadErrors(jobId), `import-errors-${jobId.slice(0, 8)}.csv`);
      } catch (err) {
        feedback.error(err, t("downloadError"));
      } finally {
        setPending(null);
      }
    },
    [feedback, repo, t],
  );

  return { download, pending };
}
