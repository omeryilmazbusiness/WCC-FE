import { http, type HttpClient } from "@/shared/api/http-client";
import { createRepository } from "@/shared/api/repository";
import { maskedLast4, passportPatchValue, toMaskedSecret } from "@/shared/lib/pii";
import {
  isBookingStatus,
  toLineCategory,
  toLineKind,
  type AllowedTransition,
  type Booking,
  type BookingChecklistItem,
  type BookingCreateInput,
  type BookingLineItem,
  type BookingParticipant,
  type BookingReadiness,
  type BookingStatus,
  type BookingUpdateInput,
  type ChangeStatusInput,
  type LineItemInput,
  type ParticipantInput,
} from "./model";

export interface BookingRepository {
  list(params?: {
    q?: string;
    status?: string;
    customerId?: string;
    departureId?: string;
    packageId?: string;
    ownerId?: string;
  }): Promise<Booking[]>;
  getById(id: string): Promise<Booking>;
  create(input: BookingCreateInput): Promise<Booking>;
  update(id: string, input: BookingUpdateInput): Promise<Booking>;
  /** `POST /bookings/{id}/status`; 409 `invalid_transition`, 422 `guard_failed` (`details.guards`). */
  changeStatus(id: string, input: ChangeStatusInput): Promise<Booking>;
  readiness(id: string): Promise<BookingReadiness>;
  overrideReadiness(id: string, reason: string): Promise<void>;
  listParticipants(id: string): Promise<BookingParticipant[]>;
  addParticipant(id: string, input: ParticipantInput): Promise<BookingParticipant>;
  updateParticipant(
    id: string,
    participantId: string,
    input: ParticipantInput,
  ): Promise<BookingParticipant>;
  deleteParticipant(id: string, participantId: string): Promise<void>;
  /** Full participant passport number (`pii.read`, audited). Never cache the result. */
  revealParticipantPassport(id: string, participantId: string): Promise<string>;
  listLineItems(id: string): Promise<BookingLineItem[]>;
  setLineItems(
    id: string,
    items: LineItemInput[],
  ): Promise<{ items: BookingLineItem[]; booking: Booking }>;
  listChecklist(id: string): Promise<BookingChecklistItem[]>;
  updateChecklist(
    id: string,
    itemId: string,
    completed: boolean,
  ): Promise<BookingChecklistItem>;
}

type Raw = Record<string, unknown>;

function mapTransitions(value: unknown): AllowedTransition[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): AllowedTransition[] => {
    const r = (item ?? {}) as Raw;
    if (!isBookingStatus(r.status)) return [];
    return [
      {
        status: r.status,
        requiresReason: Boolean(r.requires_reason ?? r.requiresReason),
        requiresOverride: Boolean(r.requires_override ?? r.requiresOverride),
      },
    ];
  });
}

function strOrNull(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function mapBooking(raw: Raw): Booking {
  return {
    id: String(raw.id),
    branchId: String(raw.branchId ?? raw.branch_id ?? ""),
    customerId: String(raw.customerId ?? raw.customer_id ?? ""),
    departureId: String(raw.departureId ?? raw.departure_id ?? ""),
    leadId: (raw.leadId ?? raw.lead_id ?? null) as string | null,
    status: String(raw.status ?? "draft") as BookingStatus,
    paxCount: Number(raw.paxCount ?? raw.pax_count ?? 0),
    totalAmount: Number(raw.totalAmount ?? raw.total_amount ?? 0),
    discountAmt: Number(raw.discountAmt ?? raw.discount_amt ?? 0),
    costAmt: Number(raw.costAmt ?? raw.cost_amt ?? 0),
    margin: Number(raw.margin ?? 0),
    collectedAmt: Number(raw.collectedAmt ?? raw.collected_amt ?? 0),
    balanceAmt: Number(raw.balanceAmt ?? raw.balance_amt ?? 0),
    currency: String(raw.currency ?? "USD"),
    notes: String(raw.notes ?? ""),
    ownerId: String(raw.ownerId ?? raw.owner_id ?? ""),
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),
    holdExpiresAt: strOrNull(raw.hold_expires_at ?? raw.holdExpiresAt),
    statusChangedAt: strOrNull(raw.status_changed_at ?? raw.statusChangedAt),
    statusReason: String(raw.status_reason ?? raw.statusReason ?? ""),
    allowedTransitions: mapTransitions(raw.allowed_transitions ?? raw.allowedTransitions),
  };
}

