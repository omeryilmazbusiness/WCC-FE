import type { ChatFeedback, ChatMessage, ChatRole } from "./types";

/** Longest prompt accepted; mirrors the limit the backend will enforce. */
export const MAX_PROMPT_CHARS = 4000;
/** Turns sent as history with each question, newest last. */
export const HISTORY_TURNS = 20;

export type ChatState = { messages: ChatMessage[] };

export const INITIAL_CHAT: ChatState = { messages: [] };

export type ChatAction =
  | { type: "send"; userId: string; replyId: string; text: string; now: number }
  | { type: "delta"; id: string; text: string }
  | { type: "finish"; id: string }
  | { type: "stop"; id: string }
  | { type: "fail"; id: string; code: string }
  | { type: "retry"; id: string; now: number }
  | { type: "feedback"; id: string; value: ChatFeedback | undefined }
  | { type: "reset" };

function patch(state: ChatState, id: string, fn: (m: ChatMessage) => ChatMessage): ChatState {
  let changed = false;
  const messages = state.messages.map((m) => {
    if (m.id !== id) return m;
    const next = fn(m);
    changed ||= next !== m;
    return next;
  });
  return changed ? { messages } : state;
}

export function isStreaming(state: ChatState): boolean {
  return state.messages.some((m) => m.status === "streaming");
}

export function normalizePrompt(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim();
}

export function canSend(state: ChatState, text: string): boolean {
  const prompt = normalizePrompt(text);
  return prompt.length > 0 && prompt.length <= MAX_PROMPT_CHARS && !isStreaming(state);
}

/** Pure chat transitions; every async step dispatches one of these. */
export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "send": {
      if (!canSend(state, action.text)) return state;
      return {
        messages: [
          ...state.messages,
          { id: action.userId, role: "user", content: normalizePrompt(action.text), createdAt: action.now, status: "done" },
          { id: action.replyId, role: "assistant", content: "", createdAt: action.now, status: "streaming" },
        ],
      };
    }
    case "delta":
      return patch(state, action.id, (m) => (m.status === "streaming" ? { ...m, content: m.content + action.text } : m));
    case "finish":
      return patch(state, action.id, (m) => (m.status === "streaming" ? { ...m, status: "done" } : m));
    case "stop":
      return patch(state, action.id, (m) => (m.status === "streaming" ? { ...m, status: "stopped" } : m));
    case "fail":
      return patch(state, action.id, (m) => (m.status === "streaming" ? { ...m, status: "error", errorCode: action.code } : m));
    case "retry": {
      if (isStreaming(state)) return state;
      const last = state.messages.at(-1);
      if (!last || last.id !== action.id || last.role !== "assistant") return state;
      return patch(state, action.id, (m) => ({ ...m, content: "", status: "streaming", errorCode: undefined, feedback: undefined, createdAt: action.now }));
    }
    case "feedback":
      return patch(state, action.id, (m) => (m.role === "assistant" ? { ...m, feedback: action.value } : m));
    case "reset":
      // Late chunks of an aborted reply target an id that no longer exists and are ignored.
      return INITIAL_CHAT;
  }
}

/**
 * History sent with a question: finished turns only (failed or empty replies are
 * dropped), capped to the newest `HISTORY_TURNS`.
 */
export function historyFor(messages: readonly ChatMessage[]): { role: ChatRole; content: string }[] {
  return messages
    .filter((m) => m.status !== "streaming" && m.status !== "error" && m.content.trim() !== "")
    .slice(-HISTORY_TURNS)
    .map((m) => ({ role: m.role, content: m.content }));
}
