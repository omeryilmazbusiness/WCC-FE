import type { BookingStatus, SalesChannel, ServiceType } from "./model";

/** Operations segments counted by `GET /bookings/stats` and filterable on the list. */
export const BOOKING_SEGMENTS = [
  "option_today",
  "payment_due",
  "visa_pending",
  "overdue",
  "issued",
  "cancelled",
] as const;
export type BookingSegment = (typeof BOOKING_SEGMENTS)[number];

export const BOOKING_DATE_FIELDS = ["created", "depart", "return"] as const;
export type BookingDateField = (typeof BOOKING_DATE_FIELDS)[number];

export const BOOKING_SORTS = ["recent", "ttl", "depart"] as const;
export type BookingSort = (typeof BOOKING_SORTS)[number];

export type BookingListParams = {
  q?: string;
  status?: BookingStatus;
  customerId?: string;
  departureId?: string;
  packageId?: string;
  ownerId?: string;
  serviceType?: ServiceType;
  channel?: SalesChannel;
  segment?: BookingSegment;
  dateField?: BookingDateField;
  /** Inclusive `YYYY-MM-DD` bounds on {@link dateField}. */
  from?: string;
  to?: string;
  sort?: BookingSort;
  /** RFC 3339 end of the viewer's local day; anchors the `option_today` segment. */
  dayEnd?: string;
  limit?: number;
};

export type BookingStats = {
  active: number;
  optionToday: number;
  optionUrgent: number;
  paymentDue: number;
  overdue: number;
  visaPending: number;
  issued: number;
  cancelled: number;
  total: number;
};

export type BookingNote = {
  id: string;
  bookingId: string;
  authorId: string;
  authorName: string;
  body: string;
  pinned: boolean;
  canDelete: boolean;
  createdAt: string;
};

export const CHANGE_KINDS = ["date_change", "name_change", "route_change", "other"] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];

export const CHANGE_STATUSES = ["requested", "completed", "rejected"] as const;
export type ChangeStatus = (typeof CHANGE_STATUSES)[number];

export type BookingChangeRequest = {
  id: string;
  bookingId: string;
  kind: ChangeKind;
  details: string;
  status: ChangeStatus;
  requestedBy: string;
  requestedByName: string;
  resolutionNote: string;
  createdAt: string;
  resolvedAt: string | null;
};

export type BookingActivity = {
  id: string;
  action: string;
  entityType: string;
  actorName: string;
  actorType: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type CancellationTier = { minDays: number; penaltyPct: number };

export type CancellationQuote = {
  daysToDeparture: number;
  penaltyPct: number;
  penaltyAmt: number;
  refundableAmt: number;
  collectedAmt: number;
  totalAmount: number;
  currency: string;
  policy: CancellationTier[];
};

export const SHARE_CHANNELS = ["whatsapp", "email", "sms", "copy"] as const;
export type ShareChannel = (typeof SHARE_CHANNELS)[number];

export const SHARE_DOCUMENTS = [
  "voucher",
  "eticket",
  "proforma",
  "contract",
  "receipt",
  "payment_link",
  "summary",
] as const;
export type ShareDocument = (typeof SHARE_DOCUMENTS)[number];

export type PaymentLink = { url: string; amount: number; currency: string; ref: string };

/** Error code when no checkout provider is configured on the server. */
export const PAYMENT_GATEWAY_UNCONFIGURED = "payment_gateway_unconfigured";
