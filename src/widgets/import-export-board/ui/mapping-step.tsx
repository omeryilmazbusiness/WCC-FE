"use client";

import { useMemo } from "react";
import { ArrowLeft, ArrowRight, CircleAlert, FileSpreadsheet, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  UNMAPPED,
  columnOptions,
  duplicateTargets,
  fieldTypeIcon,
  headerForValue,
  mappingStatus,
  optionValueFor,
  sampleFor,
  type FieldDef,
  type ImportExportRepository,
  type ImportJob,
} from "@/entities/importexport";
import { cn } from "@/shared/lib/cn";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, TONES } from "@/shared/ui";
import { FilePreview } from "./file-preview";
import { TemplateBar } from "./template-bar";
import { useFieldLabel } from "./use-field-label";

type Props = {
  repo: ImportExportRepository;
  job: ImportJob;
  fields: FieldDef[];
  mapping: Record<string, string>;
  busy: boolean;
  onField: (key: string, header: string) => void;
  onMapping: (mapping: Record<string, string>) => void;
  onBack: () => void;
  onContinue: () => void;
};

/** Step 2: point every field at a file column, with live samples and required-field checks. */
export function MappingStep({ repo, job, fields, mapping, busy, onField, onMapping, onBack, onContinue }: Props) {
  const t = useTranslations("importExport");
  const locale = useLocale();
  const fieldLabel = useFieldLabel();
  const options = useMemo(() => columnOptions(job.headers, (n) => t("unnamedColumn", { n })), [job.headers, t]);
  const status = mappingStatus(fields, mapping, job.headers);
  const duplicates = duplicateTargets(mapping);
  const pct = status.total ? Math.round((status.mapped / status.total) * 100) : 0;
  const ordered = [...fields.filter((f) => f.required), ...fields.filter((f) => !f.required)];
  const matched = new Map<string, string>();
  for (const f of fields) if (mapping[f.key]) matched.set(mapping[f.key], fieldLabel(f));

  return (
    <div className="space-y-5" data-testid="ie-mapping-step">
      <div className={cn("flex flex-wrap items-center gap-4 rounded-[24px] border border-zinc-200/60 bg-gradient-to-br p-4", TONES.amber.tint)}>
        <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]", TONES.amber.gradient)} aria-hidden>
          <FileSpreadsheet className="h-7 w-7" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold tracking-tight text-zinc-950">{job.fileName}</p>
          <p className="text-[13px] text-zinc-500">
            {t("fileStats", {
              rows: job.totalRows,
              rowsFormatted: formatNumber(job.totalRows, locale),
              columns: job.headers.length,
              columnsFormatted: formatNumber(job.headers.length, locale),
            })}
          </p>
        </div>
        <div className="w-full min-w-[200px] sm:w-56" data-testid="ie-progress">
          <div className="mb-1.5 flex items-baseline justify-between text-[12px] font-semibold text-zinc-600">
            <span>{t("matchedCount", { mapped: formatNumber(status.mapped, locale), total: formatNumber(status.total, locale) })}</span>
            <span className="tabular-nums">{formatPercent(pct, locale, 0)}</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-inset ring-zinc-900/[0.06]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={status.total}
            aria-valuenow={status.mapped}
            aria-label={t("matchedCount", { mapped: status.mapped, total: status.total })}
          >
            <div className={cn("h-full rounded-full transition-all duration-500", status.ready ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <TemplateBar repo={repo} entity={job.entityType} fields={fields} headers={job.headers} mapping={mapping} onApply={onMapping} />

      {status.requiredMissing.length > 0 ? (
        <div role="status" className="flex items-start gap-3 rounded-[20px] bg-rose-50 px-4 py-3 text-[13px] text-rose-800" data-testid="ie-missing">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {t("requiredMissing", {
              fields: new Intl.ListFormat(locale, { type: "conjunction" }).format(
                status.requiredMissing.map((k) => fieldLabel(fields.find((f) => f.key === k) ?? { key: k, label: k })),
              ),
            })}
          </span>
        </div>
      ) : null}

      <ul className="grid gap-2.5 md:grid-cols-2" data-testid="ie-fields">
        {ordered.map((f) => {
          const header = mapping[f.key];
          const sample = sampleFor(job, header);
          const Icon = fieldTypeIcon(f.type);
          const missing = f.required && !header;
          const dup = header ? duplicates.has(header) : false;
          return (
            <li
              key={f.key}
              className={cn(
                "flex items-center gap-3 rounded-[20px] border bg-white p-3 transition",
                missing ? "border-rose-200 bg-rose-50/40" : header ? "border-emerald-200/70" : "border-zinc-200/70",
              )}
              data-testid="ie-field"
              data-field={f.key}
            >
              <span
                className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", header ? TONES.emerald.soft : missing ? TONES.rose.soft : TONES.zinc.soft)}
                aria-hidden
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span id={`ie-f-${f.key}`} className="truncate text-[13.5px] font-semibold text-zinc-900">
                    {fieldLabel(f)}
                  </span>
                  {f.required ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10.5px] font-semibold text-sky-700">{t("required")}</span> : null}
                </div>
                <Select value={optionValueFor(options, header)} onValueChange={(v) => onField(f.key, headerForValue(options, v))}>
                  <SelectTrigger className="h-9 bg-zinc-50 text-[13px]" aria-labelledby={`ie-f-${f.key}`}>
                    <SelectValue placeholder={t("unmap")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNMAPPED}>{t("unmap")}</SelectItem>
                    {options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className={cn("truncate text-[11.5px]", dup ? "font-semibold text-amber-700" : "text-zinc-400")}>
                  {dup
                    ? t("duplicateColumn")
                    : header
                      ? sample
                        ? t.rich("sample", { value: sample, bdi: (chunks) => <bdi>{chunks}</bdi> })
                        : t("sampleEmpty")
                      : missing
                        ? t("pickColumn")
                        : t("optional")}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <FilePreview job={job} options={options} matched={matched} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-5">
        <Button type="button" variant="secondary" onClick={onBack} disabled={busy}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
          {t("startOver")}
        </Button>
        <Button type="button" onClick={onContinue} disabled={busy || !status.ready} data-testid="ie-continue">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {t("continueReview")}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