function mapParticipant(raw: Raw): BookingParticipant {
  const passportNo = toMaskedSecret(
    String(raw.passportNo ?? raw.passport_no ?? ""),
    (raw.passportLast4 ?? raw.passport_last4) as string | null | undefined,
  );
  return {
    id: String(raw.id),
    bookingId: String(raw.bookingId ?? raw.booking_id ?? ""),
    fullName: String(raw.fullName ?? raw.full_name ?? ""),
    passportNo,
    passportLast4: String(raw.passportLast4 ?? raw.passport_last4 ?? "") || maskedLast4(passportNo),
    nationality: String(raw.nationality ?? ""),
    dateOfBirth: (raw.dateOfBirth ?? raw.date_of_birth ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
  };
}

function mapLine(raw: Raw): BookingLineItem {
  const qty = Number(raw.quantity ?? 1);
  const unitPrice = Number(raw.unitPrice ?? raw.unit_price ?? 0);
  const unitCost = Number(raw.unitCost ?? raw.unit_cost ?? 0);
  return {
    id: String(raw.id),
    bookingId: String(raw.bookingId ?? raw.booking_id ?? ""),
    kind: toLineKind(raw.kind),
    category: toLineCategory(raw.kind, raw.category),
    label: String(raw.label ?? ""),
    quantity: qty,
    unitPrice,
    unitCost,
    lineTotal: Number(raw.lineTotal ?? raw.line_total ?? qty * unitPrice),
    lineCost: Number(raw.lineCost ?? raw.line_cost ?? qty * unitCost),
    sortOrder: Number(raw.sortOrder ?? raw.sort_order ?? 0),
  };
}

function mapChecklist(raw: Raw): BookingChecklistItem {
  return {
    id: String(raw.id),
    bookingId: String(raw.bookingId ?? raw.booking_id ?? ""),
    code: String(raw.code ?? ""),
    label: String(raw.label ?? ""),
    required: Boolean(raw.required ?? true),
    completed: Boolean(raw.completed ?? false),
    completedAt: (raw.completedAt ?? raw.completed_at ?? null) as string | null,
    sortOrder: Number(raw.sortOrder ?? raw.sort_order ?? 0),
  };
}

function mapReadiness(raw: Raw): BookingReadiness {
  const missingDocsRaw = raw.missing_docs ?? raw.missingDocs ?? [];
  return {
    booking_id: String(raw.booking_id ?? raw.bookingId ?? ""),
    can_confirm: Boolean(raw.can_confirm ?? raw.canConfirm ?? false),
    blocking: (raw.blocking ?? []) as string[],
    warnings: (raw.warnings ?? []) as string[],
    participants_count: Number(raw.participants_count ?? raw.participantsCount ?? 0),
    pax_count: Number(raw.pax_count ?? raw.paxCount ?? 0),
    missing_passports: Number(raw.missing_passports ?? raw.missingPassports ?? 0),
    checklist_required: Number(raw.checklist_required ?? raw.checklistRequired ?? 0),
    checklist_completed: Number(raw.checklist_completed ?? raw.checklistCompleted ?? 0),
    checklist_incomplete: Number(raw.checklist_incomplete ?? raw.checklistIncomplete ?? 0),
    balance_amt: Number(raw.balance_amt ?? raw.balanceAmt ?? 0),
    days_to_departure: (raw.days_to_departure ?? raw.daysToDeparture ?? null) as
      | number
      | null,
    risk_alerts: (raw.risk_alerts ?? raw.riskAlerts ?? []) as string[],
    overrideActive: Boolean(raw.override_active ?? raw.overrideActive ?? false),
    missingDocs: Array.isArray(missingDocsRaw)
      ? (missingDocsRaw as unknown[]).map(String)
      : [],
  };
}

export class ApiBookingRepository implements BookingRepository {
  constructor(private readonly http: HttpClient) {}

  async list(params: {
    q?: string;
    status?: string;
    customerId?: string;
    departureId?: string;
    packageId?: string;
    ownerId?: string;
  } = {}): Promise<Booking[]> {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.customerId) sp.set("customer_id", params.customerId);
    if (params.departureId) sp.set("departure_id", params.departureId);
    if (params.packageId) sp.set("package_id", params.packageId);
    if (params.ownerId) sp.set("owner_id", params.ownerId);
    sp.set("limit", "100");
    const qs = sp.toString();
    const data = await this.http.request<Raw[]>(`/bookings${qs ? `?${qs}` : ""}`);
    return (Array.isArray(data) ? data : []).map(mapBooking);
  }

  async getById(id: string): Promise<Booking> {
    return mapBooking(await this.http.request<Raw>(`/bookings/${id}`));
  }

  async create(input: BookingCreateInput): Promise<Booking> {
    const raw = await this.http.request<Raw>("/bookings", {
      method: "POST",
      body: JSON.stringify({
        customer_id: input.customerId,
        departure_id: input.departureId,
        lead_id: input.leadId || null,
        pax_count: input.paxCount,
        total_amount: input.totalAmount ?? 0,
        discount_amt: input.discountAmt ?? 0,
        currency: input.currency ?? "USD",
        notes: input.notes ?? "",
      }),
    });
    return mapBooking(raw);
  }

  async update(id: string, input: BookingUpdateInput): Promise<Booking> {
    const raw = await this.http.request<Raw>(`/bookings/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        pax_count: input.paxCount,
        total_amount: input.totalAmount,
        currency: input.currency,
        discount_amt: input.discountAmt,
        notes: input.notes,
      }),
    });
    return mapBooking(raw);
  }

  async changeStatus(id: string, input: ChangeStatusInput): Promise<Booking> {
    return mapBooking(
      await this.http.request<Raw>(`/bookings/${id}/status`, {
        method: "POST",
        body: JSON.stringify({
          status: input.status,
          ...(input.reason ? { reason: input.reason } : {}),
          ...(input.holdExpiresAt ? { hold_expires_at: input.holdExpiresAt } : {}),
          ...(input.override ? { override: true } : {}),
        }),
      }),
    );
  }

  async readiness(id: string): Promise<BookingReadiness> {
    return mapReadiness(await this.http.request<Raw>(`/bookings/${id}/readiness`));
  }

  async overrideReadiness(id: string, reason: string): Promise<void> {
    await this.http.request(`/bookings/${id}/readiness-override`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async listParticipants(id: string): Promise<BookingParticipant[]> {
    const data = await this.http.request<Raw[]>(`/bookings/${id}/participants`);
    return (Array.isArray(data) ? data : []).map(mapParticipant);
  }

  async addParticipant(id: string, input: ParticipantInput): Promise<BookingParticipant> {
    return mapParticipant(
      await this.http.request<Raw>(`/bookings/${id}/participants`, {
        method: "POST",
        body: JSON.stringify({
          full_name: input.fullName,
          passport_no: input.passportNo ?? "",
          nationality: input.nationality ?? "",
          date_of_birth: input.dateOfBirth || null,
        }),
      }),
    );
  }

  async updateParticipant(
    id: string,
    participantId: string,
    input: ParticipantInput,
  ): Promise<BookingParticipant> {
    return mapParticipant(
      await this.http.request<Raw>(`/bookings/${id}/participants/${participantId}`, {
        method: "PATCH",
        body: JSON.stringify({
          full_name: input.fullName,
          passport_no: passportPatchValue(input.passportNo),
          nationality: input.nationality ?? "",
          date_of_birth: input.dateOfBirth || null,
        }),
      }),
    );
  }

  async revealParticipantPassport(id: string, participantId: string): Promise<string> {
    const data = await this.http.request<{ passport_no?: string }>(
      `/bookings/${id}/participants/${participantId}/reveal-passport`,
      { method: "POST", body: JSON.stringify({}) },
    );
    return String(data?.passport_no ?? "");
  }

  async deleteParticipant(id: string, participantId: string): Promise<void> {
    await this.http.request(`/bookings/${id}/participants/${participantId}`, {
      method: "DELETE",
    });
  }

  async listLineItems(id: string): Promise<BookingLineItem[]> {
    const data = await this.http.request<Raw[]>(`/bookings/${id}/line-items`);
    return (Array.isArray(data) ? data : []).map(mapLine);
  }

  async setLineItems(
    id: string,
    items: LineItemInput[],
  ): Promise<{ items: BookingLineItem[]; booking: Booking }> {
    const res = await this.http.raw(`/bookings/${id}/line-items`, {
      method: "PUT",
      body: JSON.stringify({
        items: items.map((it) => ({
          kind: it.kind,
          ...(it.kind === "item" ? { category: it.category ?? "extras" } : {}),
          label: it.label,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          unit_cost: it.unitCost,
        })),
      }),
    });
    const payload = await res.json().catch(() => ({}));
    const data = payload.data ?? payload;
    const meta = payload.meta ?? {};
    return {
      items: (Array.isArray(data) ? data : []).map(mapLine),
      booking: mapBooking((meta.booking ?? {}) as Raw),
    };
  }

  async listChecklist(id: string): Promise<BookingChecklistItem[]> {
    const data = await this.http.request<Raw[]>(`/bookings/${id}/checklist`);
    return (Array.isArray(data) ? data : []).map(mapChecklist);
  }

  async updateChecklist(
    id: string,
    itemId: string,
    completed: boolean,
  ): Promise<BookingChecklistItem> {
    return mapChecklist(
      await this.http.request<Raw>(`/bookings/${id}/checklist/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ completed }),
      }),
    );
  }
}

