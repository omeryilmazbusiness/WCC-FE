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

export const LEAD_SERVICES = ["flight", "hotel", "tour", "visa", "transfer", "other"] as const;
export type LeadService = (typeof LEAD_SERVICES)[number];

export const CABIN_CLASSES = ["economy", "premium_economy", "business", "first"] as const;
export type CabinClass = (typeof CABIN_CLASSES)[number];

export const BOARD_TYPES = [
  "room_only",
  "bed_breakfast",
  "half_board",
  "full_board",
  "all_inclusive",
  "ultra_all_inclusive",
] as const;
export type BoardType = (typeof BOARD_TYPES)[number];

export const TRIP_PREFERENCES = [
  "direct_flight",
  "extra_baggage",
  "use_miles",
  "seat_selection",
  "special_meal",
  "accessibility",
] as const;
export type TripPreference = (typeof TRIP_PREFERENCES)[number];

/** Preferences that only make sense for a flight. */
export const FLIGHT_PREFERENCES: readonly TripPreference[] = [
  "direct_flight",
  "extra_baggage",
  "use_miles",
  "seat_selection",
];

export const LEAD_SEGMENTS = ["b2c", "b2b"] as const;
export type LeadSegment = (typeof LEAD_SEGMENTS)[number];

export const LEAD_PRIORITIES = ["high", "medium", "low"] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const LEAD_INTENTS = ["ready", "comparing", "planning"] as const;
export type LeadIntent = (typeof LEAD_INTENTS)[number];

export const MAX_CHILD_AGE = 17;
export const MAX_CHILDREN = 20;
export const MAX_FLEX_DAYS = 30;

/**
 * What the customer asked for. Dates are YYYY-MM-DD; budgetAmount is in minor
 * units; paxCount is adults + children + infants once a breakdown is given.
 */
export type TripInterest = {
  services: LeadService[];
  /** IATA codes for flights, else free text. */
  origin: string;
  destination: string;
  travelDate: string | null;
  returnDate: string | null;
  /** ± days the dates may move; 0 = exact. */
  flexDays: number;
  travelWindow: string;
  adults: number;
  childAges: number[];
  infants: number;
  paxCount: number | null;
  cabinClass: CabinClass | "";
  boardType: BoardType | "";
  preferences: TripPreference[];
  budgetAmount: number | null;
  budgetCurrency: string;
  packageId: string | null;
  /** Code and names of packageId, filled in by the API (read only). */
  packageCode?: string;
  packageName?: string;
  packageNameAr?: string;
  packageInterest: string;
};

export function emptyTripInterest(): TripInterest {
  return {
    services: [],
    origin: "",
    destination: "",
    travelDate: null,
    returnDate: null,
    flexDays: 0,
    travelWindow: "",
    adults: 0,
    childAges: [],
    infants: 0,
    paxCount: null,
    cabinClass: "",
    boardType: "",
    preferences: [],
    budgetAmount: null,
    budgetCurrency: "",
    packageId: null,
    packageInterest: "",
  };
}

export function hasTripInterest(t: TripInterest): boolean {
  return Boolean(
    t.services.length ||
      t.origin ||
      t.destination ||
      t.travelDate ||
      t.travelWindow ||
      t.paxCount ||
      t.budgetAmount != null ||
      t.packageId ||
      t.packageInterest,
  );
}

/** Who the lead is and how urgently the pipeline treats it. */
export type LeadProfile = {
  email: string;
  segment: LeadSegment;
  /** B2B only. */
  companyName: string;
  taxNumber: string;
  taxOffice: string;
  priority: LeadPriority;
  /** Empty when unknown. */
  intent: LeadIntent | "";
  /** ISO timestamp the owner should contact the customer again. */
  nextFollowUpAt: string | null;
};

export function emptyLeadProfile(): LeadProfile {
  return {
    email: "",
    segment: "b2c",
    companyName: "",
    taxNumber: "",
    taxOffice: "",
    priority: "medium",
    intent: "",
    nextFollowUpAt: null,
  };
}

const URGENT_TRAVEL_MS = 48 * 3600_000;

/** High when departure (YYYY-MM-DD, local day) is within two days, else medium; mirrors the backend. */
export function suggestedPriority(travelDate: string | null, now: Date = new Date()): LeadPriority {
  if (!travelDate) return "medium";
  const [y, m, d] = travelDate.split("-").map(Number);
  if (!y || !m || !d) return "medium";
  const diff = Date.UTC(y, m - 1, d) - now.getTime();
  return diff < URGENT_TRAVEL_MS && diff >= -24 * 3600_000 ? "high" : "medium";
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
  profile: LeadProfile;
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
  profile?: LeadProfile;
  interest?: TripInterest;
};

/** Undefined fields stay unchanged; profile and interest each replace the whole value. */
export type LeadUpdateInput = {
  fullName?: string;
  phone?: string;
  notes?: string;
  profile?: LeadProfile;
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
