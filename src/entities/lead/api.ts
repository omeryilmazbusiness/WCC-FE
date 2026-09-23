import { env } from "@/shared/config/env";
import { FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import {
  canTransitionLead,
  type ChangeStageInput,
  type ConvertLeadInput,
  type ConvertLeadResult,
  type Lead,
  type LeadAnalytics,
  type LeadCreateInput,
  type LeadOwner,
  type LeadStage,
  type StageHistoryItem,
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

export interface LeadRepository {
  list(params?: {
    q?: string;
    ownerId?: string;
    stage?: string;
    noFollowUp?: boolean;
  }): Promise<Lead[]>;
  listByCustomerId(customerId: string): Promise<Lead[]>;
  getById(id: string): Promise<Lead>;
  create(input: LeadCreateInput): Promise<Lead>;
  changeStage(id: string, input: ChangeStageInput): Promise<Lead>;
  assign(id: string, ownerId: string, ownerName?: string): Promise<Lead>;
  bulkAssign(leadIds: string[], ownerId: string, ownerName?: string): Promise<Lead[]>;
  history(id: string): Promise<StageHistoryItem[]>;
  convert(id: string, input: ConvertLeadInput): Promise<ConvertLeadResult>;
  setNoFollowUp(id: string, noFollowUp: boolean): Promise<Lead>;
  analytics(): Promise<LeadAnalytics>;
  listOwners(): Promise<LeadOwner[]>;
}

type ApiLead = Record<string, unknown>;

function mapLead(raw: ApiLead): Lead {
  return {
    id: String(raw.id),
    branchId: String(raw.branchId ?? raw.branch_id ?? ""),
    customerId: (raw.customerId ?? raw.customer_id ?? null) as string | null,
    fullName: String(raw.fullName ?? raw.full_name ?? ""),
    phone: String(raw.phone ?? ""),
    source: String(raw.source ?? ""),
    stage: String(raw.stage ?? "new") as LeadStage,
    ownerId: String(raw.ownerId ?? raw.owner_id ?? ""),
    ownerName: String(raw.ownerName ?? raw.owner_name ?? ""),
    lostReasonCode: String(raw.lostReasonCode ?? raw.lost_reason_code ?? ""),
    lostReason: String(raw.lostReason ?? raw.lost_reason ?? ""),
    notes: String(raw.notes ?? ""),
    noFollowUp: Boolean(raw.noFollowUp ?? raw.no_follow_up ?? false),
    convertedBookingId: (raw.convertedBookingId ??
      raw.converted_booking_id ??
      null) as string | null,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),
  };
}

function mapHistory(raw: Record<string, unknown>): StageHistoryItem {
  return {
    id: String(raw.id),
    leadId: String(raw.leadId ?? raw.lead_id ?? ""),
    fromStage: (raw.fromStage ?? raw.from_stage ?? null) as string | null,
    toStage: String(raw.toStage ?? raw.to_stage ?? ""),
    changedBy: String(raw.changedBy ?? raw.changed_by ?? ""),
    note: String(raw.note ?? ""),
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
  };
}

export class ApiLeadRepository implements LeadRepository {
  constructor(private readonly http: HttpClient) {}

  async list(params?: {
    q?: string;
    ownerId?: string;
    stage?: string;
    noFollowUp?: boolean;
  }): Promise<Lead[]> {
    const sp = new URLSearchParams({ limit: "200" });
    if (params?.q) sp.set("q", params.q);
    if (params?.ownerId) sp.set("owner_id", params.ownerId);
    if (params?.stage) sp.set("stage", params.stage);
    if (params?.noFollowUp) sp.set("no_follow_up", "true");
    const data = await this.http.request<ApiLead[]>(`/leads?${sp}`);
    return (Array.isArray(data) ? data : []).map(mapLead);
  }

  async listByCustomerId(customerId: string): Promise<Lead[]> {
    const all = await this.list();
    return all.filter((l) => l.customerId === customerId);
  }

  async getById(id: string): Promise<Lead> {
    return mapLead(await this.http.request<ApiLead>(`/leads/${id}`));
  }

  async create(input: LeadCreateInput): Promise<Lead> {
    return mapLead(
      await this.http.request<ApiLead>("/leads", {
        method: "POST",
        body: JSON.stringify({
          full_name: input.fullName,
          phone: input.phone,
          source: input.source ?? "",
          notes: input.notes ?? "",
          owner_id: input.ownerId,
          customer_id: input.customerId || null,
        }),
      }),
    );
  }

  async changeStage(id: string, input: ChangeStageInput): Promise<Lead> {
    return mapLead(
      await this.http.request<ApiLead>(`/leads/${id}/stage`, {
        method: "POST",
        body: JSON.stringify({
          stage: input.stage,
          note: input.note ?? "",
          lost_reason_code: input.lostReasonCode ?? "",
          lost_reason: input.lostReason ?? "",
        }),
      }),
    );
  }

  async assign(id: string, ownerId: string, ownerName?: string): Promise<Lead> {
    void ownerName;
    return mapLead(
      await this.http.request<ApiLead>(`/leads/${id}/assign`, {
        method: "POST",
        body: JSON.stringify({ owner_id: ownerId }),
      }),
    );
  }

  async bulkAssign(
    leadIds: string[],
    ownerId: string,
    ownerName?: string,
  ): Promise<Lead[]> {
    void ownerName;
    const data = await this.http.request<ApiLead[]>("/leads/assign", {
      method: "POST",
      body: JSON.stringify({ owner_id: ownerId, lead_ids: leadIds }),
    });
    return (Array.isArray(data) ? data : []).map(mapLead);
  }

  async history(id: string): Promise<StageHistoryItem[]> {
    const data = await this.http.request<Record<string, unknown>[]>(
      `/leads/${id}/history`,
    );
    return (Array.isArray(data) ? data : []).map(mapHistory);
  }

  async convert(id: string, input: ConvertLeadInput): Promise<ConvertLeadResult> {
    const raw = await this.http.request<{
      lead: ApiLead;
      booking_id: string;
    }>(`/leads/${id}/convert`, {
      method: "POST",
      body: JSON.stringify({
        departure_id: input.departureId,
        pax_count: input.paxCount ?? 1,
        total_amount: input.totalAmount ?? 0,
        currency: input.currency ?? "USD",
      }),
    });
    return { lead: mapLead(raw.lead), bookingId: String(raw.booking_id) };
  }

  async setNoFollowUp(id: string, noFollowUp: boolean): Promise<Lead> {
    return mapLead(
      await this.http.request<ApiLead>(`/leads/${id}/no-follow-up`, {
        method: "POST",
        body: JSON.stringify({ no_follow_up: noFollowUp }),
      }),
    );
  }

  async analytics(): Promise<LeadAnalytics> {
    return this.http.request<LeadAnalytics>("/leads/analytics");
  }

  async listOwners(): Promise<LeadOwner[]> {
    const users = await this.http.request<
      { id: string; full_name?: string; fullName?: string }[]
    >("/users?limit=100");
    return (Array.isArray(users) ? users : []).map((u) => ({
      id: String(u.id),
      name: String(u.full_name ?? u.fullName ?? u.id),
    }));
  }
}

const OWNERS: LeadOwner[] = [
  { id: "22222222-2222-2222-2222-222222222203", name: "Sales Employee" },
  { id: "22222222-2222-2222-2222-222222222202", name: "Branch Manager" },
  { id: "22222222-2222-2222-2222-222222222201", name: "General Manager" },
];

export const LEAD_OWNERS = OWNERS;

function nowIso() {
  return new Date().toISOString();
}

const store: Lead[] = [
  {
    id: "lead-1",
    branchId: "11111111-1111-1111-1111-111111111111",
    customerId: "demo-1",
    fullName: "Ahmed Al-Rashid",
    phone: "+966500000001",
    source: "WhatsApp",
    stage: "qualified",
    ownerId: OWNERS[0].id,
    ownerName: OWNERS[0].name,
    lostReasonCode: "",
    lostReason: "",
    notes: "Interested in Ramadan Umrah",
    noFollowUp: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "lead-2",
    branchId: "11111111-1111-1111-1111-111111111111",
    fullName: "Fatima Hassan",
    phone: "+966500000002",
    source: "Walk-in",
    stage: "new",
    ownerId: OWNERS[0].id,
    ownerName: OWNERS[0].name,
    lostReasonCode: "",
    lostReason: "",
    notes: "",
    noFollowUp: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "lead-3",
    branchId: "11111111-1111-1111-1111-111111111111",
    fullName: "Omar Khalil",
    phone: "+971500000003",
    source: "Referral",
    stage: "proposal",
    ownerId: OWNERS[1].id,
    ownerName: OWNERS[1].name,
    lostReasonCode: "",
    lostReason: "",
    notes: "Family of 4 — waiting quote",
    noFollowUp: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "lead-4",
    branchId: "11111111-1111-1111-1111-111111111111",
    fullName: "Sara Nasser",
    phone: "+966500000004",
    source: "Instagram",
    stage: "contacted",
    ownerId: OWNERS[0].id,
    ownerName: OWNERS[0].name,
    lostReasonCode: "",
    lostReason: "",
    notes: "Follow up Thursday",
    noFollowUp: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "lead-5",
    branchId: "11111111-1111-1111-1111-111111111111",
    fullName: "Yusuf Demir",
    phone: "+905350000005",
    source: "Email",
    stage: "lost",
    ownerId: OWNERS[1].id,
    ownerName: OWNERS[1].name,
    lostReasonCode: "price",
    lostReason: "Price too high",
    notes: "",
    noFollowUp: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const memoryHistory: Record<string, StageHistoryItem[]> = {};

export class MemoryLeadRepository implements LeadRepository {
  async list(params?: {
    q?: string;
    ownerId?: string;
    stage?: string;
    noFollowUp?: boolean;
  }): Promise<Lead[]> {
    let rows = [...store].sort(
      (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
    );
    if (params?.ownerId) rows = rows.filter((l) => l.ownerId === params.ownerId);
    if (params?.stage) rows = rows.filter((l) => l.stage === params.stage);
    if (params?.noFollowUp) rows = rows.filter((l) => l.noFollowUp);
    const q = params?.q?.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (l) =>
          l.fullName.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          l.source.toLowerCase().includes(q),
      );
    }
    return rows;
  }

  async listByCustomerId(customerId: string): Promise<Lead[]> {
    return (await this.list()).filter((l) => l.customerId === customerId);
  }

  async getById(id: string): Promise<Lead> {
    const found = store.find((l) => l.id === id);
    if (!found) throw new Error("Lead not found");
    return found;
  }

  async create(input: LeadCreateInput): Promise<Lead> {
    const lead: Lead = {
      id: crypto.randomUUID(),
      branchId: "11111111-1111-1111-1111-111111111111",
      customerId: input.customerId ?? null,
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      source: input.source?.trim() ?? "",
      stage: "new",
      ownerId: input.ownerId,
      ownerName: input.ownerName,
      lostReasonCode: "",
      lostReason: "",
      notes: input.notes?.trim() ?? "",
      noFollowUp: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    store.unshift(lead);
    memoryHistory[lead.id] = [
      {
        id: crypto.randomUUID(),
        leadId: lead.id,
        fromStage: null,
        toStage: "new",
        changedBy: input.ownerId,
        note: "created",
        createdAt: nowIso(),
      },
    ];
    return lead;
  }

  async changeStage(id: string, input: ChangeStageInput): Promise<Lead> {
    const lead = await this.getById(id);
    const to = input.stage;
    if (!canTransitionLead(lead.stage, to)) {
      throw new Error(`Invalid stage transition: ${lead.stage} → ${to}`);
    }
    if (to === "lost" && !input.lostReasonCode?.trim() && !input.lostReason?.trim()) {
      throw new Error("Lost reason is required");
    }
    const from = lead.stage;
    lead.stage = to;
    if (to === "lost") {
      lead.lostReasonCode = input.lostReasonCode?.trim() || "other";
      lead.lostReason = input.lostReason?.trim() || lead.lostReasonCode;
      lead.noFollowUp = false;
    } else {
      lead.lostReasonCode = "";
      lead.lostReason = "";
    }
    if (input.note) lead.notes = input.note;
    lead.updatedAt = nowIso();
    memoryHistory[id] = [
      ...(memoryHistory[id] ?? []),
      {
        id: crypto.randomUUID(),
        leadId: id,
        fromStage: from,
        toStage: to,
        changedBy: lead.ownerId,
        note: input.note ?? "",
        createdAt: nowIso(),
      },
    ];
    return lead;
  }

  async assign(id: string, ownerId: string, ownerName = ""): Promise<Lead> {
    const lead = await this.getById(id);
    lead.ownerId = ownerId;
    lead.ownerName = ownerName || lead.ownerName;
    lead.updatedAt = nowIso();
    return lead;
  }

  async bulkAssign(
    leadIds: string[],
    ownerId: string,
    ownerName = "",
  ): Promise<Lead[]> {
    const out: Lead[] = [];
    for (const id of leadIds) {
      out.push(await this.assign(id, ownerId, ownerName));
    }
    return out;
  }

  async history(id: string): Promise<StageHistoryItem[]> {
    return memoryHistory[id] ?? [];
  }

  async convert(id: string, input: ConvertLeadInput): Promise<ConvertLeadResult> {
    let lead = await this.getById(id);
    if (!lead.customerId) {
      throw new Error("Lead must be linked to a customer before conversion");
    }
    if (lead.stage !== "won") {
      // walk to won if possible from proposal
      if (lead.stage === "proposal") {
        lead = await this.changeStage(id, { stage: "won", note: "converted" });
      } else if (canTransitionLead(lead.stage, "won")) {
        lead = await this.changeStage(id, { stage: "won", note: "converted" });
      } else {
        throw new Error("Lead must reach proposal before conversion");
      }
    }
    const { MemoryBookingRepository } = await import("@/entities/booking/api");
    const bookingRepo = new MemoryBookingRepository();
    const booking = await bookingRepo.create({
      customerId: lead.customerId!,
      departureId: input.departureId,
      leadId: lead.id,
      paxCount: input.paxCount ?? 1,
      totalAmount: input.totalAmount ?? 0,
      currency: input.currency ?? "USD",
    });
    lead.convertedBookingId = booking.id;
    lead.updatedAt = nowIso();
    return { lead, bookingId: booking.id };
  }

  async setNoFollowUp(id: string, noFollowUp: boolean): Promise<Lead> {
    const lead = await this.getById(id);
    if (lead.stage === "won" || lead.stage === "lost") {
      throw new Error("no_follow_up only applies to open leads");
    }
    lead.noFollowUp = noFollowUp;
    lead.updatedAt = nowIso();
    return lead;
  }

  async analytics(): Promise<LeadAnalytics> {
    const rows = await this.list();
    const won = rows.filter((l) => l.stage === "won").length;
    const lost = rows.filter((l) => l.stage === "lost").length;
    const closed = won + lost;
    return {
      total: rows.length,
      open: rows.filter((l) => l.stage !== "won" && l.stage !== "lost").length,
      won,
      lost,
      conversion_rate: closed ? won / closed : 0,
      no_follow_up: rows.filter((l) => l.noFollowUp).length,
      by_stage: LEAD_STAGES_LOCAL.map((s) => ({
        key: s,
        count: rows.filter((l) => l.stage === s).length,
      })),
      by_source: [],
      by_owner: [],
    };
  }

  async listOwners(): Promise<LeadOwner[]> {
    return [...OWNERS];
  }
}

const LEAD_STAGES_LOCAL: LeadStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
];

export function groupLeadsByStage(leads: Lead[]): Record<LeadStage, Lead[]> {
  const map = {
    new: [],
    contacted: [],
    qualified: [],
    proposal: [],
    won: [],
    lost: [],
  } as Record<LeadStage, Lead[]>;
  for (const lead of leads) {
    map[lead.stage].push(lead);
  }
  return map;
}

export function createLeadRepository(): LeadRepository {
  const http = new FetchHttpClient(env.apiBaseUrl, tokenFromCookie);
  const api = new ApiLeadRepository(http);
  const memory = new MemoryLeadRepository();
  return {
    async list(p) {
      try {
        return await api.list(p);
      } catch {
        return memory.list(p);
      }
    },
    async listByCustomerId(id) {
      try {
        return await api.listByCustomerId(id);
      } catch {
        return memory.listByCustomerId(id);
      }
    },
    async getById(id) {
      try {
        return await api.getById(id);
      } catch {
        return memory.getById(id);
      }
    },
    async create(input) {
      try {
        return await api.create(input);
      } catch {
        return memory.create(input);
      }
    },
    async changeStage(id, input) {
      try {
        return await api.changeStage(id, input);
      } catch {
        return memory.changeStage(id, input);
      }
    },
    async assign(id, ownerId, ownerName) {
      try {
        return await api.assign(id, ownerId, ownerName);
      } catch {
        return memory.assign(id, ownerId, ownerName);
      }
    },
    async bulkAssign(ids, ownerId, ownerName) {
      try {
        return await api.bulkAssign(ids, ownerId, ownerName);
      } catch {
        return memory.bulkAssign(ids, ownerId, ownerName);
      }
    },
    async history(id) {
      try {
        return await api.history(id);
      } catch {
        return memory.history(id);
      }
    },
    async convert(id, input) {
      try {
        return await api.convert(id, input);
      } catch {
        return memory.convert(id, input);
      }
    },
    async setNoFollowUp(id, v) {
      try {
        return await api.setNoFollowUp(id, v);
      } catch {
        return memory.setNoFollowUp(id, v);
      }
    },
    async analytics() {
      try {
        return await api.analytics();
      } catch {
        return memory.analytics();
      }
    },
    async listOwners() {
      try {
        return await api.listOwners();
      } catch {
        return memory.listOwners();
      }
    },
  };
}
