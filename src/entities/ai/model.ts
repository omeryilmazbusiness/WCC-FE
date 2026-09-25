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

export type DailySummary = {
  headline?: string;
  bullets?: string[];
  focus?: string;
  attention?: string[];
  source?: string;
  aiEnabled?: boolean;
  runId?: string;
  text?: string;
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

export const AI_PROVIDERS: {
  id: AIProvider;
  label: string;
  hint: string;
}[] = [
  { id: "openai", label: "OpenAI (GPT)", hint: "sk-…" },
  { id: "anthropic", label: "Anthropic (Claude)", hint: "sk-ant-…" },
  { id: "gemini", label: "Google Gemini", hint: "AIza…" },
];