const store: Booking[] = [];
const parts: Record<string, BookingParticipant[]> = {};
const lines: Record<string, BookingLineItem[]> = {};
const checks: Record<string, BookingChecklistItem[]> = {};
const readinessOverrides: Record<string, string> = {};

function seedChecklist(bookingId: string): BookingChecklistItem[] {
  const defs = [
    { code: "passport", label: "Passport copy", required: true },
    { code: "visa", label: "Visa / entry permit", required: true },
    { code: "photo", label: "Passport photo", required: false },
    { code: "payment", label: "Deposit / payment plan", required: true },
    { code: "flight", label: "Flight confirmation", required: false },
    { code: "vaccine", label: "Health / vaccine form", required: false },
  ];
  return defs.map((d, i) => ({
    id: crypto.randomUUID(),
    bookingId,
    code: d.code,
    label: d.label,
    required: d.required,
    completed: false,
    completedAt: null,
    sortOrder: i,
  }));
}

const allow = (
  status: BookingStatus,
  flags: { reason?: boolean; override?: boolean } = {},
): AllowedTransition => ({
  status,
  requiresReason: Boolean(flags.reason),
  requiresOverride: Boolean(flags.override),
});

/** Demo stand-in for the server-computed `allowed_transitions` (as a manager would see them). */
const DEMO_TRANSITIONS: Record<BookingStatus, AllowedTransition[]> = {
  draft: [allow("quoted"), allow("option_hold"), allow("confirmed"), allow("cancelled", { reason: true })],
  quoted: [allow("option_hold"), allow("confirmed"), allow("draft"), allow("cancelled", { reason: true })],
  option_hold: [allow("confirmed"), allow("quoted", { reason: true }), allow("cancelled", { reason: true })],
  confirmed: [allow("ready", { override: true }), allow("cancelled", { reason: true })],
  partially_paid: [allow("ready", { override: true }), allow("cancelled", { reason: true, override: true })],
  ready: [allow("travelled", { override: true }), allow("cancelled", { reason: true, override: true })],
  travelled: [allow("completed")],
  completed: [],
  cancelled: [],
};

