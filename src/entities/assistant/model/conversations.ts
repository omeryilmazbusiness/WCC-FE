import { INITIAL_CHAT, chatReducer, isStreaming, type ChatAction, type ChatState } from "./chat-state";

/** Parallel chats a viewer can keep open as tabs. */
export const MAX_CONVERSATIONS = 3;

export type Conversation = { id: string; createdAt: number; chat: ChatState };

export type ConversationsState = { conversations: Conversation[]; activeId: string };

export type ConversationsAction =
  | { type: "open"; id: string; now: number }
  | { type: "close"; id: string; freshId: string; now: number }
  | { type: "select"; id: string }
  | { type: "chat"; id: string; action: ChatAction };

const blank = (id: string, now: number): Conversation => ({ id, createdAt: now, chat: INITIAL_CHAT });

export function initialConversations(id: string, now: number): ConversationsState {
  return { conversations: [blank(id, now)], activeId: id };
}

const isEmpty = (c: Conversation) => c.chat.messages.length === 0;

export function activeConversation(state: ConversationsState): Conversation {
  return state.conversations.find((c) => c.id === state.activeId) ?? state.conversations[0];
}

/** A new tab can be started, or an unused one is there to jump to. */
export function canOpenConversation(state: ConversationsState): boolean {
  return state.conversations.length < MAX_CONVERSATIONS || state.conversations.some(isEmpty);
}

export function isConversationStreaming(c: Conversation): boolean {
  return isStreaming(c.chat);
}

/** Tab title: the first question, on one line; `null` while the chat is still empty. */
export function conversationTitle(c: Conversation): string | null {
  const first = c.chat.messages.find((m) => m.role === "user");
  return first ? first.content.replace(/\s+/g, " ").trim() : null;
}

export function conversationsReducer(state: ConversationsState, action: ConversationsAction): ConversationsState {
  switch (action.type) {
    case "open": {
      const unused = state.conversations.find(isEmpty);
      if (unused) return unused.id === state.activeId ? state : { ...state, activeId: unused.id };
      if (state.conversations.length >= MAX_CONVERSATIONS) return state;
      return { conversations: [...state.conversations, blank(action.id, action.now)], activeId: action.id };
    }
    case "close": {
      const index = state.conversations.findIndex((c) => c.id === action.id);
      if (index < 0) return state;
      const rest = state.conversations.filter((c) => c.id !== action.id);
      if (rest.length === 0) return initialConversations(action.freshId, action.now);
      if (state.activeId !== action.id) return { ...state, conversations: rest };
      return { conversations: rest, activeId: rest[Math.max(0, index - 1)].id };
    }
    case "select":
      return state.conversations.some((c) => c.id === action.id) ? { ...state, activeId: action.id } : state;
    case "chat": {
      let changed = false;
      const conversations = state.conversations.map((c) => {
        if (c.id !== action.id) return c;
        const chat = chatReducer(c.chat, action.action);
        if (chat === c.chat) return c;
        changed = true;
        return { ...c, chat };
      });
      return changed ? { ...state, conversations } : state;
    }
  }
}
