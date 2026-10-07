export type ChatRole = "user" | "assistant";

/** `streaming` while chunks arrive; `stopped` when the user cut the reply short. */
export type ChatMessageStatus = "streaming" | "done" | "stopped" | "error";

export type ChatFeedback = "up" | "down";

/** Where a reply came from: Help & FAQ, the model, a saved answer, a data template, a fixed rule, or the offline preview. */
export type ReplySource = "faq" | "ai" | "cache" | "data" | "rule" | "preview";

/** Why a reply did not come from the model. */
export type ReplyNotice = "quota_reached" | "not_configured" | "ai_unavailable" | "not_allowed";

export type AssistantQuota = {
  /** 0 = unlimited. */
  limit: number;
  used: number;
  /** -1 = unlimited. */
  remaining: number;
  mode: "full" | "essential";
  resetsAt: string;
};

export type ReplyMeta = {
  source: ReplySource;
  capability?: string;
  notice?: ReplyNotice;
  quota?: AssistantQuota;
  /** The Help & FAQ question that answered, for the "open in Help" link. */
  faq?: { topic: string; id: string };
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  /** Epoch ms. */
  createdAt: number;
  status: ChatMessageStatus;
  feedback?: ChatFeedback;
  errorCode?: string;
  meta?: ReplyMeta;
};

/** Where the user is asking from; lets the assistant ground its answer. */
export type AssistantContext = {
  locale: "en" | "ar";
  /** Screen label, e.g. "Manager dashboard". */
  screen?: string;
  /** Branch the viewer is working in. */
  branchId?: string;
};

export type AssistantRequest = {
  messages: readonly { role: ChatRole; content: string }[];
  context: AssistantContext;
  /** `skipFaq` asks the assistant itself (Regenerate / "Ask AI instead"). */
  options?: { skipFaq?: boolean };
};

export type AssistantChunk = { type: "meta"; meta: ReplyMeta } | { type: "delta"; text: string } | { type: "done" };

/**
 * Port to whatever answers the chat. The UI only depends on this, so the preview
 * transport and the backend one are interchangeable.
 */
export interface AssistantTransport {
  /** `preview` answers locally without AI; the panel labels it as such. */
  readonly mode: "preview" | "live";
  stream(request: AssistantRequest, signal: AbortSignal): AsyncIterable<AssistantChunk>;
}

export class AssistantError extends Error {
  readonly code: string;

  constructor(code: string, message = code) {
    super(message);
    this.name = "AssistantError";
    this.code = code;
  }
}
