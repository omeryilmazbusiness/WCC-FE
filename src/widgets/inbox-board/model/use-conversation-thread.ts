"use client";

import { useCallback, useEffect, useState } from "react";
import type { ConversationRepository, InboxMessage } from "@/entities/conversation";
import { useRealtime } from "@/shared/lib/use-realtime";

type State = { id: string | null; messages: InboxMessage[]; error: unknown };

/** Messages of the open conversation; stale responses for a previous thread are ignored. */
export function useConversationThread(repository: ConversationRepository, conversationId: string | null) {
  const [state, setState] = useState<State>({ id: null, messages: [], error: null });

  const load = useCallback(
    async (isStale: () => boolean = () => false) => {
      if (!conversationId) return;
      try {
        const messages = await repository.listMessages(conversationId);
        if (!isStale()) setState({ id: conversationId, messages, error: null });
      } catch (error) {
        if (!isStale()) setState((s) => ({ ...s, id: conversationId, error }));
      }
    },
    [repository, conversationId],
  );

  useEffect(() => {
    let stale = false;
    void load(() => stale);
    return () => {
      stale = true;
    };
  }, [load]);

  useRealtime(() => void load(), { topics: ["inbox.message"] }, { enabled: Boolean(conversationId), debounceMs: 500 });

  const append = useCallback((message: InboxMessage) => {
    setState((s) => (s.id === message.conversationId ? { ...s, messages: [...s.messages, message] } : s));
  }, []);

  const current = state.id === conversationId;
  return {
    messages: current ? state.messages : [],
    loading: Boolean(conversationId) && !current,
    error: current ? state.error : null,
    append,
    reload: load,
  };
}
