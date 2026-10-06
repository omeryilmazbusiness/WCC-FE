"use client";

import { useState } from "react";
import { Download, EyeOff, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  ENTITY_LOOK,
  ENTITY_TYPES,
  SECTION_LOOK,
  exportFileName,
  type FieldDef,
  type ImportEntityType,
  type ImportExportRepository,
} from "@/entities/importexport";
import { useCan } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";
import { saveBlob } from "@/shared/lib/download";
import { formatNumber } from "@/shared/lib/format";
import { Button, TONES, useMutationFeedback, useToast } from "@/shared/ui";
import { ChoiceGrid } from "./choice-grid";
import { GroupLabel, Panel } from "./panel";
import { useFieldLabel } from "./use-field-label";

const PII_FIELDS = new Set(["passport_no"]);
/** Server-side cap of `POST /exports`. */
const EXPORT_ROW_LIMIT = 10_000;

type Props = { repo: ImportExportRepository; schemas: Record<string, FieldDef[]> };

/** Export section: pick a dataset, see its columns, download a UTF-8 CSV (Excel-ready). */
export function ExportPanel({ repo, schemas }: Props) {
  const t = useTranslations("importExport");
  const locale = useLocale();
  const fieldLabel = useFieldLabel();
  const { push } = useToast();
  const feedback = useMutationFeedback();
  const canSeePii = useCan("pii.read");
  const [entity, setEntity] = useState<ImportEntityType>("customers");
  const [busy, setBusy] = useState(false);
  const columns = schemas[entity] ?? [];
  const masked = !canSeePii && columns.some((c) => PII_FIELDS.has(c.key));
  const tone = ENTITY_LOOK[entity].tone;

  async function run() {
    setBusy(true);
    try {
      saveBlob(await repo.exportCsv(entity), exportFileName(entity, new Date().toLocaleDateString("en-CA")));
      push({ title: t("exported"), tone: "success" });
    } catch (err) {
      feedback.error(err, t("exportError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      look={SECTION_LOOK.export}
      title={t("exportTitle")}
      description={t("exportSubtitle", { formatted: formatNumber(EXPORT_ROW_LIMIT, locale) })}
      data-testid="ie-export"
      actions={
        <Button type="button" onClick={() => void run()} disabled={busy || columns.length === 0} data-testid="ie-export-run">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
          {t("exportCsv", { entity: t(`entity.${entity}`) })}
        </Button>
      }
    >
      <div className="space-y-6">
        <ChoiceGrid
          label={t("exportPick")}
          value={entity}
          onChange={setEntity}
          className="grid-cols-2 xl:grid-cols-4"
          data-testid="ie-export-entities"
          choices={ENTITY_TYPES.map((e) => ({
            value: e,
            look: ENTITY_LOOK[e],
            title: t(`entity.${e}`),
            hint: t("columnCount", { count: schemas[e]?.length ?? 0, formatted: formatNumber(schemas[e]?.length ?? 0, locale) }),
          }))}
        />

        <div className={cn("rounded-[24px] border border-zinc-200/60 bg-gradient-to-br p-5", TONES[tone].tint)}>
          <GroupLabel>{t("exportColumns")}</GroupLabel>
          <ul className="flex flex-wrap gap-1.5" data-testid="ie-export-columns">
            {columns.map((c) => (
              <li key={c.key} className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold text-zinc-700 ring-1 ring-inset ring-zinc-900/[0.06]">
                {PII_FIELDS.has(c.key) && masked ? <EyeOff className="h-3.5 w-3.5 text-zinc-400" aria-hidden /> : null}
                {fieldLabel(c)}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12.5px] leading-relaxed text-zinc-500">{t("exportHint")}</p>
          {masked ? (
            <p className="mt-2 flex items-center gap-2 text-[12.5px] font-medium text-zinc-600" data-testid="ie-export-masked">
              <EyeOff className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
              {t("exportMasked")}
            </p>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
