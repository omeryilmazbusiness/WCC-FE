import type { HttpClient } from "@/shared/api/http-client";
import { isApiError, isNetworkError } from "@/shared/api/api-error";
import { abortableSleep, revealDelay, revealPieces } from "../model/stream";
import {
  AssistantError,
  type AssistantChunk,
  type AssistantQuota,
  type AssistantTransport,
  type ReplyMeta,
  type ReplyNotice,
  type ReplySource,
} from "../model/types";

type Raw = Record<string, unknown>;

const SOURCES: readonly ReplySource[] = ["faq", "ai", "cache", "data", "rule", "preview"];
const NOTICES: readonly ReplyNotice[] = ["quota_reached", "not_configured", "ai_unavailable", "not_allowed"];

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function parseQuota(raw: unknown): AssistantQuota | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const q = raw as Raw;
  return {
    limit: num(q.limit),
    used: num(q.used),
    remaining: num(q.remaining, -1),
    mode: q.mode === "essential" ? "essential" : "full",
    resetsAt: String(q.resets_at ?? ""),
  };
}

/** Maps `POST /ai/assistant/chat` to the reply text and its metadata. */
export function parseChatReply(raw: unknown): { reply: string; meta: ReplyMeta } {
  const r = (raw ?? {}) as Raw;
  const source = SOURCES.includes(r.source as ReplySource) ? (r.source as ReplySource) : "ai";
  const notice = NOTICES.includes(r.notice as ReplyNotice) ? (r.notice as ReplyNotice) : undefined;
  return {
    reply: typeof r.reply === "string" ? r.reply : "",
    meta: { source, capability: r.capability ? String(r.capability) : undefined, notice, quota: parseQuota(r.quota) },
  };
}

/** Error codes the chat UI knows how to explain. */
export function toAssistantError(err: unknown): AssistantError {
  if (err instanceof AssistantError) return err;
  if (isNetworkError(err)) return new AssistantError("offline");
  if (isApiError(err)) {
    if (err.status === 403) return new AssistantError("forbidden");
    if (err.status === 429) return new AssistantError("rate_limited");
    if (err.status === 400 || err.status === 422) return new AssistantError("invalid");
  }
  return new AssistantError("unavailable");
}

/**
 * The backend assistant. It answers in one response; the reply is then revealed
 * piece by piece so every source feels the same in the panel.
 */
export function createHttpTransport(client: HttpClient, { revealMs = 12 }: { revealMs?: number } = {}): AssistantTransport {
  return {
    mode: "live",
    async *stream(request, signal): AsyncIterable<AssistantChunk> {
      let raw: unknown;
      try {
        raw = await client.request<unknown>("/ai/assistant/chat", {
          method: "POST",
          body: JSON.stringify({
            messages: request.messages,
            context: { locale: request.context.locale, screen: request.context.screen },
          }),
          signal,
        });
      } catch (err) {
        if (signal.aborted) throw err;
        throw toAssistantError(err);
      }
      const { reply, meta } = parseChatReply(raw);
      if (!reply.trim()) throw new AssistantError("unavailable");
      yield { type: "meta", meta };
      const pieces = revealPieces(reply);
      const delay = revealDelay(pieces.length, revealMs);
      for (const piece of pieces) {
        yield { type: "delta", text: piece };
        if (delay > 0) await abortableSleep(delay, signal);
      }
      yield { type: "done" };
    },
  };
}

export type ProtocolCapability = {
  id: string;
  kind: "data" | "draft" | "help" | "rule";
  requires: string[];
  allowed: boolean;
  usesModel: boolean;
  usesData: boolean;
  maxOutputTokens: number;
};

export type AssistantProtocol = {
  version: string;
  rules: string[];
  capabilities: ProtocolCapability[];
  aiConfigured: boolean;
  faqFirst: boolean;
  quota: AssistantQuota;
  limits: { maxPromptChars: number; historyTurns: number; historyChars: number; cacheMinutes: number };
};

export function parseProtocol(raw: unknown): AssistantProtocol {
  const r = (raw ?? {}) as Raw;
  const limits = (r.limits ?? {}) as Raw;
  const caps = Array.isArray(r.capabilities) ? (r.capabilities as Raw[]) : [];
  return {
    version: String(r.version ?? ""),
    rules: Array.isArray(r.rules) ? r.rules.map(String) : [],
    capabilities: caps.map((c) => ({
      id: String(c.id ?? ""),
      kind: (["data", "draft", "help", "rule"].includes(String(c.kind)) ? c.kind : "rule") as ProtocolCapability["kind"],
      requires: Array.isArray(c.requires) ? c.requires.map(String) : [],
      allowed: Boolean(c.allowed),
      usesModel: Boolean(c.uses_model),
      usesData: Boolean(c.uses_data),
      maxOutputTokens: num(c.max_output_tokens),
    })),
    aiConfigured: Boolean(r.ai_configured),
    faqFirst: r.faq_first !== false,
    quota: parseQuota(r.quota) ?? { limit: 0, used: 0, remaining: -1, mode: "full", resetsAt: "" },
    limits: {
      maxPromptChars: num(limits.max_prompt_chars),
      historyTurns: num(limits.history_turns),
      historyChars: num(limits.history_chars),
      cacheMinutes: num(limits.cache_minutes),
    },
  };
}

export async function requestAssistantProtocol(client: HttpClient): Promise<AssistantProtocol> {
  return parseProtocol(await client.request<unknown>("/ai/assistant/protocol"));
}
