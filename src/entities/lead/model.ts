export type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "paid"
  | "won"
  | "lost";

export const LEAD_STAGES: LeadStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "paid",
  "won",
  "lost",
];

export const PIPELINE_COLUMNS: LeadStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "paid",
  "won",
  "lost",
];

export const LOST_REASON_CODES = [
  "price",
  "competitor",
  "timing",
  "no_response",
  "not_interested",
  "other",
] as const;

export type LostReasonCode = (typeof LOST_REASON_CODES)[number];

/** What the customer asked for. budgetAmount is in minor units. */
export type TripInterest = {
  travelDate: string | null;
  travelWindow: string;
  paxCount: number | null;
  budgetAmount: number | null;
  budgetCurrency: string;
  packageId: string | null;
  packageInterest: string;
};

export function emptyTripInterest(): TripInterest {
  return {
    travelDate: null,
    travelWindow: "",
    paxCount: null,
    budgetAmount: null,
    budgetCurrency: "",
    packageId: null,
    packageInterest: "",
  };
}

export function hasTripInterest(t: TripInterest): boolean {
  return Boolean(
    t.travelDate ||
      t.travelWindow ||
      t.paxCount ||
      t.budgetAmount != null ||
      t.packageId ||
      t.packageInterest,
  );
}

export type Lead = {
  id: string;
  branchId: string;
  customerId?: string | null;
  fullName: string;
  phone: string;
  source: string;
  stage: LeadStage;
  ownerId: string;
  ownerName: string;
  lostReasonCode: string;
  lostReason: string;
  notes: string;
  interest: TripInterest;
  noFollowUp: boolean;
  convertedBookingId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadCreateInput = {
  fullName: string;
  phone: string;
  source?: string;
  ownerId: string;
  ownerName: string;
  notes?: string;
  customerId?: string | null;
  interest?: TripInterest;
};

/** Undefined fields stay unchanged; interest replaces the whole interest. */
export type LeadUpdateInput = {
  fullName?: string;
  phone?: string;
  notes?: string;
  interest?: TripInterest;
};

export type ChangeStageInput = {
  stage: LeadStage;
  lostReasonCode?: string;
  lostReason?: string;
  note?: string;
};

export type ConvertLeadInput = {
  departureId: string;
  paxCount?: number;
  totalAmount?: number;
  currency?: string;
};

export type ConvertLeadResult = {
  lead: Lead;
  bookingId: string;
};

export type StageHistoryItem = {
  id: string;
  leadId: string;
  fromStage: string | null;
  toStage: string;
  changedBy: string;
  note: string;
  createdAt: string;
};

export type LeadAnalytics = {
  total: number;
  open: number;
  won: number;
  lost: number;
  conversion_rate: number;
  no_follow_up: number;
  by_stage: { key: string; count: number }[];
  by_source: { source: string; count: number; won: number }[];
  by_owner: {
    owner_id: string;
    owner_name: string;
    count: number;
    won: number;
    lost: number;
  }[];
};

export type LeadOwner = { id: string; name: string };

const ALLOWED: Record<LeadStage, LeadStage[]> = {
  new: ["contacted", "lost"],
  contacted: ["qualified", "lost"],
  qualified: ["proposal", "lost"],
  proposal: ["paid", "lost"],
  paid: ["won", "lost"],
  won: [],
  lost: [],
};

export function canTransitionLead(from: LeadStage, to: LeadStage): boolean {
  return ALLOWED[from].includes(to);
}

export function nextStages(from: LeadStage): LeadStage[] {
  return ALLOWED[from];
}

export function isOpenStage(stage: LeadStage): boolean {
  return stage !== "won" && stage !== "lost";
}

/**
 * Stages a lead walks through to reach won when converted to a booking;
 * null when it has not reached proposal. Mirrors the backend's ConversionPath.
 */
export function conversionPath(from: LeadStage): LeadStage[] | null {
  switch (from) {
    case "proposal":
      return ["paid", "won"];
    case "paid":
      return ["won"];
    case "won":
      return [];
    default:
      return null;
  }
}
