"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ColumnOption, ImportJob } from "@/entities/importexport";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";

const PREVIEW_ROWS = 5;

type Props = {
  job: Pick<ImportJob, "previewRows" | "totalRows">;
  options: ColumnOption[];
  /** Header → localised field name, for columns that are matched. */
  matched: Map<string, string>;
};

/** First rows of the uploaded file; matched columns are highlighted with their target field. */
export function FilePreview({ job, options, matched }: Props) {
  const t = useTranslations("importExport");
  const locale = useLocale();
  const rows = job.previewRows.slice(0, PREVIEW_ROWS);
  if (rows.length === 0) return null;
  return (
    <details className="group rounded-[20px] border border-zinc-200/60 bg-white" data-testid="ie-preview">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[13px] font-semibold text-zinc-800">
        {t("previewTitle", { shown: formatNumber(rows.length, locale), total: formatNumber(job.totalRows, locale) })}
        <span className="text-[12px] font-medium text-zinc-400 group-open:hidden">{t("previewShow")}</span>
        <span className="hidden text-[12px] font-medium text-zinc-400 group-open:inline">{t("previewHide")}</span>
      </summary>
      <div className="overflow-x-auto border-t border-zinc-100">
        <table className="w-full min-w-max text-[12.5px]">
          <thead>
            <tr>
              {options.map((o) => {
                const field = matched.get(o.header);
                return (
                  <th key={o.value} scope="col" className={cn("px-3 py-2 text-start align-bottom font-semibold", field ? "bg-sky-50 text-sky-900" : "text-zinc-500")}>
                    <span className="block">{o.label}</span>
                    {field ? <span className="block text-[10.5px] font-medium text-sky-600">→ {field}</span> : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-t border-zinc-100">
                {options.map((o) => (
                  <td key={o.value} className={cn("max-w-[220px] truncate px-3 py-2 text-zinc-700", matched.has(o.header) && "bg-sky-50/40")}>
                    {row[o.index] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
