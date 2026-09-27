export const BOOKING_STATUSES = [
  "draft",
  "quoted",
  "option_hold",
  "confirmed",
  "partially_paid",
  "ready",
  "travelled",
  "completed",
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && (BOOKING_STATUSES as readonly string[]).includes(value);
}

/** Server-computed for the caller; the UI renders transitions only from this list. */
export type AllowedTransition = {
  status: BookingStatus;
  requiresReason: boolean;
  requiresOverride: boolean;
};

export const LINE_KINDS = ["item", "tax", "fee"] as const;

export type LineKind = (typeof LINE_KINDS)[number];

/** Pre-Epic-21 categories (package, hotel, …) are commercial items. */
export function toLineKind(value: unknown): LineKind {
  return value === "tax" || value === "fee" ? value : "item";
}

/** What an item line sells; the backend requires one on item lines and rejects it on tax/fee. */
export const LINE_CATEGORIES = ["package", "hotel", "room", "transport", "flight", "extras"] as const;

export type LineCategory = (typeof LINE_CATEGORIES)[number];

function isLineCategory(value: unknown): value is LineCategory {
  return (LINE_CATEGORIES as readonly unknown[]).includes(value);
}

/** Single picker value for the editor: an item category, or tax / fee. */
export const LINE_TYPES = [...LINE_CATEGORIES, "tax", "fee"] as const;

export type LineType = (typeof LINE_TYPES)[number];

export function toLineType(kind: LineKind, category: LineCategory | null): LineType {
  return kind === "item" ? (category ?? "extras") : kind;
}

export function fromLineType(type: LineType): { kind: LineKind; category: LineCategory | null } {
  return type === "tax" || type === "fee" ? { kind: type, category: null } : { kind: "item", category: type };
}

/** Reads `category`, or a legacy `kind` that carried the category. */
export function toLineCategory(kind: unknown, category: unknown): LineCategory | null {
  if (isLineCategory(category)) return category;
  if (isLineCategory(kind)) return kind;
  return toLineKind(kind) === "item" ? "extras" : null;
}

export type Booking = {
  id: string;
  branchId: string;
  customerId: string;
  departureId: string;
  leadId: string | null;
  status: BookingStatus;
  paxCount: number;
  totalAmount: number;
  discountAmt: number;
  costAmt: number;
  margin: number;
  collectedAmt: number;
  balanceAmt: number;
  currency: string;
  notes: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  holdExpiresAt: string | null;
  statusChangedAt: string | null;
  statusReason: string;
  allowedTransitions: AllowedTransition[];
};

export type ChangeStatusInput = {
  status: BookingStatus;
  reason?: string;
  /** RFC 3339; required for `option_hold`. */
  holdExpiresAt?: string;
  override?: boolean;
};

export type BookingParticipant = {
  id: string;
  bookingId: string;
  fullName: string;
  /** Always masked by the API ("••••1234"); the full value only via the reveal endpoint. */
  passportNo: string;
  passportLast4: string;
  nationality: string;
  dateOfBirth: string | null;
  createdAt: string;
};

export type BookingLineItem = {
  id: string;
  bookingId: string;
  kind: LineKind;
  category: LineCategory | null;
  label: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  lineTotal: number;
  lineCost: number;
  sortOrder: number;
};

export type BookingChecklistItem = {
  id: string;
  bookingId: string;
  code: string;
  label: string;
  required: boolean;
  completed: boolean;
  completedAt: string | null;
  sortOrder: number;
};

export type BookingReadiness = {
  booking_id: string;
  can_confirm: boolean;
  blocking: string[];
  warnings: string[];
  participants_count: number;
  pax_count: number;
  missing_passports: number;
  checklist_required: number;
  checklist_completed: number;
  checklist_incomplete: number;
  balance_amt: number;
  days_to_departure?: number | null;
  risk_alerts: string[];
  overrideActive: boolean;
  missingDocs: string[];
};

export type BookingCreateInput = {
  customerId: string;
  departureId: string;
  leadId?: string | null;
  paxCount: number;
  totalAmount?: number;
  discountAmt?: number;
  currency?: string;
  notes?: string;
};

export type BookingUpdateInput = {
  paxCount: number;
  totalAmount: number;
  currency: string;
  discountAmt?: number;
  notes?: string;
};

export type LineItemInput = {
  kind: LineKind;
  category: LineCategory | null;
  label: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
};

export type ParticipantInput = {
  fullName: string;
  /** On update, blank or the masked value keeps the stored passport. */
  passportNo?: string;
  nationality?: string;
  dateOfBirth?: string | null;
};