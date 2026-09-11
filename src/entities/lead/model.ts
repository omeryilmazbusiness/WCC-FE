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
  lostReason: string;
  notes: string;
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
  lostReason?: string;
  note?: string;
};

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
