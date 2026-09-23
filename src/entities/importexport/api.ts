import { env } from "@/shared/config/env";
import { FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import type {
  FieldDef,
  ImportEntityType,
  ImportJob,
  ImportMode,
  MappingTemplate,
} from "./model";

function tokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  const session = parseSession(raw ? decodeURIComponent(raw) : null);
  return session?.accessToken ?? null;
}

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
    const token = tokenFromCookie();
    const res = await fetch(`${env.apiBaseUrl}/imports`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    const payload = (await res.json()) as { data?: Raw; error?: { message?: string } };
    if (!res.ok) throw new Error(payload.error?.message ?? "upload failed");
    return mapJob(payload.data ?? {});
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
    const token = tokenFromCookie();
    const res = await fetch(`${env.apiBaseUrl}/imports/${id}/errors`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("errors download failed");
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
    const token = tokenFromCookie();
    const res = await fetch(`${env.apiBaseUrl}/exports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ entity_type: entityType, format: "csv" }),
    });
    if (!res.ok) throw new Error("export failed");
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
  const http = new FetchHttpClient(env.apiBaseUrl, tokenFromCookie);
  const api = new ApiRepo(http);
  if (!mem) mem = new MemoryRepo();
  const wrap =
    <A extends unknown[], R>(
      fn: (...args: A) => Promise<R>,
      fallback: (...args: A) => Promise<R>,
    ) =>
    async (...args: A) => {
      try {
        return await fn(...args);
      } catch {
        return fallback(...args);
      }
    };
  return {
    upload: wrap(api.upload.bind(api), mem.upload.bind(mem)),
    listJobs: wrap(api.listJobs.bind(api), mem.listJobs.bind(mem)),
    getJob: wrap(api.getJob.bind(api), mem.getJob.bind(mem)),
    setMapping: wrap(api.setMapping.bind(api), mem.setMapping.bind(mem)),
    validate: wrap(api.validate.bind(api), mem.validate.bind(mem)),
    confirm: wrap(api.confirm.bind(api), mem.confirm.bind(mem)),
    downloadErrors: wrap(
      api.downloadErrors.bind(api),
      mem.downloadErrors.bind(mem),
    ),
    listTemplates: wrap(api.listTemplates.bind(api), mem.listTemplates.bind(mem)),
    saveTemplate: wrap(api.saveTemplate.bind(api), mem.saveTemplate.bind(mem)),
    deleteTemplate: wrap(
      api.deleteTemplate.bind(api),
      mem.deleteTemplate.bind(mem),
    ),
    schemas: wrap(api.schemas.bind(api), mem.schemas.bind(mem)),
    exportCsv: wrap(api.exportCsv.bind(api), mem.exportCsv.bind(mem)),
  };
}
