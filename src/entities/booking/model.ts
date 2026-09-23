export type BookingStatus = "draft" | "confirmed" | "cancelled" | "completed";

export type LineKind =
  | "package"
  | "hotel"
  | "room"
  | "transport"
  | "flight"
  | "extras";

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
};

export type BookingParticipant = {
  id: string;
  bookingId: string;
  fullName: string;
  passportNo: string;
  nationality: string;
  dateOfBirth: string | null;
  createdAt: string;
};

export type BookingLineItem = {
  id: string;
  bookingId: string;
  kind: LineKind | string;
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
  kind: string;
  label: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
};

export type ParticipantInput = {
  fullName: string;
  passportNo?: string;
  nationality?: string;
  dateOfBirth?: string | null;
};

export const LINE_KINDS: LineKind[] = [
  "package",
  "hotel",
  "room",
  "transport",
  "flight",
  "extras",
];
