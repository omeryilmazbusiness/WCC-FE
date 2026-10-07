"use client";

import { useCallback, useEffect, useId, useReducer, useRef } from "react";
import {
  AssistantError,
  activeConversation,
  canOpenConversation,
  canSend,
  conversationsReducer,
  historyFor,
  initialConversations,
  isStreaming,
  normalizePrompt,
  type AssistantContext,
  type AssistantTransport,
  type ChatAction,
  type ChatFeedback,
} from "@/entities/assistant";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

type Turn = { role: "user" | "assistant"; content: string };

/**
 * Up to `MAX_CONVERSATIONS` chats side by side. Each tab streams on its own, so a
 * reply keeps arriving in a background tab while the viewer works in another.
 */
export function useAssistantConversations(transport: AssistantTransport, context: AssistantContext) {
  // The first tab is rendered on the server too, so its id must match on both sides.
  const firstId = useId();
  const [state, dispatch] = useReducer(conversationsReducer, firstId, (id) => initialConversations(id, 0));
  const stateRef = useRef(state);
  const contextRef = useRef(context);
  const controllers = useRef(new Map<string, AbortController>());

  useEffect(() => {
    stateRef.current = state;
    contextRef.current = context;
  });

  useEffect(() => {
    const live = controllers.current;
    return () => live.forEach((c) => c.abort());
  }, []);

  const chat = useCallback((id: string, action: ChatAction) => dispatch({ type: "chat", id, action }), []);

  const run = useCallback(
    async (conversationId: string, replyId: string, messages: Turn[], options?: { skipFaq?: boolean }) => {
      const controller = new AbortController();
      controllers.current.set(conversationId, controller);
      try {
        for await (const chunk of transport.stream({ messages, context: contextRef.current, options }, controller.signal)) {
          if (controller.signal.aborted || chunk.type === "done") break;
          if (chunk.type === "meta") chat(conversationId, { type: "meta", id: replyId, meta: chunk.meta });
          else chat(conversationId, { type: "delta", id: replyId, text: chunk.text });
        }
        chat(conversationId, { type: controller.signal.aborted ? "stop" : "finish", id: replyId });
      } catch (err) {
        if (controller.signal.aborted) chat(conversationId, { type: "stop", id: replyId });
        else chat(conversationId, { type: "fail", id: replyId, code: err instanceof AssistantError ? err.code : "unavailable" });
      } finally {
        if (controllers.current.get(conversationId) === controller) controllers.current.delete(conversationId);
      }
    },
    [transport, chat],
  );

  const send = useCallback(
    (text: string) => {
      const current = activeConversation(stateRef.current);
      if (!canSend(current.chat, text)) return false;
      const replyId = newId();
      const history = [...historyFor(current.chat.messages), { role: "user" as const, content: normalizePrompt(text) }];
      chat(current.id, { type: "send", userId: newId(), replyId, text, now: Date.now() });
      void run(current.id, replyId, history);
      return true;
    },
    [chat, run],
  );

  /** Regenerates the last reply; it always asks the assistant, never Help & FAQ again. */
  const retry = useCallback(
    (messageId: string) => {
      const current = activeConversation(stateRef.current);
      const messages = current.chat.messages;
      if (isStreaming(current.chat) || messages.at(-1)?.id !== messageId) return;
      chat(current.id, { type: "retry", id: messageId, now: Date.now() });
      void run(current.id, messageId, historyFor(messages.slice(0, -1)), { skipFaq: true });
    },
    [chat, run],
  );

  const stop = useCallback(() => controllers.current.get(stateRef.current.activeId)?.abort(), []);

  const feedback = useCallback(
    (messageId: string, value: ChatFeedback | undefined) => chat(stateRef.current.activeId, { type: "feedback", id: messageId, value }),
    [chat],
  );

  const open = useCallback(() => {
    if (!canOpenConversation(stateRef.current)) return false;
    dispatch({ type: "open", id: newId(), now: Date.now() });
    return true;
  }, []);

  const close = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    dispatch({ type: "close", id, freshId: newId(), now: Date.now() });
  }, []);

  const select = useCallback((id: string) => dispatch({ type: "select", id }), []);

  const active = activeConversation(state);
  return {
    conversations: state.conversations,
    active,
    streaming: isStreaming(active.chat),
    canOpen: canOpenConversation(state),
    send,
    retry,
    stop,
    feedback,
    open,
    close,
    select,
  };
}
