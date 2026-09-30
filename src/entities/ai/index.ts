export type {
  AIProvider,
  AISetup,
  DailySummary,
  LostLeadsAnalysis,
  LeadDraft,
  LeadDraftResult,
  ConversationAssist,
  LeadScore,
  TargetInsight,
  OCRResult,
} from "./model";
export { AI_PROVIDERS } from "./model";
export {
  createAIRepository,
  fetchAISetupStrict,
  isAINotConfigured,
  isAIProviderError,
  aiErrorCode,
  AI_ERROR_CODES,
  type AIRepository,
} from "./api";
