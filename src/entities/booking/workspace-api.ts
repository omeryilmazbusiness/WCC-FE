import { http, type HttpClient } from "@/shared/api/http-client";
import { createRepository } from "@/shared/api/repository";
import { mapBooking, MemoryBookingRepository, matchesSegment, profilePayload } from "./api";
import { bookingListQuery, endOfLocalDay } from "./lib/workspace";
import type { Booking, BookingProfile } from "./model";
import {
  BOOKING_SEGMENTS,
  CHANGE_KINDS,
  CHANGE_STATUSES,
  type BookingActivity,
  type BookingChangeRequest,
  type BookingListParams,
  type BookingNote,
  type BookingStats,
  type CancellationQuote,
  type ChangeKind,
  type PaymentLink,
  type ShareChannel,
  type ShareDocument,
} from "./workspace-model";

/**
 * Booking workspace operations (profile, option, notes, change requests, activity,
 * sharing, payment links). Kept apart from {@link BookingRepository} so screens that only
 * list or edit bookings do not depend on them.
 */
export interface BookingWorkspaceRepository {
  stats(params?: BookingListParams): Promise<BookingStats>;
  updateProfile(id: string, profile: BookingProfile): Promise<Booking>;
  /** RFC 3339; must be later than the current deadline. */
  extendHold(id: string, holdExpiresAt: string): Promise<Booking>;
  cancellationQuote(id: string): Promise<CancellationQuote>;
  listNotes(id: string): Promise<BookingNote[]>;
  addNote(id: string, body: string, pinned: boolean): Promise<BookingNote>;
  deleteNote(id: string, noteId: string): Promise<void>;
  listChanges(id: string): Promise<BookingChangeRequest[]>;
  requestChange(id: string, kind: ChangeKind, details: string): Promise<BookingChangeRequest>;
  resolveChange(id: string, changeId: string, status: "completed" | "rejected", note: string): Promise<BookingChangeRequest>;
  activity(id: string): Promise<BookingActivity[]>;
  recordShare(id: string, channel: ShareChannel, document: ShareDocument): Promise<void>;
  /** 409 `payment_gateway_unconfigured` when no checkout provider is set up. `amount` 0 = full balance. */
  createPaymentLink(id: string, amount: number): Promise<PaymentLink>;
}

type Raw = Record<string, unknown>;

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => Number(v ?? 0) || 0;
const list = (v: unknown): Raw[] => (Array.isArray(v) ? (v as Raw[]) : []);

export function mapStats(raw: Raw): BookingStats {
  return {
    active: num(raw.active),
    optionToday: num(raw.option_today),
    optionUrgent: num(raw.option_urgent),
    paymentDue: num(raw.payment_due),
    overdue: num(raw.overdue),
    visaPending: num(raw.visa_pending),
    issued: num(raw.issued),
    cancelled: num(raw.cancelled),
    total: num(raw.total),
  };
}

function mapNote(raw: Raw): BookingNote {
  return {
    id: str(raw.id),
    bookingId: str(raw.booking_id),
    authorId: str(raw.author_id),
    authorName: str(raw.author_name),
    body: str(raw.body),
    pinned: Boolean(raw.pinned),
    canDelete: Boolean(raw.can_delete),
    createdAt: str(raw.created_at),
  };
}

function mapChange(raw: Raw): BookingChangeRequest {
  const kind = str(raw.kind);
  const status = str(raw.status);
  return {
    id: str(raw.id),
    bookingId: str(raw.booking_id),
    kind: (CHANGE_KINDS as readonly string[]).includes(kind) ? (kind as ChangeKind) : "other",
    details: str(raw.details),
    status: (CHANGE_STATUSES as readonly string[]).includes(status) ? (status as BookingChangeRequest["status"]) : "requested",
    requestedBy: str(raw.requested_by),
    requestedByName: str(raw.requested_by_name),
    resolutionNote: str(raw.resolution_note),
    createdAt: str(raw.created_at),
    resolvedAt: str(raw.resolved_at) || null,
  };
}

function mapActivity(raw: Raw): BookingActivity {
  return {
    id: str(raw.id),
    action: str(raw.action),
    entityType: str(raw.entity_type),
    actorName: str(raw.actor_name),
    actorType: str(raw.actor_type),
    details: raw.details && typeof raw.details === "object" ? (raw.details as Record<string, unknown>) : {},
    createdAt: str(raw.created_at),
  };
}

