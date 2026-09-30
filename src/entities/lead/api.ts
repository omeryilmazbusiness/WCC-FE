import { http, type HttpClient } from "@/shared/api/http-client";
import { createRepository } from "@/shared/api/repository";
import {
  canTransitionLead,
  conversionPath,
  LEAD_STAGES,
  type ChangeStageInput,
  type ConvertLeadInput,
  type ConvertLeadResult,
  type Lead,
  type LeadAnalytics,
  type LeadCreateInput,
  type LeadOwner,
  type LeadStage,
  type LeadUpdateInput,
  type StageHistoryItem,
  type TripInterest,
  emptyTripInterest,
} from "./model";
import {
  budgetSums,
  type BoardColumn,
  type BudgetSum,
} from "./lib/pipeline";
import { leadQueryParams, type LeadQuery } from "./lib/query";

export type LeadPage = { items: Lead[]; total: number };

export interface LeadRepository {
  /** First 200 matches, newest activity first; for small lookups, not the pipeline. */
  list(params?: LeadQuery): Promise<Lead[]>;
  /** One server page of matches with the filtered total. */
  page(query: LeadQuery, page: { limit: number; offset: number }): Promise<LeadPage>;
  /** Every lane's totals and budgets for the query plus its first `perStage` cards (0 = totals only). */
  board(query: LeadQuery, perStage: number): Promise<BoardColumn[]>;
  /** Soft-deletes leads; `restore` undoes it. */
  remove(ids: string[]): Promise<void>;
  restore(ids: string[]): Promise<Lead[]>;
  listByCustomerId(customerId: string): Promise<Lead[]>;
  getById(id: string): Promise<Lead>;
  create(input: LeadCreateInput): Promise<Lead>;
  update(id: string, input: LeadUpdateInput): Promise<Lead>;
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

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function mapInterest(raw: unknown): TripInterest {
  if (!raw || typeof raw !== "object") return emptyTripInterest();
  const r = raw as Record<string, unknown>;
  return {
    travelDate: typeof r.travel_date === "string" && r.travel_date ? r.travel_date : null,
    travelWindow: String(r.travel_window ?? ""),
    paxCount: numOrNull(r.pax_count),
    budgetAmount: numOrNull(r.budget_amount),
    budgetCurrency: String(r.budget_currency ?? ""),
    packageId: typeof r.package_id === "string" && r.package_id ? r.package_id : null,
    packageInterest: String(r.package_interest ?? ""),
  };
}

function interestBody(t: TripInterest) {
  return {
    travel_date: t.travelDate || null,
    travel_window: t.travelWindow,
    pax_count: t.paxCount,
    budget_amount: t.budgetAmount,
    budget_currency: t.budgetCurrency,
    package_id: t.packageId || null,
    package_interest: t.packageInterest,
  };
}

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
    interest: mapInterest(raw.interest),
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

function mapBudget(raw: Record<string, unknown>): BudgetSum {
  return {
    currency: String(raw.currency ?? ""),
    amount: Number(raw.amount ?? 0),
    count: Number(raw.count ?? 0),
  };
}

function mapColumn(raw: Record<string, unknown>): BoardColumn {
  return {
    stage: String(raw.stage ?? "new") as LeadStage,
    total: Number(raw.total ?? 0),
    noFollowUp: Number(raw.no_follow_up ?? 0),
    budgets: (Array.isArray(raw.budgets) ? raw.budgets : []).map(mapBudget),
    items: (Array.isArray(raw.items) ? raw.items : []).map(mapLead),
  };
}

export class ApiLeadRepository implements LeadRepository {
  constructor(private readonly http: HttpClient) {}

  async list(params: LeadQuery = {}): Promise<Lead[]> {
    return (await this.page(params, { limit: 200, offset: 0 })).items;
  }

  async page(query: LeadQuery, page: { limit: number; offset: number }): Promise<LeadPage> {
    const sp = leadQueryParams(query);
    sp.set("limit", String(page.limit));
    sp.set("offset", String(page.offset));
    const res = await this.http.raw(`/leads?${sp}`);
    const payload = (await res.json().catch(() => ({}))) as {
      data?: ApiLead[];
      meta?: { total?: number };
    };
    const items = (Array.isArray(payload.data) ? payload.data : []).map(mapLead);
    return { items, total: Number(payload.meta?.total ?? items.length) };
  }

  async board(query: LeadQuery, perStage: number): Promise<BoardColumn[]> {
    const sp = leadQueryParams(query);
    sp.set("per_stage", String(perStage));
    const data = await this.http.request<{ columns?: Record<string, unknown>[] }>(`/leads/board?${sp}`);
    return (Array.isArray(data?.columns) ? data.columns : []).map(mapColumn);
  }

  async remove(ids: string[]): Promise<void> {
    await this.http.request("/leads/delete", {
      method: "POST",
      body: JSON.stringify({ lead_ids: ids }),
    });
  }

  async restore(ids: string[]): Promise<Lead[]> {
    const data = await this.http.request<ApiLead[]>("/leads/restore", {
      method: "POST",
      body: JSON.stringify({ lead_ids: ids }),
    });
    return (Array.isArray(data) ? data : []).map(mapLead);
  }

