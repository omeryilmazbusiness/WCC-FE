import { env } from "@/shared/config/env";
import { FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import type { VisaCase, VisaEvent, VisaStatus } from "./model";

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

function mapEvent(raw: Raw): VisaEvent {
  return {
    id: str(raw.id),
    visaCaseId: str(raw.visa_case_id ?? raw.visaCaseId),
    fromStatus: str(raw.from_status ?? raw.fromStatus) as VisaStatus,
    toStatus: str(raw.to_status ?? raw.toStatus) as VisaStatus,
    actorId: (raw.actor_id ?? raw.actorId ?? null) as string | null,
    note: str(raw.note),
    createdAt: str(raw.created_at ?? raw.createdAt),
  };
}

function mapCase(raw: Raw): VisaCase {
  const eventsRaw = raw.events;
  return {
    id: str(raw.id),
    branchId: str(raw.branch_id ?? raw.branchId),
    bookingId: str(raw.booking_id ?? raw.bookingId),
    participantId: (raw.participant_id ?? raw.participantId ?? null) as
      | string
      | null,
    customerId: (raw.customer_id ?? raw.customerId ?? null) as string | null,
    status: str(raw.status ?? "draft") as VisaStatus,
    externalRef: str(raw.external_ref ?? raw.externalRef),
    notes: str(raw.notes),
    submittedAt: (raw.submitted_at ?? raw.submittedAt ?? null) as string | null,
    decidedAt: (raw.decided_at ?? raw.decidedAt ?? null) as string | null,
    expiresAt: (raw.expires_at ?? raw.expiresAt ?? null) as string | null,
    createdBy: str(raw.created_by ?? raw.createdBy),
    createdAt: str(raw.created_at ?? raw.createdAt),
    updatedAt: str(raw.updated_at ?? raw.updatedAt),
    events: Array.isArray(eventsRaw)
      ? (eventsRaw as Raw[]).map(mapEvent)
      : undefined,
  };
}

export type CreateVisaInput = {
  bookingId: string;
  participantId?: string | null;
  externalRef?: string;
  notes?: string;
};

export interface VisaRepository {
  listByBooking(bookingId: string): Promise<VisaCase[]>;
  getById(id: string): Promise<VisaCase>;
  create(input: CreateVisaInput): Promise<VisaCase>;
  transition(id: string, toStatus: VisaStatus, note?: string): Promise<VisaCase>;
}

class ApiRepo implements VisaRepository {
  constructor(private readonly http: HttpClient) {}

  async listByBooking(bookingId: string) {
    const data = await this.http.request<Raw[] | { items?: Raw[] }>(
      `/visa-cases?booking_id=${encodeURIComponent(bookingId)}`,
    );
    const rows = Array.isArray(data) ? data : (data.items ?? []);
    return rows.map(mapCase);
  }

  async getById(id: string) {
    return mapCase(await this.http.request<Raw>(`/visa-cases/${id}`));
  }

  async create(input: CreateVisaInput) {
    return mapCase(
      await this.http.request<Raw>("/visa-cases", {
        method: "POST",
        body: JSON.stringify({
          booking_id: input.bookingId,
          participant_id: input.participantId || null,
          external_ref: input.externalRef ?? "",
          notes: input.notes ?? "",
        }),
      }),
    );
  }

  async transition(id: string, toStatus: VisaStatus, note = "") {
    // Live BE accepts `status`; epic also documents `to_status`.
    return mapCase(
      await this.http.request<Raw>(`/visa-cases/${id}/transition`, {
        method: "POST",
        body: JSON.stringify({
          status: toStatus,
          to_status: toStatus,
          note,
        }),
      }),
    );
  }
}

class MemoryRepo implements VisaRepository {
  private cases: VisaCase[] = [];

  async listByBooking(bookingId: string) {
    return this.cases.filter((c) => c.bookingId === bookingId);
  }

  async getById(id: string) {
    const c = this.cases.find((x) => x.id === id);
    if (!c) throw new Error("visa case not found");
    return { ...c };
  }

  async create(input: CreateVisaInput) {
    const now = new Date().toISOString();
    const c: VisaCase = {
      id: crypto.randomUUID(),
      branchId: "br-1",
      bookingId: input.bookingId,
      participantId: input.participantId ?? null,
      customerId: null,
      status: "draft",
      externalRef: input.externalRef ?? "",
      notes: input.notes ?? "",
      submittedAt: null,
      decidedAt: null,
      expiresAt: null,
      createdBy: "u-local",
      createdAt: now,
      updatedAt: now,
      events: [],
    };
    this.cases.unshift(c);
    return { ...c };
  }

  async transition(id: string, toStatus: VisaStatus, note = "") {
    const c = this.cases.find((x) => x.id === id)!;
    const from = c.status;
    c.status = toStatus;
    c.updatedAt = new Date().toISOString();
    if (note) c.notes = c.notes ? `${c.notes}\n${note}` : note;
    if (toStatus === "submitted") c.submittedAt = c.updatedAt;
    if (toStatus === "approved" || toStatus === "rejected" || toStatus === "issued") {
      c.decidedAt = c.updatedAt;
    }
    const ev: VisaEvent = {
      id: crypto.randomUUID(),
      visaCaseId: c.id,
      fromStatus: from,
      toStatus,
      actorId: "u-local",
      note,
      createdAt: c.updatedAt,
    };
    c.events = [...(c.events ?? []), ev];
    return { ...c };
  }
}

let mem: MemoryRepo | null = null;

export function createVisaRepository(): VisaRepository {
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
    listByBooking: wrap(api.listByBooking.bind(api), mem.listByBooking.bind(mem)),
    getById: wrap(api.getById.bind(api), mem.getById.bind(mem)),
    create: wrap(api.create.bind(api), mem.create.bind(mem)),
    transition: wrap(api.transition.bind(api), mem.transition.bind(mem)),
  };
}
