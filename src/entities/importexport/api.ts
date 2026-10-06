import { http, type HttpClient } from "@/shared/api/http-client";
import { createRepository } from "@/shared/api/repository";
import type {
  FieldDef,
  ImportEntityType,
  ImportJob,
  ImportMode,
  MappingTemplate,
} from "./model";
import { isImportable } from "./lib/import-plan";

type Raw = Record<string, unknown>;

function mapJob(raw: Raw): ImportJob {
  return {
    id: String(raw.id),
    branchId: String(raw.branch_id ?? ""),
    entityType: String(raw.entity_type ?? "customers") as ImportEntityType,
    mode: String(raw.mode ?? "upsert") as ImportMode,
    status: String(raw.status ?? "uploaded") as ImportJob["status"],
    fileName: String(raw.file_name ?? ""),
    contentType: String(raw.content_type ?? ""),
    headers: Array.isArray(raw.headers)
      ? (raw.headers as unknown[]).map(String)
      : [],
    mapping: (raw.mapping as Record<string, string>) ?? {},
    previewRows: Array.isArray(raw.preview_rows)
      ? (raw.preview_rows as unknown[][]).map((r) =>
          Array.isArray(r) ? r.map(String) : [],
        )
      : [],
    totalRows: Number(raw.total_rows ?? 0),
    successCount: Number(raw.success_count ?? 0),
    failedCount: Number(raw.failed_count ?? 0),
    skippedCount: Number(raw.skipped_count ?? 0),
    rollbackToken: String(raw.rollback_token ?? ""),
    errorMessage: String(raw.error_message ?? ""),
    createdAt: String(raw.created_at ?? ""),
    updatedAt: String(raw.updated_at ?? ""),
  };
}

function mapTemplate(raw: Raw): MappingTemplate {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    entityType: String(raw.entity_type ?? "customers") as ImportEntityType,
    mapping: (raw.mapping as Record<string, string>) ?? {},
    createdAt: String(raw.created_at ?? ""),
  };
}

export interface ImportExportRepository {
  upload(
    file: File,
    entityType: ImportEntityType,
    mode?: ImportMode,
  ): Promise<ImportJob>;
  listJobs(): Promise<ImportJob[]>;
  getJob(id: string): Promise<ImportJob>;
  setMapping(
    id: string,
    mapping: Record<string, string>,
    mode?: ImportMode,
  ): Promise<ImportJob>;
  validate(id: string): Promise<ImportJob>;
  confirm(id: string): Promise<ImportJob>;
  downloadErrors(id: string): Promise<Blob>;
  listTemplates(entityType?: ImportEntityType): Promise<MappingTemplate[]>;
  saveTemplate(
    name: string,
    entityType: ImportEntityType,
    mapping: Record<string, string>,
  ): Promise<MappingTemplate>;
  deleteTemplate(id: string): Promise<void>;
  schemas(): Promise<Record<string, FieldDef[]>>;
  exportCsv(entityType: ImportEntityType): Promise<Blob>;
}

class ApiRepo implements ImportExportRepository {
  constructor(private readonly http: HttpClient) {}

  async upload(file: File, entityType: ImportEntityType, mode: ImportMode = "upsert") {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("entity_type", entityType);
    fd.append("mode", mode);
    return mapJob(
      (await this.http.request<Raw>("/imports", { method: "POST", body: fd })) ?? {},
    );
  }

