"use client";

import { useRef, useState } from "react";
import { FileDown, FileUp, Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  ACCEPT_ATTR,
  ENTITY_LOOK,
  ENTITY_TYPES,
  IMPORT_MODES,
  MAX_UPLOAD_MB,
  MODE_LOOK,
  isImportable,
  sampleCsv,
  sampleFileName,
  type FieldDef,
  type ImportEntityType,
  type ImportMode,
} from "@/entities/importexport";
import { cn } from "@/shared/lib/cn";
import { saveBlob } from "@/shared/lib/download";
import { Button, TONES } from "@/shared/ui";
import { ChoiceGrid } from "./choice-grid";
import { GroupLabel } from "./panel";
import { useFieldLabel } from "./use-field-label";

type Props = {
  entity: ImportEntityType;
  mode: ImportMode;
  fields: FieldDef[];
  uploading: boolean;
  onEntity: (entity: ImportEntityType) => void;
  onMode: (mode: ImportMode) => void;
  onFile: (file: File) => void;
};

/** Step 1: what to import, how to treat existing records, and the file itself. */
export function UploadStep({ entity, mode, fields, uploading, onEntity, onMode, onFile }: Props) {
  const t = useTranslations("importExport");
  const fieldLabel = useFieldLabel();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const required = fields.filter((f) => f.required);

  function pick(files: FileList | null) {
    const file = files?.[0];
    if (file) onFile(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-6" data-testid="ie-upload-step">
      <div>
        <GroupLabel>{t("chooseType")}</GroupLabel>
        <ChoiceGrid
          label={t("chooseType")}
          value={entity}
          onChange={onEntity}
          className="grid-cols-2 xl:grid-cols-4"
          data-testid="ie-entities"
          choices={ENTITY_TYPES.map((e) => ({
            value: e,
            look: ENTITY_LOOK[e],
            title: t(`entity.${e}`),
            hint: isImportable(e) ? t(`entityHint.${e}`) : t("exportOnlyHint"),
            badge: isImportable(e) ? undefined : t("exportOnly"),
            disabled: !isImportable(e),
          }))}
        />
      </div>

      <div>
        <GroupLabel>{t("chooseMode")}</GroupLabel>
        <ChoiceGrid
          label={t("chooseMode")}
          value={mode}
          onChange={onMode}
          size="md"
          className="sm:grid-cols-3"
          data-testid="ie-modes"
          choices={IMPORT_MODES.map((m) => ({
            value: m,
            look: MODE_LOOK[m],
            title: t(`mode.${m}`),
            hint: t(`modeHint.${m}`),
          }))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pick(e.dataTransfer.files);
          }}
          className={cn(
            "group flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed bg-gradient-to-b px-6 text-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-wait",
            dragOver ? "scale-[1.01] border-sky-400 from-sky-100 to-sky-50" : "border-sky-200 from-sky-50/80 to-white hover:border-sky-300",
          )}
          data-testid="ie-dropzone"
        >
          <span className={cn("flex h-20 w-20 items-center justify-center rounded-[26px] transition-transform duration-300 group-hover:-translate-y-1", TONES.sky.gradient)} aria-hidden>
            {uploading ? <Loader2 className="h-10 w-10 animate-spin" strokeWidth={1.9} /> : <FileUp className="h-10 w-10" strokeWidth={1.9} />}
          </span>
          <span className="text-[17px] font-semibold tracking-tight text-zinc-950">{uploading ? t("uploading") : t("dropTitle")}</span>
          <span className="text-[13px] text-zinc-500">{t("dropHint", { max: MAX_UPLOAD_MB })}</span>
        </button>
        <input ref={inputRef} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => pick(e.target.files)} data-testid="ie-file" />

        <aside className={cn("flex flex-col gap-4 rounded-[24px] border border-zinc-200/60 bg-gradient-to-br p-5", TONES.indigo.tint)}>
          <div className="flex items-center gap-3">
            <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", TONES.indigo.soft)} aria-hidden>
              <ShieldCheck className="h-5 w-5" strokeWidth={2} />
            </span>
            <p className="text-[14px] font-semibold text-zinc-950">{t("requiredTitle")}</p>
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {required.map((f) => (
              <li key={f.key} className="rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-zinc-700 ring-1 ring-inset ring-zinc-900/[0.06]">
                {fieldLabel(f)}
              </li>
            ))}
          </ul>
          <p className="text-[12px] leading-relaxed text-zinc-500">{t("requiredHint")}</p>
          <Button
            type="button"
            variant="secondary"
            className="mt-auto"
            disabled={fields.length === 0}
            onClick={() => saveBlob(new Blob([sampleCsv(fields)], { type: "text/csv;charset=utf-8" }), sampleFileName(entity))}
            data-testid="ie-sample"
          >
            <FileDown className="h-4 w-4" aria-hidden />
            {t("downloadSample")}
          </Button>
        </aside>
      </div>
    </div>
  );
}
