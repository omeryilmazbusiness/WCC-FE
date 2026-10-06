import type { FieldDef, ImportEntityType, ImportJob, MappingTemplate } from "../model";

/**
 * Entities whose rows the API actually applies. Mirrors `importexport.Importable` on the API;
 * every other entity is export-only and the API rejects uploads for it.
 */
export const IMPORTABLE_ENTITY_TYPES: readonly ImportEntityType[] = ["customers"];

export function isImportable(entity: ImportEntityType): boolean {
  return IMPORTABLE_ENTITY_TYPES.includes(entity);
}

/** Mirrors `importexport.MaxUploadBytes`. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / (1024 * 1024);

export const ACCEPTED_EXTENSIONS = [".csv", ".xlsx"] as const;
export const ACCEPT_ATTR = [
  ...ACCEPTED_EXTENSIONS,
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
].join(",");

export type FileIssue = "type" | "size" | "empty";

/** Client-side gate before uploading; the API repeats every check. */
export function fileIssue(name: string, size: number): FileIssue | null {
  const lower = name.trim().toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) return "type";
  if (size <= 0) return "empty";
  if (size > MAX_UPLOAD_BYTES) return "size";
  return null;
}

export const UNMAPPED = "__none__";

export type ColumnOption = { value: string; header: string; label: string; index: number };

/**
 * One select option per file column. Values are positional (`col:<i>`) so duplicate or blank
 * headers stay distinguishable; labels get a counter suffix for repeats.
 */
export function columnOptions(headers: readonly string[], unnamed: (n: number) => string): ColumnOption[] {
  const seen = new Map<string, number>();
  return headers.map((header, index) => {
    const base = header.trim() || unnamed(index + 1);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return { value: `col:${index}`, header, label: count > 1 ? `${base} (${count})` : base, index };
  });
}

export function optionValueFor(options: readonly ColumnOption[], header: string | undefined): string {
  if (!header) return UNMAPPED;
  return options.find((o) => o.header === header)?.value ?? UNMAPPED;
}

export function headerForValue(options: readonly ColumnOption[], value: string): string {
  if (value === UNMAPPED) return "";
  return options.find((o) => o.value === value)?.header ?? "";
}

/** Keeps only known fields that point at a column present in the file. */
export function cleanMapping(
  fields: readonly FieldDef[],
  mapping: Readonly<Record<string, string>>,
  headers: readonly string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    const header = mapping[f.key];
    if (header && headers.includes(header)) out[f.key] = header;
  }
  return out;
}

export type MappingStatus = {
  mapped: number;
  total: number;
  requiredMissing: string[];
  ready: boolean;
};

export function mappingStatus(
  fields: readonly FieldDef[],
  mapping: Readonly<Record<string, string>>,
  headers: readonly string[],
): MappingStatus {
  const clean = cleanMapping(fields, mapping, headers);
  const requiredMissing = fields.filter((f) => f.required && !clean[f.key]).map((f) => f.key);
  const mapped = Object.keys(clean).length;
  return { mapped, total: fields.length, requiredMissing, ready: mapped > 0 && requiredMissing.length === 0 };
}

/** Columns used by more than one field — almost always a mistake worth flagging. */
export function duplicateTargets(mapping: Readonly<Record<string, string>>): Set<string> {
  const counts = new Map<string, number>();
  for (const header of Object.values(mapping)) {
    if (header) counts.set(header, (counts.get(header) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, n]) => n > 1).map(([h]) => h));
}

/** First non-blank preview value of a column, so users can check a match at a glance. */
export function sampleFor(job: Pick<ImportJob, "headers" | "previewRows">, header: string | undefined): string {
  if (!header) return "";
  const index = job.headers.indexOf(header);
  if (index < 0) return "";
  for (const row of job.previewRows) {
    const value = (row[index] ?? "").trim();
    if (value) return value;
  }
  return "";
}

/** Applies a saved template; entries pointing at columns missing from this file are dropped. */
export function applyTemplate(
  fields: readonly FieldDef[],
  headers: readonly string[],
  template: Pick<MappingTemplate, "mapping">,
): { mapping: Record<string, string>; applied: number } {
  const mapping = cleanMapping(fields, template.mapping, headers);
  return { mapping, applied: Object.keys(mapping).length };
}

export function sameMapping(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): boolean {
  const ka = Object.keys(a).filter((k) => a[k]);
  const kb = Object.keys(b).filter((k) => b[k]);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
}

/** Header-only CSV whose columns auto-match on upload (keys are API aliases). */
export function sampleCsv(fields: readonly FieldDef[]): string {
  return `\uFEFF${fields.map((f) => f.key).join(",")}\r\n`;
}

export function sampleFileName(entity: ImportEntityType): string {
  return `${entity}-import-template.csv`;
}

export function exportFileName(entity: ImportEntityType, today: string): string {
  return `${entity}-${today}.csv`;
}

export type JobPhase = "draft" | "running" | "done" | "partial" | "failed";

export function jobPhase(job: Pick<ImportJob, "status" | "failedCount" | "skippedCount">): JobPhase {
  switch (job.status) {
    case "queued":
    case "processing":
      return "running";
    case "completed":
      return job.failedCount > 0 || job.skippedCount > 0 ? "partial" : "done";
    case "failed":
      return "failed";
    default:
      return "draft";
  }
}

/** Drafts can be reopened in the wizard; validated ones go straight to review. */
export function resumeStep(job: Pick<ImportJob, "status">): "match" | "review" | null {
  if (job.status === "uploaded" || job.status === "mapped") return "match";
  if (job.status === "validated") return "review";
  return null;
}

export type JobFilter = ImportEntityType | "all";

export function sortJobs(jobs: readonly ImportJob[]): ImportJob[] {
  return [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function filterJobs(jobs: readonly ImportJob[], filter: JobFilter): ImportJob[] {
  return filter === "all" ? [...jobs] : jobs.filter((j) => j.entityType === filter);
}

export type JobSummary = {
  total: number;
  imported: number;
  attention: number;
  drafts: number;
  byEntity: Partial<Record<ImportEntityType, number>>;
};

export function summarizeJobs(jobs: readonly ImportJob[]): JobSummary {
  const out: JobSummary = { total: jobs.length, imported: 0, attention: 0, drafts: 0, byEntity: {} };
  for (const j of jobs) {
    out.byEntity[j.entityType] = (out.byEntity[j.entityType] ?? 0) + 1;
    const phase = jobPhase(j);
    if (phase === "done" || phase === "partial") out.imported += j.successCount;
    if (phase === "partial" || phase === "failed") out.attention += 1;
    if (phase === "draft") out.drafts += 1;
  }
  return out;
}