export function mapQuote(raw: Raw): CancellationQuote {
  return {
    daysToDeparture: num(raw.days_to_departure),
    penaltyPct: num(raw.penalty_pct),
    penaltyAmt: num(raw.penalty_amt),
    refundableAmt: num(raw.refundable_amt),
    collectedAmt: num(raw.collected_amt),
    totalAmount: num(raw.total_amount),
    currency: str(raw.currency),
    policy: list(raw.policy).map((t) => ({ minDays: num(t.min_days), penaltyPct: num(t.penalty_pct) })),
  };
}

export class ApiBookingWorkspaceRepository implements BookingWorkspaceRepository {
  constructor(private readonly http: HttpClient) {}

  private post<T>(path: string, body: unknown): Promise<T> {
    return this.http.request<T>(path, { method: "POST", body: JSON.stringify(body) });
  }

  async stats(params: BookingListParams = {}): Promise<BookingStats> {
    const scope: BookingListParams = { ...params, segment: undefined, sort: undefined, limit: 1 };
    return mapStats(await this.http.request<Raw>(`/bookings/stats?${bookingListQuery(scope)}`));
  }

  async updateProfile(id: string, profile: BookingProfile): Promise<Booking> {
    return mapBooking(
      await this.http.request<Raw>(`/bookings/${id}/profile`, { method: "PATCH", body: JSON.stringify(profilePayload(profile)) }),
    );
  }

  async extendHold(id: string, holdExpiresAt: string): Promise<Booking> {
    return mapBooking(await this.post<Raw>(`/bookings/${id}/hold/extend`, { hold_expires_at: holdExpiresAt }));
  }

  async cancellationQuote(id: string): Promise<CancellationQuote> {
    return mapQuote(await this.http.request<Raw>(`/bookings/${id}/cancellation-quote`));
  }

  async listNotes(id: string): Promise<BookingNote[]> {
    return list(await this.http.request<unknown>(`/bookings/${id}/notes`)).map(mapNote);
  }

  async addNote(id: string, body: string, pinned: boolean): Promise<BookingNote> {
    return mapNote(await this.post<Raw>(`/bookings/${id}/notes`, { body, pinned }));
  }

  async deleteNote(id: string, noteId: string): Promise<void> {
    await this.http.request(`/bookings/${id}/notes/${noteId}`, { method: "DELETE" });
  }

  async listChanges(id: string): Promise<BookingChangeRequest[]> {
    return list(await this.http.request<unknown>(`/bookings/${id}/changes`)).map(mapChange);
  }

  async requestChange(id: string, kind: ChangeKind, details: string): Promise<BookingChangeRequest> {
    return mapChange(await this.post<Raw>(`/bookings/${id}/changes`, { kind, details }));
  }

  async resolveChange(id: string, changeId: string, status: "completed" | "rejected", note: string): Promise<BookingChangeRequest> {
    return mapChange(await this.post<Raw>(`/bookings/${id}/changes/${changeId}/resolve`, { status, note }));
  }

  async activity(id: string): Promise<BookingActivity[]> {
    return list(await this.http.request<unknown>(`/bookings/${id}/activity`)).map(mapActivity);
  }

  async recordShare(id: string, channel: ShareChannel, document: ShareDocument): Promise<void> {
    await this.post(`/bookings/${id}/shares`, { channel, document });
  }

  async createPaymentLink(id: string, amount: number): Promise<PaymentLink> {
    const raw = await this.post<Raw>(`/bookings/${id}/payment-link`, { amount });
    return { url: str(raw.url), amount: num(raw.amount), currency: str(raw.currency), ref: str(raw.ref) };
  }
}

const notes: Record<string, BookingNote[]> = {};
const changes: Record<string, BookingChangeRequest[]> = {};

/** Demo twin: reads mirror the server shape; writes stay local to the tab. */
export class MemoryBookingWorkspaceRepository implements BookingWorkspaceRepository {
  constructor(private readonly bookings = new MemoryBookingRepository()) {}

