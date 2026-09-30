export type AIProvider = "openai" | "anthropic" | "gemini";

export type AISetup = {
  configured: boolean;
  enabled: boolean;
  provider: AIProvider | "";
  model: string;
  keyHint: string;
  setupCompleted: boolean;
  acceptedProviders: AIProvider[];
};

/** Latest AI briefing; `available` is false until one has been generated. */
export type DailySummary = {
  available: boolean;
  aiEnabled: boolean;
  headline: string;
  bullets: string[];
  focus: string;
  attention: string[];
  model: string;
  createdAt: string;
};

/** Weekly read of why leads were lost; `source` "none" when nothing was lost. */
export type LostLeadsAnalysis = {
  available: boolean;
  periodStart: string;
  /** Exclusive end (RFC 3339). */
  periodEnd: string;
  lostCount: number;
  reasons: { code: string; count: number }[];
  source: string;
  aiEnabled: boolean;
  summary: { en: string; ar: string };
  actions: { en: string[]; ar: string[] };
  model: string;
  createdAt: string;
};

/** Lead form prefill read from a conversation. budgetAmount is in minor units. */
export type LeadDraft = {
  fullName: string;
  phone: string;
  travelDate: string;
  travelWindow: string;
  paxCount: number | null;
  budgetAmount: number | null;
  budgetCurrency: string;
  packageId: string | null;
  packageInterest: string;
  notes: string;
  /** Form fields the model filled; the UI marks them for review. */
  aiFields: string[];
};

export type LeadDraftResult = {
  draft: LeadDraft;
  /** Lead already linked to the conversation, if any. */
  leadId: string | null;
  model: string;
};

export type ConversationAssist = {
  summary?: string;
  nextStep?: string;
  replyDraft?: string;
  autoSend?: boolean;
  source?: string;
  runId?: string;
};

export type LeadScore = {
  leadId: string;
  name: string;
  priorityScore: number;
  priorityBand: "low" | "normal" | "high" | "urgent";
  signals: { code: string; label: string; points: number }[];
  explanation?: string;
  source?: string;
};

export type TargetInsight = {
  label?: string;
  status?: string;
  recommendations?: string[];
  narrative?: string;
  source?: string;
  gapToTarget?: number;
};

export type OCRResult = {
  fields?: Record<string, string>;
  confidence?: number;
  requiresConfirmation?: boolean;
  runId?: string;
};

/** `models[0]` mirrors the backend default used when the model field is left blank. */
export const AI_PROVIDERS: {
  id: AIProvider;
  label: string;
  hint: string;
  models: string[];
}[] = [
  {
    id: "openai",
    label: "OpenAI (GPT)",
    hint: "sk-…",
    models: ["gpt-6-luna", "gpt-6.1-sol", "gpt-6-astra"],
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    hint: "sk-ant-…",
    models: ["claude-haiku-4-5", "claude-sonnet-5", "claude-opus-5-5"],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    hint: "AIza…",
    models: ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-2.5-pro"],
  },
];
