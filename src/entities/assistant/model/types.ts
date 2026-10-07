export type ChatRole = "user" | "assistant";

/** `streaming` while chunks arrive; `stopped` when the user cut the reply short. */
export type ChatMessageStatus = "streaming" | "done" | "stopped" | "error";

export type ChatFeedback = "up" | "down";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  /** Epoch ms. */
  createdAt: number;
  status: ChatMessageStatus;
  feedback?: ChatFeedback;
  errorCode?: string;
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
};

export type AssistantChunk = { type: "delta"; text: string } | { type: "done" };

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
  constructor(
    readonly code: string,
    message = code,
  ) {
    super(message);
  }
}