  async stats(params: BookingListParams = {}): Promise<BookingStats> {
    const rows = await this.bookings.list({ ...params, segment: undefined });
    const dayEnd = params.dayEnd ?? endOfLocalDay();
    const count = (s: (typeof BOOKING_SEGMENTS)[number]) => rows.filter((b) => matchesSegment(b, s, dayEnd)).length;
    return {
      active: rows.filter((b) => !["cancelled", "completed"].includes(b.status)).length,
      optionToday: count("option_today"),
      optionUrgent: rows.filter((b) => b.holdExpiresAt && Date.parse(b.holdExpiresAt) - Date.now() < 2 * 3_600_000).length,
      paymentDue: count("payment_due"),
      overdue: count("overdue"),
      visaPending: count("visa_pending"),
      issued: count("issued"),
      cancelled: count("cancelled"),
      total: rows.length,
    };
  }

  async updateProfile(id: string, profile: BookingProfile): Promise<Booking> {
    const b = await this.bookings.getById(id);
    return { ...b, ...profile, pnr: profile.pnr.trim().toUpperCase() };
  }

  async extendHold(id: string, holdExpiresAt: string): Promise<Booking> {
    const b = await this.bookings.getById(id);
    return { ...b, holdExpiresAt };
  }

  async cancellationQuote(id: string): Promise<CancellationQuote> {
    const b = await this.bookings.getById(id);
    const penaltyPct = b.status === "option_hold" || b.status === "draft" || b.status === "quoted" ? 0 : 25;
    const penaltyAmt = Math.round((b.totalAmount * penaltyPct) / 100);
    return {
      daysToDeparture: 30,
      penaltyPct,
      penaltyAmt,
      refundableAmt: Math.max(0, b.collectedAmt - penaltyAmt),
      collectedAmt: b.collectedAmt,
      totalAmount: b.totalAmount,
      currency: b.currency,
      policy: [
        { minDays: 45, penaltyPct: 10 },
        { minDays: 30, penaltyPct: 25 },
        { minDays: 15, penaltyPct: 50 },
        { minDays: 7, penaltyPct: 75 },
        { minDays: 0, penaltyPct: 100 },
      ],
    };
  }

  async listNotes(id: string): Promise<BookingNote[]> {
    return [...(notes[id] ?? [])];
  }

  async addNote(id: string, body: string, pinned: boolean): Promise<BookingNote> {
    const note: BookingNote = {
      id: crypto.randomUUID(),
      bookingId: id,
      authorId: "u-local",
      authorName: "You",
      body: body.trim(),
      pinned,
      canDelete: true,
      createdAt: new Date().toISOString(),
    };
    notes[id] = [note, ...(notes[id] ?? [])];
    return note;
  }

  async deleteNote(id: string, noteId: string): Promise<void> {
    notes[id] = (notes[id] ?? []).filter((n) => n.id !== noteId);
  }

  async listChanges(id: string): Promise<BookingChangeRequest[]> {
    return [...(changes[id] ?? [])];
  }

  async requestChange(id: string, kind: ChangeKind, details: string): Promise<BookingChangeRequest> {
    const cr: BookingChangeRequest = {
      id: crypto.randomUUID(),
      bookingId: id,
      kind,
      details: details.trim(),
      status: "requested",
      requestedBy: "u-local",
      requestedByName: "You",
      resolutionNote: "",
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };
    changes[id] = [cr, ...(changes[id] ?? [])];
    return cr;
  }

  async resolveChange(id: string, changeId: string, status: "completed" | "rejected", note: string): Promise<BookingChangeRequest> {
    const all = changes[id] ?? [];
    const i = all.findIndex((c) => c.id === changeId);
    if (i < 0) throw new Error("change request not found");
    all[i] = { ...all[i], status, resolutionNote: note.trim(), resolvedAt: new Date().toISOString() };
    return { ...all[i] };
  }

  async activity(): Promise<BookingActivity[]> {
    return [];
  }

  async recordShare(): Promise<void> {}

  async createPaymentLink(): Promise<PaymentLink> {
    throw new Error("Payment links require the backend");
  }
}

export function createBookingWorkspaceRepository(): BookingWorkspaceRepository {
  return createRepository<BookingWorkspaceRepository>({
    api: new ApiBookingWorkspaceRepository(http),
    memory: new MemoryBookingWorkspaceRepository(),
    reads: ["stats", "cancellationQuote", "listNotes", "listChanges", "activity"],
  });
}
