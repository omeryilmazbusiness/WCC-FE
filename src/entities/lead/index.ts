export type {
  Lead,
  LeadStage,
  LeadCreateInput,
  ChangeStageInput,
  ConvertLeadInput,
  ConvertLeadResult,
  StageHistoryItem,
  LeadAnalytics,
  LeadOwner,
  LostReasonCode,
} from "./model";
export {
  LEAD_STAGES,
  PIPELINE_COLUMNS,
  LOST_REASON_CODES,
  canTransitionLead,
  nextStages,
} from "./model";
export type { LeadRepository } from "./api";
export {
  MemoryLeadRepository,
  ApiLeadRepository,
  LEAD_OWNERS,
  groupLeadsByStage,
  createLeadRepository,
} from "./api";
