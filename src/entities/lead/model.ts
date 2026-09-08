export type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "won"
  | "lost";

export type Lead = {
  id: string;
  fullName: string;
  phone: string;
  stage: LeadStage;
  ownerId: string;
};