function demoBooking(
  id: string,
  status: BookingStatus,
  amounts: { total: number; cost: number; collected: number; discount?: number },
  extra: Partial<Booking> = {},
): Booking {
  const now = new Date().toISOString();
  const discount = amounts.discount ?? 0;
  return {
    id,
    branchId: "br-1",
    customerId: "cust-1",
    departureId: "dep-1",
    leadId: null,
    status,
    paxCount: 2,
    totalAmount: amounts.total,
    discountAmt: discount,
    costAmt: amounts.cost,
    margin: amounts.total - amounts.cost,
    collectedAmt: amounts.collected,
    balanceAmt: Math.max(0, amounts.total - amounts.collected),
    currency: "USD",
    notes: `Demo ${status.replace("_", " ")} booking`,
    ownerId: "u-sales",
    createdAt: now,
    updatedAt: now,
    holdExpiresAt: null,
    statusChangedAt: now,
    statusReason: "",
    allowedTransitions: DEMO_TRANSITIONS[status],
    ...extra,
  };
}

function ensureDemo() {
  if (store.length > 0) return;
  const id = "bk-demo";
  const hour = 3600_000;
  store.push(
    demoBooking(id, "draft", { total: 300000, cost: 220000, collected: 0 }),
    demoBooking("bk-demo-quoted", "quoted", { total: 450000, cost: 330000, collected: 0 }),
    demoBooking(
      "bk-demo-hold",
      "option_hold",
      { total: 520000, cost: 390000, collected: 0 },
      { holdExpiresAt: new Date(Date.now() + 20 * hour).toISOString() },
    ),
    demoBooking("bk-demo-confirmed", "confirmed", { total: 610000, cost: 450000, collected: 0 }),
    demoBooking("bk-demo-partial", "partially_paid", {
      total: 380000,
      cost: 280000,
      collected: 150000,
      discount: 20000,
    }),
    demoBooking("bk-demo-ready", "ready", { total: 290000, cost: 210000, collected: 290000 }),
    demoBooking(
      "bk-demo-cancelled",
      "cancelled",
      { total: 200000, cost: 0, collected: 0 },
      { statusReason: "Customer withdrew before deposit" },
    ),
  );
  parts[id] = [
    {
      id: "bp-1",
      bookingId: id,
      fullName: "Ahmed Demo",
      passportNo: "••••4567",
      passportLast4: "4567",
      nationality: "EG",
      dateOfBirth: "1990-01-15",
      createdAt: new Date().toISOString(),
    },
  ];
  lines[id] = [
    {
      id: "bl-1",
      bookingId: id,
      kind: "item",
      category: "package",
      label: "Umrah package",
      quantity: 2,
      unitPrice: 150000,
      unitCost: 110000,
      lineTotal: 300000,
      lineCost: 220000,
      sortOrder: 0,
    },
  ];
  for (const b of store) {
    parts[b.id] ??= [];
    lines[b.id] ??= [];
    checks[b.id] = seedChecklist(b.id);
  }
}

