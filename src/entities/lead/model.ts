export type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "won"
  | "lost";

export const LEAD_STAGES: LeadStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
];

export const PIPELINE_COLUMNS: LeadStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
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
  proposal: ["won", "lost"],
  won: [],
  lost: [],
};

export function canTransitionLead(from: LeadStage, to: LeadStage): boolean {
  return ALLOWED[from].includes(to);
}

export function nextStages(from: LeadStage): LeadStage[] {
  return ALLOWED[from];
}