  async listByCustomerId(customerId: string): Promise<Lead[]> {
    return this.list({ customerId });
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
          interest: input.interest ? interestBody(input.interest) : undefined,
        }),
      }),
    );
  }

  async update(id: string, input: LeadUpdateInput): Promise<Lead> {
    return mapLead(
      await this.http.request<ApiLead>(`/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          full_name: input.fullName,
          phone: input.phone,
          notes: input.notes,
          interest: input.interest ? interestBody(input.interest) : undefined,
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

const seed: Omit<Lead, "interest">[] = [
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

const store: Lead[] = seed.map((l) => ({ ...l, interest: emptyTripInterest() }));
const deletedIds = new Set<string>();

function matchesQuery(l: Lead, query: LeadQuery): boolean {
  if (deletedIds.has(l.id)) return false;
  if (query.ownerId && l.ownerId !== query.ownerId) return false;
  if (query.customerId && l.customerId !== query.customerId) return false;
  if (query.stage && l.stage !== query.stage) return false;
  if (query.source && l.source.toLowerCase() !== query.source.toLowerCase()) return false;
  if (query.noFollowUp && !l.noFollowUp) return false;
  if (query.createdFrom && l.createdAt < query.createdFrom) return false;
  if (query.createdTo && l.createdAt >= query.createdTo) return false;
  const q = query.q?.trim().toLowerCase();
  if (!q) return true;
  return (
    l.fullName.toLowerCase().includes(q) ||
    l.phone.includes(q) ||
    l.source.toLowerCase().includes(q) ||
    l.ownerName.toLowerCase().includes(q)
  );
}

function sortLeads(rows: Lead[], sort: LeadQuery["sort"]): Lead[] {
  const by: Record<string, (a: Lead, b: Lead) => number> = {
    created: (a, b) => b.createdAt.localeCompare(a.createdAt),
    oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
    name: (a, b) => a.fullName.localeCompare(b.fullName),
    budget: (a, b) => (b.interest.budgetAmount ?? -1) - (a.interest.budgetAmount ?? -1),
    travel: (a, b) => (a.interest.travelDate ?? "9999").localeCompare(b.interest.travelDate ?? "9999"),
  };
  const cmp = by[sort ?? ""] ?? ((a: Lead, b: Lead) => b.updatedAt.localeCompare(a.updatedAt));
  return [...rows].sort(cmp);
}

const memoryHistory: Record<string, StageHistoryItem[]> = {};

export class MemoryLeadRepository implements LeadRepository {
  async list(params: LeadQuery = {}): Promise<Lead[]> {
    return sortLeads(store.filter((l) => matchesQuery(l, params)), params.sort);
  }

  async page(query: LeadQuery, page: { limit: number; offset: number }): Promise<LeadPage> {
    const rows = await this.list(query);
    return { items: rows.slice(page.offset, page.offset + page.limit), total: rows.length };
  }

  async board(query: LeadQuery, perStage: number): Promise<BoardColumn[]> {
    const rows = await this.list({ ...query, stage: undefined });
    return LEAD_STAGES.map((stage) => {
      const lane = rows.filter((l) => l.stage === stage);
      return {
        stage,
        total: lane.length,
        noFollowUp: lane.filter((l) => l.noFollowUp).length,
        budgets: budgetSums(lane).sort((a, b) => b.amount - a.amount),
        items: lane.slice(0, perStage),
      };
    });
  }

  async remove(ids: string[]): Promise<void> {
    for (const id of ids) {
      const lead = await this.getById(id);
      if (lead.convertedBookingId) throw new Error("A lead converted to a booking cannot be deleted");
    }
    for (const id of ids) deletedIds.add(id);
  }

  async restore(ids: string[]): Promise<Lead[]> {
    for (const id of ids) deletedIds.delete(id);
    return Promise.all(ids.map((id) => this.getById(id)));
  }

  async listByCustomerId(customerId: string): Promise<Lead[]> {
    return (await this.list()).filter((l) => l.customerId === customerId);
  }

  async getById(id: string): Promise<Lead> {
    const found = store.find((l) => l.id === id && !deletedIds.has(id));
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
      interest: input.interest ?? emptyTripInterest(),
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

  async update(id: string, input: LeadUpdateInput): Promise<Lead> {
    const lead = await this.getById(id);
    if (input.fullName !== undefined) lead.fullName = input.fullName.trim();
    if (input.phone !== undefined) lead.phone = input.phone.trim();
    if (input.notes !== undefined) lead.notes = input.notes;
    if (input.interest) lead.interest = { ...input.interest };
    lead.updatedAt = nowIso();
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
    const path = conversionPath(lead.stage);
    if (!path) throw new Error("Lead must reach proposal before conversion");
    for (const stage of path) {
      lead = await this.changeStage(id, { stage, note: "converted" });
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
      by_stage: LEAD_STAGES.map((s) => ({
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

/** Leads per stage, every stage present; unknown stages from the API are dropped rather than crashing. */
export function groupLeadsByStage(leads: Lead[]): Record<LeadStage, Lead[]> {
  const map = Object.fromEntries(LEAD_STAGES.map((s) => [s, [] as Lead[]])) as Record<LeadStage, Lead[]>;
  for (const lead of leads) {
    map[lead.stage]?.push(lead);
  }
  return map;
}

export function createLeadRepository(): LeadRepository {
  const api = new ApiLeadRepository(http);
  const memory = new MemoryLeadRepository();
  return createRepository<LeadRepository>({
    api,
    memory,
    reads: [
      "list",
      "page",
      "board",
      "listByCustomerId",
      "getById",
      "history",
      "analytics",
      "listOwners",
    ],
  });
}
