import { http, type HttpClient } from "@/shared/api/http-client";
import { isApiError, isNetworkError } from "@/shared/api/api-error";
import { createRepository } from "@/shared/api/repository";
import type {
  AIProvider,
  AISetup,
  ConversationAssist,
  DailySummary,
  LeadDraftResult,
  LeadScore,
  LostLeadsAnalysis,
  OCRResult,
  TargetInsight,
} from "./model";

type Raw = Record<string, unknown>;

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

function mapLeadScore(raw: Raw, id: string): LeadScore {
  return {
    leadId: str(raw.lead_id ?? raw.leadId ?? id),
    name: str(raw.name),
    priorityScore: Number(raw.priority_score ?? raw.priorityScore ?? 0),
    priorityBand: str(raw.priority_band ?? raw.priorityBand ?? "normal") as LeadScore["priorityBand"],
    signals: Array.isArray(raw.signals) ? (raw.signals as LeadScore["signals"]) : [],
    explanation: str(raw.explanation),
    source: str(raw.source),
  };
}

function mapSetup(raw: Raw): AISetup {
  const providers = Array.isArray(raw.accepted_providers)
    ? (raw.accepted_providers as string[])
    : ["openai", "anthropic", "gemini"];
  return {
    configured: Boolean(raw.configured),
    enabled: Boolean(raw.enabled),
    provider: str(raw.provider) as AIProvider | "",
    model: str(raw.model),
    keyHint: str(raw.key_hint ?? raw.keyHint),
    setupCompleted: Boolean(raw.setup_completed ?? raw.setupCompleted),
    acceptedProviders: providers as AIProvider[],
  };
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
}

function mapLostLeads(raw: Raw): LostLeadsAnalysis {
  const summary = (raw.summary ?? {}) as Raw;
  const actions = (raw.actions ?? {}) as Raw;
  return {
    available: Boolean(raw.available),
    periodStart: str(raw.period_start),
    periodEnd: str(raw.period_end),
    lostCount: Number(raw.lost_count ?? 0),
    reasons: Array.isArray(raw.reasons)
      ? (raw.reasons as Raw[]).map((r) => ({ code: str(r.code), count: Number(r.count ?? 0) }))
      : [],
    source: str(raw.source),
    aiEnabled: Boolean(raw.ai_enabled),
    summary: { en: str(summary.en), ar: str(summary.ar) },
    actions: { en: strings(actions.en), ar: strings(actions.ar) },
    model: str(raw.model),
    createdAt: str(raw.created_at),
  };
}

