"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CalendarRange,
  Check,
  CircleAlert,
  Cloud,
  Download,
  FileSpreadsheet,
  History,
  PlaneTakeoff,
  RefreshCw,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import {
  createImportExportRepository,
  ENTITY_TYPES,
  IMPORT_MODES,
  type FieldDef,
  type ImportEntityType,
  type ImportJob,
  type ImportMode,
} from "@/entities/importexport";
import { FileSyncPanel } from "@/features/file-sync";
import {
  Button,
  EmptyState,
  Screen,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@/shared/ui";
import { cn } from "@/shared/lib/cn";

type Tab = "bring" | "history" | "export" | "sync";
type Step = 1 | 2 | 3;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const ENTITY_META: Record<
  ImportEntityType,
  { icon: LucideIcon; tint: string }
> = {
  customers: {
    icon: Users,
    tint: "bg-sky-50 text-sky-900",
  },
  bookings: {
    icon: CalendarRange,
    tint: "bg-amber-50 text-amber-900",
  },
  payments: {
    icon: Wallet,
    tint: "bg-emerald-50 text-emerald-900",
  },
  departures: {
    icon: PlaneTakeoff,
    tint: "bg-zinc-100 text-zinc-800",
  },
};

export function ImportExportBoard() {
  const t = useTranslations("importExport");
  const { push } = useToast();
  const repo = useMemo(() => createImportExportRepository(), []);
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("bring");
  const [step, setStep] = useState<Step>(1);
  const [entityType, setEntityType] = useState<ImportEntityType>("customers");
  const [mode, setMode] = useState<ImportMode>("upsert");
  const [job, setJob] = useState<ImportJob | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [schemas, setSchemas] = useState<Record<string, FieldDef[]>>({});
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [busy, setBusy] = useState(false);
  const [exportEntity, setExportEntity] =
    useState<ImportEntityType>("customers");
  const [dragOver, setDragOver] = useState(false);

  const fields = schemas[entityType] ?? [];
  const requiredFields = fields.filter((f) => f.required);
  const optionalFields = fields.filter((f) => !f.required);

  const headerOptions = useMemo(() => {
    if (!job) return [] as { selectValue: string; header: string; label: string }[];
    const seen = new Map<string, number>();
    return job.headers.map((h, i) => {
      const base = h.trim() || t("unnamedColumn", { n: i + 1 });
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      return {
        selectValue: `col:${i}`,
        header: h,
        label: count > 1 ? `${base} (${count})` : base,
      };
    });
  }, [job, t]);

  function selectValueForHeader(header: string | undefined) {
    if (!header) return "__none__";
    return (
      headerOptions.find((o) => o.header === header)?.selectValue ?? "__none__"
    );
  }

  function headerFromSelectValue(v: string) {
    if (v === "__none__") return "";
    return headerOptions.find((o) => o.selectValue === v)?.header ?? "";
  }

  const loadMeta = useCallback(async () => {
    const [s, hist] = await Promise.all([repo.schemas(), repo.listJobs()]);
    setSchemas(s);
    setJobs(hist);
  }, [repo]);

  useEffect(() => {
    void loadMeta().catch(() =>
      push({ title: t("loadError"), tone: "error" }),
    );
  }, [loadMeta, push, t]);

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const uploaded = await repo.upload(file, entityType, mode);
      setJob(uploaded);
      setMapping({ ...uploaded.mapping });
      setStep(2);
      push({ title: t("uploaded"), tone: "success" });
      await loadMeta();
    } catch {
      push({ title: t("uploadError"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function goReview() {
    if (!job) return;
    setBusy(true);
    try {
      await repo.setMapping(job.id, mapping, mode);
      const updated = await repo.validate(job.id);
      setJob(updated);
      setStep(3);
      push({ title: t("validated"), tone: "success" });
    } catch {
      push({ title: t("saveError"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    if (!job) return;
    setBusy(true);
    try {
      const updated = await repo.confirm(job.id);
      setJob(updated);
      push({ title: t("confirmed"), tone: "success" });
      await loadMeta();
    } catch {
      push({ title: t("saveError"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function downloadErrors(jobId?: string) {
    const id = jobId ?? job?.id;
    if (!id) return;
    try {
      const blob = await repo.downloadErrors(id);
      downloadBlob(blob, `import-errors-${id.slice(0, 8)}.csv`);
    } catch {
      push({ title: t("downloadError"), tone: "error" });
    }
  }

  async function runExport() {
    setBusy(true);
    try {
      const blob = await repo.exportCsv(exportEntity);
      downloadBlob(blob, `${exportEntity}-export.csv`);
      push({ title: t("exported"), tone: "success" });
    } catch {
      push({ title: t("exportError"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  function resetWizard() {
    setJob(null);
    setMapping({});
    setStep(1);
    if (fileRef.current) fileRef.current.value = "";
  }

  function entityLabel(e: ImportEntityType) {
    if (e === "customers") return t("entityCustomers");
    if (e === "bookings") return t("entityBookings");
    if (e === "payments") return t("entityPayments");
    return t("entityDepartures");
  }

  function modeLabel(m: ImportMode) {
    if (m === "create") return t("modeCreate");
    if (m === "update") return t("modeUpdate");
    return t("modeUpsert");
  }

  function statusLabel(s: string) {
    const map: Record<string, string> = {
      uploaded: t("statusUploaded"),
      mapped: t("statusMapped"),
      validated: t("statusValidated"),
      queued: t("statusQueued"),
      processing: t("statusProcessing"),
      completed: t("statusCompleted"),
      failed: t("statusFailed"),
    };
    return map[s] ?? s;
  }

  const done = job?.status === "completed" || job?.status === "failed";

  const tabs: { id: Tab; icon: LucideIcon; label: string }[] = [
    { id: "bring", icon: Upload, label: t("tabBring") },
    { id: "history", icon: History, label: t("tabHistory") },
    { id: "export", icon: Download, label: t("tabExport") },
    { id: "sync", icon: Cloud, label: t("tabSync") },
  ];

  return (
    <Screen data-testid="import-export-board" className="!space-y-3">
      {/* Compact title row */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            {t("title")}
          </h1>
          <p className="text-[13px] text-zinc-500">
            {`${t("tabBring")} · ${t("tabHistory")} · ${t("tabExport")} · ${t("tabSync")}`}
          </p>
        </div>
        {tab === "bring" ? (
          <ol className="flex items-center gap-1.5">
            {([1, 2, 3] as Step[]).map((n) => (
              <li
                key={n}
                className={cn(
                  "flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] font-bold",
                  step === n
                    ? "bg-sky-600 text-white"
                    : step > n
                      ? "bg-sky-100 text-sky-800"
                      : "bg-zinc-100 text-zinc-400",
                )}
              >
                {step > n ? <Check className="h-3.5 w-3.5" /> : n}
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      {/* One card — everything inside */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_28px_-14px_rgba(15,23,42,0.22)]">
        {/* Symmetric tab bar */}
        <div className="grid grid-cols-2 gap-1 bg-zinc-50 p-1.5 sm:grid-cols-4">
          {tabs.map(({ id, icon: Icon, label }) => {
            const on = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold transition",
                  on
                    ? id === "bring"
                      ? "bg-sky-600 text-white shadow-sm"
                      : id === "export"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : id === "sync"
                          ? "bg-violet-600 text-white shadow-sm"
                          : "bg-zinc-900 text-white shadow-sm"
                    : "text-zinc-500 hover:bg-white hover:text-zinc-800",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                {label}
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-5">
          {/* ——— IMPORT ——— */}
          {tab === "bring" && step === 1 ? (
            <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  {t("chooseType")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ENTITY_TYPES.map((e) => {
                    const meta = ENTITY_META[e];
                    const Icon = meta.icon;
                    const on = entityType === e;
                    return (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setEntityType(e)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-[13px] font-semibold transition",
                          on
                            ? "bg-zinc-950 text-white shadow-sm"
                            : cn(meta.tint, "hover:brightness-[0.97]"),
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            on ? "text-white" : "opacity-90",
                          )}
                          strokeWidth={1.6}
                        />
                        <span className="truncate">{entityLabel(e)}</span>
                      </button>
                    );
                  })}
                </div>

                <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  {t("chooseMode")}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {IMPORT_MODES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={cn(
                        "rounded-xl px-2 py-2 text-center text-[12px] font-semibold leading-tight transition",
                        mode === m
                          ? "bg-sky-600 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                      )}
                    >
                      {modeLabel(m)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  void onFile(e.dataTransfer.files?.[0] ?? null);
                }}
                className={cn(
                  "flex min-h-[168px] flex-col items-center justify-center gap-2 rounded-2xl px-4 transition lg:min-h-full",
                  dragOver ? "bg-sky-100" : "bg-sky-50 hover:bg-sky-100/80",
                )}
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white">
                  <Upload className="h-6 w-6" strokeWidth={1.6} />
                </span>
                <p className="text-[14px] font-semibold text-zinc-900">
                  {t("dropTitle")}
                </p>
                <p className="text-[12px] text-zinc-500">{t("dropHint")}</p>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              />
            </div>
          ) : null}

          {tab === "bring" && step === 2 && job ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <FileSpreadsheet className="h-4 w-4" strokeWidth={1.6} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-zinc-900">
                    {job.fileName}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {t("rowCount", { count: job.totalRows })} ·{" "}
                    {entityLabel(job.entityType)}
                  </p>
                </div>
              </div>

              <div className="grid max-h-[280px] gap-1.5 overflow-y-auto sm:grid-cols-2">
                {[...requiredFields, ...optionalFields].map((f) => (
                  <div
                    key={f.key}
                    className="flex items-center gap-2 rounded-xl bg-zinc-50 px-2.5 py-1.5"
                  >
                    <span className="w-[40%] truncate text-[12px] font-semibold text-zinc-800">
                      {f.label}
                      {f.required ? (
                        <span className="text-sky-600"> *</span>
                      ) : null}
                    </span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-zinc-300" />
                    <Select
                      value={selectValueForHeader(mapping[f.key])}
                      onValueChange={(v) =>
                        setMapping((m) => ({
                          ...m,
                          [f.key]: headerFromSelectValue(v),
                        }))
                      }
                    >
                      <SelectTrigger className="h-8 flex-1 border-0 bg-white text-[12px] shadow-none">
                        <SelectValue placeholder={t("unmap")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("unmap")}</SelectItem>
                        {headerOptions.map((opt) => (
                          <SelectItem
                            key={opt.selectValue}
                            value={opt.selectValue}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="secondary" onClick={resetWizard}>
                  <RefreshCw className="me-1.5 h-3.5 w-3.5" />
                  {t("startOver")}
                </Button>
                <Button size="sm" disabled={busy} onClick={() => void goReview()}>
                  {t("continueReview")}
                  <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : null}

          {tab === "bring" && step === 3 && job ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <Check className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-zinc-900">
                    {done ? t("resultTitle") : t("readyTitle")}
                  </p>
                  <p className="text-[12px] text-zinc-400">
                    {job.fileName} · {statusLabel(job.status)}
                  </p>
                </div>
              </div>

              {!done ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-md text-[13px] text-zinc-600">
                    {t("readyBody", {
                      count: job.totalRows,
                      entity: entityLabel(job.entityType),
                      mode: modeLabel(mode),
                    })}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setStep(2)}>
                      {t("backMatch")}
                    </Button>
                    <Button size="sm" disabled={busy} onClick={() => void runImport()}>
                      {t("confirmImport")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <MiniStat
                      icon={Check}
                      label={t("countSuccess")}
                      value={job.successCount}
                      className="bg-emerald-50 text-emerald-800"
                    />
                    <MiniStat
                      icon={CircleAlert}
                      label={t("countFailed")}
                      value={job.failedCount}
                      className="bg-rose-50 text-rose-800"
                    />
                    <MiniStat
                      icon={ArrowRight}
                      label={t("countSkipped")}
                      value={job.skippedCount}
                      className="bg-zinc-100 text-zinc-600"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    {job.failedCount > 0 ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void downloadErrors()}
                      >
                        <Download className="me-1.5 h-3.5 w-3.5" />
                        {t("downloadErrors")}
                      </Button>
                    ) : null}
                    <Button size="sm" onClick={resetWizard}>
                      {t("startOver")}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {/* ——— HISTORY ——— */}
          {tab === "history" ? (
            jobs.length === 0 ? (
              <EmptyState title={t("historyEmpty")} />
            ) : (
              <ul
                className="max-h-[340px] space-y-0.5 overflow-y-auto"
                data-testid="import-history"
              >
                {jobs.map((j) => {
                  const meta = ENTITY_META[j.entityType] ?? ENTITY_META.customers;
                  const Icon = meta.icon;
                  return (
                    <li
                      key={j.id}
                      className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-xl px-2 py-2 hover:bg-zinc-50"
                    >
                      <span
                        className={cn(
                          "inline-flex h-9 w-9 items-center justify-center rounded-xl",
                          meta.tint,
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.6} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-zinc-900">
                          {j.fileName}
                        </p>
                        <p className="truncate text-[11px] text-zinc-400">
                          {entityLabel(j.entityType)} ·{" "}
                          {t("rowCount", { count: j.totalRows })} ·{" "}
                          {statusLabel(j.status)}
                        </p>
                      </div>
                      <span className="text-[12px] font-semibold tabular-nums text-zinc-500">
                        {j.successCount}/{j.failedCount}
                      </span>
                      {j.failedCount > 0 ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          aria-label={t("downloadErrors")}
                          onClick={() => void downloadErrors(j.id)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <span className="w-8" />
                      )}
                    </li>
                  );
                })}
              </ul>
            )
          ) : null}

          {/* ——— EXPORT ——— */}
          {tab === "export" ? (
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  {t("exportTitle")}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ENTITY_TYPES.map((e) => {
                    const meta = ENTITY_META[e];
                    const Icon = meta.icon;
                    const on = exportEntity === e;
                    return (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setExportEntity(e)}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[13px] font-semibold transition",
                          on
                            ? "bg-zinc-950 text-white shadow-sm"
                            : meta.tint,
                        )}
                      >
                        <Icon
                          className={cn("h-4 w-4", on && "text-white")}
                          strokeWidth={1.6}
                        />
                        {entityLabel(e)}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[12px] text-zinc-400">{t("exportHint")}</p>
              </div>
              <Button disabled={busy} onClick={() => void runExport()}>
                <Download className="me-1.5 h-4 w-4" />
                {t("exportCsv")}
              </Button>
            </div>
          ) : null}

          {/* ——— FILE SYNC ——— */}
          {tab === "sync" ? <FileSyncPanel /> : null}
        </div>
      </div>
    </Screen>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5", className)}>
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.7} />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium opacity-70">{label}</p>
        <p className="text-lg font-semibold tabular-nums leading-none">{value}</p>
      </div>
    </div>
  );
}