export class MemoryBookingRepository implements BookingRepository {
  async list(params: {
    q?: string;
    status?: string;
    customerId?: string;
    departureId?: string;
    packageId?: string;
  } = {}): Promise<Booking[]> {
    ensureDemo();
    return store.filter((b) => {
      if (params.status && b.status !== params.status) return false;
      if (params.customerId && b.customerId !== params.customerId) return false;
      if (params.departureId && b.departureId !== params.departureId) return false;
      if (params.q) {
        const q = params.q.toLowerCase();
        if (!b.id.includes(q) && !b.notes.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  async getById(id: string): Promise<Booking> {
    ensureDemo();
    const b = store.find((x) => x.id === id);
    if (!b) throw new Error("booking not found");
    return { ...b };
  }

  async create(input: BookingCreateInput): Promise<Booking> {
    ensureDemo();
    const id = crypto.randomUUID();
    const b = demoBooking(
      id,
      "draft",
      {
        total: input.totalAmount ?? 0,
        cost: 0,
        collected: 0,
        discount: input.discountAmt ?? 0,
      },
      {
        customerId: input.customerId,
        departureId: input.departureId,
        leadId: input.leadId ?? null,
        paxCount: input.paxCount,
        currency: input.currency ?? "USD",
        notes: input.notes ?? "",
        ownerId: "u-local",
      },
    );
    store.unshift(b);
    parts[id] = [];
    lines[id] = [];
    checks[id] = seedChecklist(id);
    return { ...b };
  }

  async update(id: string, input: BookingUpdateInput): Promise<Booking> {
    const b = await this.getById(id);
    if (b.status !== "draft") throw new Error("only draft bookings can be updated");
    b.paxCount = input.paxCount;
    b.totalAmount = input.totalAmount;
    b.currency = input.currency;
    if (input.discountAmt != null) b.discountAmt = input.discountAmt;
    if (input.notes != null) b.notes = input.notes;
    b.balanceAmt = Math.max(0, b.totalAmount - b.collectedAmt);
    b.margin = b.totalAmount - b.costAmt - b.discountAmt;
    b.updatedAt = new Date().toISOString();
    const i = store.findIndex((x) => x.id === id);
    store[i] = b;
    return { ...b };
  }

  async changeStatus(id: string, input: ChangeStatusInput): Promise<Booking> {
    const b = await this.getById(id);
    if (!b.allowedTransitions.some((tr) => tr.status === input.status)) {
      throw new Error("invalid transition");
    }
    const now = new Date().toISOString();
    b.status = input.status;
    b.holdExpiresAt = input.status === "option_hold" ? (input.holdExpiresAt ?? null) : null;
    b.statusReason = input.reason ?? "";
    b.statusChangedAt = now;
    b.allowedTransitions = DEMO_TRANSITIONS[input.status];
    b.updatedAt = now;
    const i = store.findIndex((x) => x.id === id);
    store[i] = b;
    return { ...b };
  }

  async readiness(id: string): Promise<BookingReadiness> {
    const b = await this.getById(id);
    const p = parts[id] ?? [];
    const cl = checks[id] ?? [];
    const req = cl.filter((c) => c.required);
    const done = req.filter((c) => c.completed).length;
    const incomplete = req.length - done;
    const blocking: string[] = [];
    const overrideActive = Boolean(readinessOverrides[id]);
    const missingDocs = incomplete > 0
      ? req.filter((c) => !c.completed).map((c) => c.code)
      : [];
    if (b.status !== "draft") blocking.push("booking is not in draft status");
    if (p.length < b.paxCount) blocking.push("participants incomplete for pax_count");
    if (incomplete > 0 && !overrideActive) {
      blocking.push("required checklist items incomplete");
    }
    const missing = p.filter((x) => !x.passportNo).length;
    const warnings: string[] = [];
    const risks: string[] = [];
    if (missing) {
      warnings.push("passport details missing for one or more participants");
      risks.push("missing passports");
    }
    if (b.balanceAmt > 0) warnings.push("outstanding balance remaining");
    if (overrideActive) warnings.push("readiness override active");
    return {
      booking_id: id,
      can_confirm: blocking.length === 0,
      blocking,
      warnings,
      participants_count: p.length,
      pax_count: b.paxCount,
      missing_passports: missing,
      checklist_required: req.length,
      checklist_completed: done,
      checklist_incomplete: incomplete,
      balance_amt: b.balanceAmt,
      days_to_departure: 30,
      risk_alerts: risks,
      overrideActive,
      missingDocs,
    };
  }

  async overrideReadiness(id: string, reason: string): Promise<void> {
    await this.getById(id);
    if (!reason.trim()) throw new Error("reason is required");
    readinessOverrides[id] = reason.trim();
  }

  async listParticipants(id: string): Promise<BookingParticipant[]> {
    await this.getById(id);
    return [...(parts[id] ?? [])];
  }

  async addParticipant(id: string, input: ParticipantInput): Promise<BookingParticipant> {
    const b = await this.getById(id);
    const list = parts[id] ?? [];
    if (list.length >= b.paxCount) throw new Error("participant count would exceed pax_count");
    const p: BookingParticipant = {
      id: crypto.randomUUID(),
      bookingId: id,
      fullName: input.fullName,
      passportNo: toMaskedSecret(input.passportNo),
      passportLast4: maskedLast4(toMaskedSecret(input.passportNo)),
      nationality: input.nationality ?? "",
      dateOfBirth: input.dateOfBirth ?? null,
      createdAt: new Date().toISOString(),
    };
    parts[id] = [...list, p];
    return p;
  }

  async updateParticipant(
    id: string,
    participantId: string,
    input: ParticipantInput,
  ): Promise<BookingParticipant> {
    const list = parts[id] ?? [];
    const i = list.findIndex((p) => p.id === participantId);
    if (i < 0) throw new Error("participant not found");
    const passport = passportPatchValue(input.passportNo);
    list[i] = {
      ...list[i],
      fullName: input.fullName,
      ...(passport
        ? { passportNo: toMaskedSecret(passport), passportLast4: maskedLast4(toMaskedSecret(passport)) }
        : {}),
      nationality: input.nationality ?? "",
      dateOfBirth: input.dateOfBirth ?? null,
    };
    parts[id] = list;
    return { ...list[i] };
  }

  async revealParticipantPassport(): Promise<string> {
    throw new Error("Passport reveal requires the backend");
  }

  async deleteParticipant(id: string, participantId: string): Promise<void> {
    const b = await this.getById(id);
    if (b.status !== "draft") throw new Error("only draft");
    parts[id] = (parts[id] ?? []).filter((p) => p.id !== participantId);
  }

  async listLineItems(id: string): Promise<BookingLineItem[]> {
    await this.getById(id);
    return [...(lines[id] ?? [])];
  }

  async setLineItems(
    id: string,
    items: LineItemInput[],
  ): Promise<{ items: BookingLineItem[]; booking: Booking }> {
    const b = await this.getById(id);
    if (b.status !== "draft") throw new Error("only draft");
    const mapped: BookingLineItem[] = items.map((it, i) => ({
      id: crypto.randomUUID(),
      bookingId: id,
      kind: it.kind,
      category: it.category,
      label: it.label,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      unitCost: it.unitCost,
      lineTotal: it.quantity * it.unitPrice,
      lineCost: it.quantity * it.unitCost,
      sortOrder: i,
    }));
    lines[id] = mapped;
    const total = mapped.reduce((s, l) => s + l.lineTotal, 0) - b.discountAmt;
    const cost = mapped.reduce((s, l) => s + l.lineCost, 0);
    b.totalAmount = Math.max(0, total);
    b.costAmt = cost;
    b.margin = b.totalAmount - b.costAmt - b.discountAmt;
    b.balanceAmt = Math.max(0, b.totalAmount - b.collectedAmt);
    b.updatedAt = new Date().toISOString();
    const idx = store.findIndex((x) => x.id === id);
    store[idx] = b;
    return { items: mapped, booking: { ...b } };
  }

  async listChecklist(id: string): Promise<BookingChecklistItem[]> {
    await this.getById(id);
    if (!checks[id]?.length) checks[id] = seedChecklist(id);
    return [...checks[id]];
  }

  async updateChecklist(
    id: string,
    itemId: string,
    completed: boolean,
  ): Promise<BookingChecklistItem> {
    const list = await this.listChecklist(id);
    const i = list.findIndex((c) => c.id === itemId);
    if (i < 0) throw new Error("checklist item not found");
    list[i] = {
      ...list[i],
      completed,
      completedAt: completed ? new Date().toISOString() : null,
    };
    checks[id] = list;
    return { ...list[i] };
  }
}

export function createBookingRepository(): BookingRepository {
  const api = new ApiBookingRepository(http);
  const memory = new MemoryBookingRepository();
  return createRepository<BookingRepository>({
    api,
    memory,
    reads: [
      "list",
      "getById",
      "readiness",
      "listParticipants",
      "listLineItems",
      "listChecklist",
    ],
  });
}