function mapDailySummary(raw: Raw): DailySummary {
  return {
    available: Boolean(raw.available),
    aiEnabled: Boolean(raw.ai_enabled),
    headline: str(raw.headline),
    bullets: strings(raw.bullets),
    focus: str(raw.focus),
    attention: strings(raw.attention),
    model: str(raw.model),
    createdAt: str(raw.created_at),
  };
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function mapLeadDraft(raw: Raw): LeadDraftResult {
  const d = (raw.draft ?? {}) as Raw;
  return {
    draft: {
      fullName: str(d.full_name),
      phone: str(d.phone),
      travelDate: str(d.travel_date),
      travelWindow: str(d.travel_window),
      paxCount: numOrNull(d.pax_count),
      budgetAmount: numOrNull(d.budget_amount),
      budgetCurrency: str(d.budget_currency),
      packageId: typeof d.package_id === "string" && d.package_id ? d.package_id : null,
      packageInterest: str(d.package_interest),
      notes: str(d.notes),
      aiFields: strings(d.ai_fields),
    },
    leadId: typeof raw.lead_id === "string" && raw.lead_id ? raw.lead_id : null,
    model: str(raw.model),
  };
}

export type AIRepository = {
  getSetup(): Promise<AISetup>;
  completeSetup(input: {
    provider: AIProvider;
    apiKey: string;
    model?: string;
  }): Promise<AISetup>;
  dailySummary(): Promise<DailySummary>;
  generateDailySummary(): Promise<DailySummary>;
  leadDraft(conversationId: string): Promise<LeadDraftResult>;
  lostLeadsAnalysis(): Promise<LostLeadsAnalysis>;
  analyzeLostLeads(): Promise<LostLeadsAnalysis>;
  conversationAssist(id: string): Promise<ConversationAssist>;
  scoreLead(id: string, explain?: boolean): Promise<LeadScore>;
  /** Scores up to 100 leads in one request; leads the caller cannot see are omitted. */
  scoreLeads(ids: string[]): Promise<LeadScore[]>;
  targetInsight(id: string): Promise<TargetInsight>;
  ocrExtract(input: {
    imageBase64: string;
    mime?: string;
    hint?: string;
  }): Promise<OCRResult>;
};

class ApiRepo implements AIRepository {
  constructor(private http: HttpClient) {}

  async getSetup() {
    return mapSetup(await this.http.request<Raw>("/ai/setup"));
  }

  async completeSetup(input: {
    provider: AIProvider;
    apiKey: string;
    model?: string;
  }) {
    return mapSetup(
      await this.http.request<Raw>("/ai/setup", {
        method: "POST",
        body: JSON.stringify({
          provider: input.provider,
          api_key: input.apiKey,
          model: input.model ?? "",
          enabled: true,
        }),
      }),
    );
  }

  async dailySummary() {
    return mapDailySummary(await this.http.request<Raw>("/ai/daily-summary"));
  }

  async generateDailySummary() {
    return mapDailySummary(await this.http.request<Raw>("/ai/daily-summary", { method: "POST" }));
  }

  async leadDraft(conversationId: string) {
    return mapLeadDraft(
      await this.http.request<Raw>(`/ai/conversations/${conversationId}/lead-draft`, {
        method: "POST",
      }),
    );
  }

  async lostLeadsAnalysis() {
    return mapLostLeads(await this.http.request<Raw>("/ai/lost-leads/analysis"));
  }

  async analyzeLostLeads() {
    return mapLostLeads(await this.http.request<Raw>("/ai/lost-leads/analysis", { method: "POST" }));
  }

  async conversationAssist(id: string) {
    const raw = await this.http.request<Raw>(
      `/ai/conversations/${id}/assist`,
      { method: "POST" },
    );
    return {
      summary: str(raw.summary),
      nextStep: str(raw.next_step ?? raw.nextStep),
      replyDraft: str(raw.reply_draft ?? raw.replyDraft),
      autoSend: false,
      source: str(raw.source),
      runId: str(raw.run_id ?? raw.runId),
    };
  }

  async scoreLead(id: string, explain = true) {
    const raw = explain
      ? await this.http.request<Raw>(`/ai/leads/${id}/score?explain=true`, {
          method: "POST",
        })
      : await this.http.request<Raw>(`/ai/leads/${id}/score`);
    return mapLeadScore(raw, id);
  }

  async scoreLeads(ids: string[]) {
    const rows = await this.http.request<Raw[]>("/ai/leads/scores", {
      method: "POST",
      body: JSON.stringify({ lead_ids: ids }),
    });
    return (Array.isArray(rows) ? rows : []).map((raw) => mapLeadScore(raw, ""));
  }

  async targetInsight(id: string) {
    const raw = await this.http.request<Raw>(`/ai/targets/${id}/insight`);
    return {
      label: str(raw.label),
      status: str(raw.status),
      recommendations: Array.isArray(raw.recommendations)
        ? (raw.recommendations as string[])
        : [],
      narrative: str(raw.narrative),
      source: str(raw.source),
      gapToTarget: Number(raw.gap_to_target ?? raw.gapToTarget ?? 0),
    };
  }

  async ocrExtract(input: {
    imageBase64: string;
    mime?: string;
    hint?: string;
  }) {
    const raw = await this.http.request<Raw>("/ai/ocr", {
      method: "POST",
      body: JSON.stringify({
        image_base64: input.imageBase64,
        mime: input.mime ?? "image/jpeg",
        hint: input.hint ?? "",
      }),
    });
    return {
      fields: (raw.fields as Record<string, string>) ?? {},
      confidence: Number(raw.confidence ?? 0),
      requiresConfirmation: Boolean(
        raw.requires_confirmation ?? raw.requiresConfirmation ?? true,
      ),
      runId: str(raw.run_id ?? raw.runId),
    };
  }
}

/** Offline twin: setup state only; AI output never comes from memory. */
class MemoryRepo implements AIRepository {
  private setup: AISetup = {
    configured: false,
    enabled: false,
    provider: "",
    model: "",
    keyHint: "",
    setupCompleted: false,
    acceptedProviders: ["openai", "anthropic", "gemini"],
  };

  async getSetup() {
    return { ...this.setup };
  }

  async completeSetup(): Promise<AISetup> {
    return offline();
  }

  async dailySummary(): Promise<DailySummary> {
    return offline();
  }

  async generateDailySummary(): Promise<DailySummary> {
    return offline();
  }

  async leadDraft(): Promise<LeadDraftResult> {
    return offline();
  }

  async lostLeadsAnalysis(): Promise<LostLeadsAnalysis> {
    return offline();
  }

  async analyzeLostLeads(): Promise<LostLeadsAnalysis> {
    return offline();
  }

  async conversationAssist(): Promise<ConversationAssist> {
    return offline();
  }

  async scoreLead(): Promise<LeadScore> {
    return offline();
  }

  async scoreLeads(): Promise<LeadScore[]> {
    return offline();
  }

  async targetInsight(): Promise<TargetInsight> {
    return offline();
  }

  async ocrExtract(): Promise<OCRResult> {
    return offline();
  }
}

function offline(): never {
  throw new Error("AI is unavailable offline");
}

/** The branch has no usable AI provider key. */
export function isAINotConfigured(err: unknown): boolean {
  return isApiError(err) && err.message.startsWith("ai_not_configured");
}

export const AI_ERROR_CODES = [
  "ai_not_configured",
  "ai_model_not_found",
  "ai_key_invalid",
  "ai_rate_limited",
  "ai_provider_error",
] as const;

export type AIErrorCode = (typeof AI_ERROR_CODES)[number];

/** Backend AI failures are "<code>: <detail>"; returns the code or null. */
export function aiErrorCode(err: unknown): AIErrorCode | null {
  if (!isApiError(err)) return null;
  const code = err.message.split(":", 1)[0];
  return (AI_ERROR_CODES as readonly string[]).includes(code) ? (code as AIErrorCode) : null;
}

/** The provider call failed (bad model/key, quota, outage, unusable output). */
export function isAIProviderError(err: unknown): boolean {
  const code = aiErrorCode(err);
  return code !== null && code !== "ai_not_configured";
}

let mem: MemoryRepo | null = null;

/**
 * Live setup status with no memory fallback — used by login / AISetupGate.
 * Returns null when the API is unreachable or the caller may not read AI setup
 * (do not block the app); other HTTP errors propagate.
 */
export async function fetchAISetupStrict(): Promise<AISetup | null> {
  try {
    return await new ApiRepo(http).getSetup();
  } catch (err) {
    if (isNetworkError(err) || (isApiError(err) && err.status === 403)) return null;
    throw err;
  }
}

export function createAIRepository(): AIRepository {
  const api = new ApiRepo(http);
  if (!mem) mem = new MemoryRepo();
  return createRepository<AIRepository>({
    api,
    memory: mem,
    reads: ["getSetup"],
  });
}
