import { env } from "@/shared/config/env";
import { FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import type {
  AIProvider,
  AISetup,
  ConversationAssist,
  DailySummary,
  LeadScore,
  OCRResult,
  TargetInsight,
} from "./model";

function tokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  const session = parseSession(raw ? decodeURIComponent(raw) : null);
  return session?.accessToken ?? null;
}

type Raw = Record<string, unknown>;

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
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

export type AIRepository = {
  getSetup(): Promise<AISetup>;
  completeSetup(input: {
    provider: AIProvider;
    apiKey: string;
    model?: string;
  }): Promise<AISetup>;
  dailySummary(): Promise<DailySummary>;
  conversationAssist(id: string): Promise<ConversationAssist>;
  scoreLead(id: string, explain?: boolean): Promise<LeadScore>;
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
    const raw = await this.http.request<Raw>("/ai/daily-summary");
    return {
      headline: str(raw.headline),
      bullets: Array.isArray(raw.bullets) ? (raw.bullets as string[]) : [],
      focus: str(raw.focus),
      attention: Array.isArray(raw.attention)
        ? (raw.attention as string[])
        : [],
      source: str(raw.source),
      aiEnabled: Boolean(raw.ai_enabled ?? raw.aiEnabled),
      runId: str(raw.run_id ?? raw.runId),
      text: str(raw.text),
    };
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
    const raw = await this.http.request<Raw>(
      `/ai/leads/${id}/score?explain=${explain ? "true" : "false"}`,
      { method: "POST" },
    );
    return {
      leadId: str(raw.lead_id ?? raw.leadId ?? id),
      name: str(raw.name),
      priorityScore: Number(raw.priority_score ?? raw.priorityScore ?? 0),
      priorityBand: str(
        raw.priority_band ?? raw.priorityBand ?? "normal",
      ) as LeadScore["priorityBand"],
      signals: Array.isArray(raw.signals)
        ? (raw.signals as LeadScore["signals"])
        : [],
      explanation: str(raw.explanation),
      source: str(raw.source),
    };
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

  async completeSetup(input: {
    provider: AIProvider;
    apiKey: string;
    model?: string;
  }) {
    this.setup = {
      ...this.setup,
      configured: true,
      enabled: true,
      provider: input.provider,
      model: input.model || "default",
      keyHint: "••••" + input.apiKey.slice(-4),
      setupCompleted: true,
    };
    return { ...this.setup };
  }

  async dailySummary() {
    return {
      headline: "Demo briefing",
      bullets: ["Configure your AI key for live summaries"],
      source: "deterministic",
      aiEnabled: false,
    };
  }

  async conversationAssist() {
    return {
      summary: "Demo summary",
      nextStep: "Configure AI",
      replyDraft: "",
      autoSend: false,
      source: "deterministic",
    };
  }

  async scoreLead(id: string) {
    return {
      leadId: id,
      name: "Lead",
      priorityScore: 55,
      priorityBand: "high" as const,
      signals: [{ code: "demo", label: "Demo signal", points: 55 }],
      explanation: "",
      source: "deterministic",
    };
  }

  async targetInsight() {
    return {
      label: "Target",
      status: "behind",
      recommendations: ["Focus on unpaid bookings"],
      source: "deterministic",
    };
  }

  async ocrExtract() {
    return {
      fields: { full_name: "", passport_no: "" },
      requiresConfirmation: true,
      confidence: 0,
      runId: "",
    };
  }
}

let mem: MemoryRepo | null = null;

/**
 * Live setup status with no memory fallback — used by login / AISetupGate.
 * Returns null when the API is unreachable (do not block the app).
 */
export async function fetchAISetupStrict(): Promise<AISetup | null> {
  try {
    const http = new FetchHttpClient(env.apiBaseUrl, tokenFromCookie);
    return await new ApiRepo(http).getSetup();
  } catch {
    return null;
  }
}

export function createAIRepository(): AIRepository {
  const http = new FetchHttpClient(env.apiBaseUrl, tokenFromCookie);
  const api = new ApiRepo(http);
  if (!mem) mem = new MemoryRepo();
  const wrap =
    <A extends unknown[], R>(
      fn: (...args: A) => Promise<R>,
      fallback: (...args: A) => Promise<R>,
    ) =>
    async (...args: A) => {
      try {
        return await fn(...args);
      } catch {
        return fallback(...args);
      }
    };
  return {
    getSetup: wrap(api.getSetup.bind(api), mem.getSetup.bind(mem)),
    completeSetup: wrap(
      api.completeSetup.bind(api),
      mem.completeSetup.bind(mem),
    ),
    dailySummary: wrap(api.dailySummary.bind(api), mem.dailySummary.bind(mem)),
    conversationAssist: wrap(
      api.conversationAssist.bind(api),
      mem.conversationAssist.bind(mem),
    ),
    scoreLead: wrap(api.scoreLead.bind(api), mem.scoreLead.bind(mem)),
    targetInsight: wrap(
      api.targetInsight.bind(api),
      mem.targetInsight.bind(mem),
    ),
    ocrExtract: wrap(api.ocrExtract.bind(api), mem.ocrExtract.bind(mem)),
  };
}
