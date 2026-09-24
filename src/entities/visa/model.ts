export type VisaStatus =
  | "draft"
  | "submitted"
  | "processing"
  | "approved"
  | "rejected"
  | "issued"
  | "cancelled";

export type VisaCase = {
  id: string;
  branchId: string;
  bookingId: string;
  participantId: string | null;
  customerId: string | null;
  status: VisaStatus;
  externalRef: string;
  notes: string;
  submittedAt: string | null;
  decidedAt: string | null;
  expiresAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  events?: VisaEvent[];
};

export type VisaEvent = {
  id: string;
  visaCaseId: string;
  fromStatus: VisaStatus;
  toStatus: VisaStatus;
  actorId: string | null;
  note: string;
  createdAt: string;
};

/** Suggested next statuses from current (matches BE ValidTransition). */
export const VISA_NEXT: Record<VisaStatus, VisaStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["processing", "rejected", "cancelled"],
  processing: ["approved", "rejected", "issued", "cancelled"],
  approved: ["issued", "cancelled"],
  rejected: ["draft", "cancelled"],
  issued: ["cancelled"],
  cancelled: [],
};

export const VISA_STATUSES: VisaStatus[] = [
  "draft",
  "submitted",
  "processing",
  "approved",
  "rejected",
  "issued",
  "cancelled",
];
