import { env } from "@/shared/config/env";
import { FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import type {
  DocChecklist,
  DocChecklistItem,
  Document,
  DocumentKind,
  DocumentStatus,
  MissingDocsRow,
  PresignResult,
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

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

function mapDocument(raw: Raw): Document {
  return {
    id: str(raw.id),
    branchId: str(raw.branch_id ?? raw.branchId),
    relatedType: str(raw.related_type ?? raw.relatedType),
    relatedId: str(raw.related_id ?? raw.relatedId),
    kind: str(raw.kind || "other") as DocumentKind,
    fileName: str(raw.file_name ?? raw.fileName),
    contentType: str(raw.content_type ?? raw.contentType),
    sizeBytes: Number(raw.size_bytes ?? raw.sizeBytes ?? 0),
    status: str(raw.status ?? raw.state ?? "pending") as DocumentStatus,
    reviewNote: str(raw.review_note ?? raw.reviewNote),
    participantId: (raw.participant_id ?? raw.participantId ?? null) as
      | string
      | null,
    version: Number(raw.version ?? 1),
    expiresAt: (raw.expires_at ?? raw.expiresAt ?? null) as string | null,
    createdAt: str(raw.created_at ?? raw.createdAt),
  };
}

function mapChecklistItem(raw: Raw): DocChecklistItem {
  const satisfied =
    raw.satisfied === true ||
    raw.satisfied === "true" ||
    String(raw.status ?? "").toLowerCase() === "approved";
  let status = str(raw.status ?? "") as DocumentStatus;
  if (!status) {
    status = satisfied ? "approved" : "missing";
  }
  const docId = raw.document_id ?? raw.documentId ?? null;
  return {
    kind: str(raw.kind || "other") as DocumentKind,
    label: str(raw.label || raw.kind || "Document"),
    required: Boolean(raw.required ?? true),
    status,
    documentId: docId != null && docId !== "" ? String(docId) : null,
    participantId: (raw.participant_id ?? raw.participantId ?? null) as
      | string
      | null,
    participantName: str(raw.participant_name ?? raw.participantName),
    satisfied,
  };
}

function mapChecklist(raw: Raw): DocChecklist {
  const itemsRaw = Array.isArray(raw.items) ? (raw.items as Raw[]) : [];
  return {
    bookingId: str(raw.booking_id ?? raw.bookingId),
    policyId: (raw.policy_id ?? raw.policyId ?? null) as string | null,
    policyName: str(raw.policy_name ?? raw.policyName),
    items: itemsRaw.map(mapChecklistItem),
    missingRequired: Array.isArray(raw.missing_required)
      ? (raw.missing_required as unknown[]).map(String)
      : Array.isArray(raw.missingRequired)
        ? (raw.missingRequired as unknown[]).map(String)
        : [],
  };
}

function mapMissing(raw: Raw): MissingDocsRow {
  return {
    bookingId: str(raw.booking_id ?? raw.bookingId),
    participantId: (raw.participant_id ?? raw.participantId ?? null) as
      | string
      | null,
    customerId: str(raw.customer_id ?? raw.customerId),
    missingKinds: Array.isArray(raw.missing_kinds)
      ? (raw.missing_kinds as unknown[]).map(String)
      : Array.isArray(raw.missingKinds)
        ? (raw.missingKinds as unknown[]).map(String)
        : [],
  };
}

function mapPresign(raw: Raw): PresignResult {
  return {
    documentId: str(raw.document_id ?? raw.documentId),
    uploadUrl: str(raw.upload_url ?? raw.uploadUrl),
    storageKey: str(raw.storage_key ?? raw.storageKey),
    expiresInSec: Number(raw.expires_in_sec ?? raw.expiresInSec ?? 0),
    status: str(raw.status ?? "pending"),
  };
}

export type PresignInput = {
  relatedType: string;
  relatedId: string;
  kind: string;
  fileName: string;
  contentType: string;
  participantId?: string | null;
};

export interface DocumentRepository {
  checklist(bookingId: string): Promise<DocChecklist>;
  missingDocs(departureId: string): Promise<MissingDocsRow[]>;
  list(relatedType: string, relatedId: string): Promise<Document[]>;
  presign(input: PresignInput): Promise<PresignResult>;
  complete(id: string, sizeBytes: number): Promise<Document>;
  classify(id: string, kind: string): Promise<Document>;
  submit(id: string): Promise<Document>;
  approve(id: string, note?: string): Promise<Document>;
  reject(id: string, note?: string): Promise<Document>;
  replace(
    id: string,
    input: { fileName: string; contentType: string },
  ): Promise<PresignResult>;
  /** Full upload helper: presign → optional PUT → complete. */
  uploadFile(
    input: PresignInput & { file: File },
  ): Promise<Document>;
}

class ApiRepo implements DocumentRepository {
  constructor(private readonly http: HttpClient) {}

  async checklist(bookingId: string) {
    return mapChecklist(
      await this.http.request<Raw>(
        `/documents/checklist?booking_id=${encodeURIComponent(bookingId)}`,
      ),
    );
  }

  async missingDocs(departureId: string) {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      `/documents/missing-docs?departure_id=${encodeURIComponent(departureId)}`,
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapMissing);
  }

  async list(relatedType: string, relatedId: string) {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      `/documents?related_type=${encodeURIComponent(relatedType)}&related_id=${encodeURIComponent(relatedId)}`,
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapDocument);
  }

  async presign(input: PresignInput) {
    return mapPresign(
      await this.http.request<Raw>("/documents/presign", {
        method: "POST",
        body: JSON.stringify({
          related_type: input.relatedType,
          related_id: input.relatedId,
          kind: input.kind,
          file_name: input.fileName,
          content_type: input.contentType,
          participant_id: input.participantId || null,
        }),
      }),
    );
  }

  async complete(id: string, sizeBytes: number) {
    return mapDocument(
      await this.http.request<Raw>(`/documents/${id}/complete`, {
        method: "POST",
        body: JSON.stringify({ size_bytes: sizeBytes }),
      }),
    );
  }

  async classify(id: string, kind: string) {
    return mapDocument(
      await this.http.request<Raw>(`/documents/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ kind }),
      }),
    );
  }

  async submit(id: string) {
    return mapDocument(
      await this.http.request<Raw>(`/documents/${id}/submit`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
  }

  async approve(id: string, note = "") {
    return mapDocument(
      await this.http.request<Raw>(`/documents/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ note }),
      }),
    );
  }

  async reject(id: string, note = "") {
    return mapDocument(
      await this.http.request<Raw>(`/documents/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ note }),
      }),
    );
  }

  async replace(id: string, input: { fileName: string; contentType: string }) {
    return mapPresign(
      await this.http.request<Raw>(`/documents/${id}/replace`, {
        method: "POST",
        body: JSON.stringify({
          file_name: input.fileName,
          content_type: input.contentType,
        }),
      }),
    );
  }

  async uploadFile(input: PresignInput & { file: File }) {
    const pre = await this.presign({
      relatedType: input.relatedType,
      relatedId: input.relatedId,
      kind: input.kind,
      fileName: input.fileName || input.file.name,
      contentType: input.contentType || input.file.type || "application/octet-stream",
      participantId: input.participantId,
    });
    if (pre.uploadUrl) {
      const put = await fetch(pre.uploadUrl, {
        method: "PUT",
        body: input.file,
        headers: {
          "Content-Type":
            input.contentType || input.file.type || "application/octet-stream",
        },
      });
      if (!put.ok) throw new Error("upload put failed");
    }
    return this.complete(pre.documentId, input.file.size || 1);
  }
}

class MemoryRepo implements DocumentRepository {
  private docs: Document[] = [];
  private checklistByBooking: Record<string, DocChecklistItem[]> = {};

  private seedChecklist(bookingId: string) {
    if (this.checklistByBooking[bookingId]) return;
    this.checklistByBooking[bookingId] = [
      {
        kind: "passport",
        label: "Passport copy",
        required: true,
        status: "missing",
        documentId: null,
        participantId: null,
        participantName: "",
      },
      {
        kind: "visa",
        label: "Visa / entry permit",
        required: true,
        status: "missing",
        documentId: null,
        participantId: null,
        participantName: "",
      },
      {
        kind: "photo",
        label: "Passport photo",
        required: false,
        status: "missing",
        documentId: null,
        participantId: null,
        participantName: "",
      },
    ];
  }

  async checklist(bookingId: string) {
    this.seedChecklist(bookingId);
    const items = this.checklistByBooking[bookingId] ?? [];
    return {
      bookingId,
      policyId: null,
      policyName: "Default",
      items: [...items],
      missingRequired: items
        .filter((i) => i.required && i.status !== "approved")
        .map((i) => i.kind),
    };
  }

  async missingDocs(_departureId: string) {
    return [
      {
        bookingId: "bk-demo",
        participantId: "bp-1",
        customerId: "cust-1",
        missingKinds: ["passport", "visa"],
      },
      {
        bookingId: "bk-demo-2",
        participantId: null,
        customerId: "cust-2",
        missingKinds: ["photo"],
      },
    ];
  }

  async list(relatedType: string, relatedId: string) {
    return this.docs.filter(
      (d) => d.relatedType === relatedType && d.relatedId === relatedId,
    );
  }

  async presign(input: PresignInput) {
    const id = crypto.randomUUID();
    const doc: Document = {
      id,
      branchId: "br-1",
      relatedType: input.relatedType,
      relatedId: input.relatedId,
      kind: input.kind,
      fileName: input.fileName,
      contentType: input.contentType,
      sizeBytes: 0,
      status: "pending",
      reviewNote: "",
      participantId: input.participantId ?? null,
      version: 1,
      expiresAt: null,
      createdAt: new Date().toISOString(),
    };
    this.docs.push(doc);
    return {
      documentId: id,
      uploadUrl: "",
      storageKey: `mem/${id}`,
      expiresInSec: 3600,
      status: "pending",
    };
  }

  async complete(id: string, sizeBytes: number) {
    const d = this.docs.find((x) => x.id === id)!;
    d.sizeBytes = sizeBytes || 1;
    d.status = "uploaded";
    this.markChecklist(d);
    return { ...d };
  }

  private markChecklist(d: Document) {
    const items = this.checklistByBooking[d.relatedId];
    if (!items) return;
    const item = items.find((i) => i.kind === d.kind);
    if (item) {
      item.documentId = d.id;
      item.status = d.status;
      item.participantId = d.participantId;
    }
  }

  async classify(id: string, kind: string) {
    const d = this.docs.find((x) => x.id === id)!;
    d.kind = kind;
    this.markChecklist(d);
    return { ...d };
  }

  async submit(id: string) {
    const d = this.docs.find((x) => x.id === id)!;
    d.status = "submitted";
    this.markChecklist(d);
    return { ...d };
  }

  async approve(id: string, note = "") {
    const d = this.docs.find((x) => x.id === id)!;
    d.status = "approved";
    d.reviewNote = note;
    this.markChecklist(d);
    return { ...d };
  }

  async reject(id: string, note = "") {
    const d = this.docs.find((x) => x.id === id)!;
    d.status = "rejected";
    d.reviewNote = note;
    this.markChecklist(d);
    return { ...d };
  }

  async replace(id: string, input: { fileName: string; contentType: string }) {
    const orig = this.docs.find((x) => x.id === id)!;
    return this.presign({
      relatedType: orig.relatedType,
      relatedId: orig.relatedId,
      kind: orig.kind,
      fileName: input.fileName,
      contentType: input.contentType,
      participantId: orig.participantId,
    });
  }

  async uploadFile(input: PresignInput & { file: File }) {
    const pre = await this.presign({
      ...input,
      fileName: input.fileName || input.file.name,
      contentType: input.contentType || input.file.type || "application/octet-stream",
    });
    return this.complete(pre.documentId, input.file.size || 1);
  }
}

let mem: MemoryRepo | null = null;

export function createDocumentRepository(): DocumentRepository {
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
    checklist: wrap(api.checklist.bind(api), mem.checklist.bind(mem)),
    missingDocs: wrap(api.missingDocs.bind(api), mem.missingDocs.bind(mem)),
    list: wrap(api.list.bind(api), mem.list.bind(mem)),
    presign: wrap(api.presign.bind(api), mem.presign.bind(mem)),
    complete: wrap(api.complete.bind(api), mem.complete.bind(mem)),
    classify: wrap(api.classify.bind(api), mem.classify.bind(mem)),
    submit: wrap(api.submit.bind(api), mem.submit.bind(mem)),
    approve: wrap(api.approve.bind(api), mem.approve.bind(mem)),
    reject: wrap(api.reject.bind(api), mem.reject.bind(mem)),
    replace: wrap(api.replace.bind(api), mem.replace.bind(mem)),
    uploadFile: wrap(api.uploadFile.bind(api), mem.uploadFile.bind(mem)),
  };
}