  async listJobs() {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>("/imports");
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapJob);
  }

  async getJob(id: string) {
    return mapJob(await this.http.request<Raw>(`/imports/${id}`));
  }

  async setMapping(id: string, mapping: Record<string, string>, mode?: ImportMode) {
    return mapJob(
      await this.http.request<Raw>(`/imports/${id}/mapping`, {
        method: "PUT",
        body: JSON.stringify({ mapping, mode }),
      }),
    );
  }

  async validate(id: string) {
    return mapJob(
      await this.http.request<Raw>(`/imports/${id}/validate`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
  }

  async confirm(id: string) {
    return mapJob(
      await this.http.request<Raw>(`/imports/${id}/confirm`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
  }

  async downloadErrors(id: string) {
    const res = await this.http.raw(`/imports/${id}/errors`, {
      headers: { Accept: "text/csv" },
    });
    return res.blob();
  }

  async listTemplates(entityType?: ImportEntityType) {
    const q = entityType ? `?entity_type=${entityType}` : "";
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      `/imports/templates${q}`,
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapTemplate);
  }

  async saveTemplate(
    name: string,
    entityType: ImportEntityType,
    mapping: Record<string, string>,
  ) {
    return mapTemplate(
      await this.http.request<Raw>("/imports/templates", {
        method: "POST",
        body: JSON.stringify({ name, entity_type: entityType, mapping }),
      }),
    );
  }

  async deleteTemplate(id: string) {
    await this.http.request(`/imports/templates/${id}`, { method: "DELETE" });
  }

  async schemas() {
    const data = await this.http.request<Record<string, Raw[]>>(
      "/exports/schemas",
    );
    const out: Record<string, FieldDef[]> = {};
    for (const [k, rows] of Object.entries(data ?? {})) {
      out[k] = (rows ?? []).map((r) => ({
        key: String(r.key ?? ""),
        label: String(r.label ?? r.key ?? ""),
        required: Boolean(r.required),
        type: String(r.type ?? "string"),
      }));
    }
    return out;
  }

  async exportCsv(entityType: ImportEntityType) {
    const res = await this.http.raw("/exports", {
      method: "POST",
      headers: { Accept: "text/csv" },
      body: JSON.stringify({ entity_type: entityType, format: "csv" }),
    });
    return res.blob();
  }
}

class MemoryRepo implements ImportExportRepository {
  private jobs: ImportJob[] = [];
  private templates: MappingTemplate[] = [
    {
      id: "tmpl-1",
      name: "Default customers",
      entityType: "customers",
      mapping: {
        full_name: "Name",
        phone: "Phone",
        email: "Email",
      },
      createdAt: new Date().toISOString(),
    },
  ];

  async upload(file: File, entityType: ImportEntityType, mode: ImportMode = "upsert") {
    if (!isImportable(entityType)) throw new Error(`importing ${entityType} is not supported yet`);
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const headers = (lines[0] ?? "Name,Phone,Email").split(",").map((h) => h.trim());
    const previewRows = lines.slice(1, 6).map((l) => l.split(",").map((c) => c.trim()));
    const job: ImportJob = {
      id: crypto.randomUUID(),
      branchId: "11111111-1111-1111-1111-111111111111",
      entityType,
      mode,
      status: "uploaded",
      fileName: file.name,
      contentType: file.type || "text/csv",
      headers,
      mapping: {
        full_name: headers.find((h) => /name/i.test(h)) ?? headers[0] ?? "",
        phone: headers.find((h) => /phone|mobile|tel/i.test(h)) ?? headers[1] ?? "",
        email: headers.find((h) => /email/i.test(h)) ?? "",
      },
      previewRows,
      totalRows: Math.max(0, lines.length - 1),
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      rollbackToken: "",
      errorMessage: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.jobs.unshift(job);
    return job;
  }

  async listJobs() {
    return [...this.jobs];
  }

  async getJob(id: string) {
    return this.jobs.find((j) => j.id === id)!;
  }

  async setMapping(id: string, mapping: Record<string, string>, mode?: ImportMode) {
    const j = this.jobs.find((x) => x.id === id)!;
    j.mapping = mapping;
    if (mode) j.mode = mode;
    j.status = "mapped";
    j.updatedAt = new Date().toISOString();
    return { ...j };
  }

  async validate(id: string) {
    const j = this.jobs.find((x) => x.id === id)!;
    j.status = "validated";
    j.updatedAt = new Date().toISOString();
    return { ...j };
  }

  async confirm(id: string) {
    const j = this.jobs.find((x) => x.id === id)!;
    j.status = "completed";
    j.successCount = j.totalRows;
    j.updatedAt = new Date().toISOString();
    return { ...j };
  }

  async downloadErrors() {
    return new Blob(["row,field,message\n"], { type: "text/csv" });
  }

  async listTemplates(entityType?: ImportEntityType) {
    return this.templates.filter((t) => !entityType || t.entityType === entityType);
  }

  async saveTemplate(
    name: string,
    entityType: ImportEntityType,
    mapping: Record<string, string>,
  ) {
    const t: MappingTemplate = {
      id: crypto.randomUUID(),
      name,
      entityType,
      mapping,
      createdAt: new Date().toISOString(),
    };
    this.templates.unshift(t);
    return t;
  }

  async deleteTemplate(id: string) {
    this.templates = this.templates.filter((t) => t.id !== id);
  }

  async schemas() {
    return {
      customers: [
        { key: "full_name", label: "Full name", required: true, type: "string" },
        { key: "phone", label: "Phone", required: true, type: "phone" },
        { key: "email", label: "Email", required: false, type: "string" },
        { key: "passport_no", label: "Passport", required: false, type: "string" },
      ],
      bookings: [
        { key: "customer_phone", label: "Customer phone", required: true, type: "phone" },
        { key: "departure_code", label: "Departure code", required: true, type: "string" },
      ],
      payments: [
        { key: "booking_id", label: "Booking ID", required: true, type: "string" },
        { key: "amount", label: "Amount", required: true, type: "money" },
      ],
      departures: [
        { key: "code", label: "Departure code", required: true, type: "string" },
        { key: "depart_date", label: "Depart date", required: true, type: "date" },
      ],
    };
  }

  async exportCsv(entityType: ImportEntityType) {
    return new Blob([`\uFEFFentity,${entityType}\n`], { type: "text/csv" });
  }
}

let mem: MemoryRepo | null = null;

export function createImportExportRepository(): ImportExportRepository {
  const api = new ApiRepo(http);
  if (!mem) mem = new MemoryRepo();
  return createRepository<ImportExportRepository>({
    api,
    memory: mem,
    reads: ["listJobs", "getJob", "downloadErrors", "listTemplates", "schemas"],
  });
}
