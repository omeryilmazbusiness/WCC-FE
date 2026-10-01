"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ChannelCounts,
  Conversation,
  ConversationListFilter,
  ConversationRepository,
  InboxChannel,
} from "@/entities/conversation";
import { useRealtime } from "@/shared/lib/use-realtime";

export const INBOX_QUEUES = ["all", "mine", "unassigned", "sla", "age"] as const;
export type InboxQueue = (typeof INBOX_QUEUES)[number];

export type InboxQuery = {
  q: string;
  queue: InboxQueue;
  channel: InboxChannel | "all";
};

/** Minutes without a reply that put a thread in the "age" queue. */
export const AGE_QUEUE_MINUTES = 15;

export function toListFilter({ q, queue, channel }: InboxQuery): ConversationListFilter {
  return {
    q: q || undefined,
    status: "open",
    channel: channel === "all" ? undefined : channel,
    unassigned: queue === "unassigned",
    mine: queue === "mine",
    slaBreached: queue === "sla",
    unansweredMinutes: queue === "age" ? AGE_QUEUE_MINUTES : undefined,
  };
}

type Options = {
  repository: ConversationRepository;
  query: InboxQuery;
  enabled: boolean;
};

/** Open conversations for the query plus per-channel totals for the tabs; live via `inbox.*` signals. */
export function useConversationList({ repository, query, enabled }: Options) {
  const [rows, setRows] = useState<Conversation[] | null>(null);
  const [counts, setCounts] = useState<ChannelCounts | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const rowsSeq = useRef(0);
  const countsSeq = useRef(0);

  const filter = useMemo(() => toListFilter(query), [query]);
  const countsKey = `${query.q}\u0000${query.queue}`;

  const loadRows = useCallback(async () => {
    const seq = ++rowsSeq.current;
    setLoading(true);
    try {
      const list = await repository.list(filter);
      if (seq !== rowsSeq.current) return;
      setRows(list);
      setError(null);
    } catch (err) {
      if (seq === rowsSeq.current) setError(err);
    } finally {
      if (seq === rowsSeq.current) setLoading(false);
    }
  }, [repository, filter]);

  const loadCounts = useCallback(async () => {
    const seq = ++countsSeq.current;
    try {
      const next = await repository.channelCounts(filter);
      if (seq === countsSeq.current) setCounts(next);
    } catch {
      // Tabs keep their last totals; the list surfaces the error.
    }
    // countsKey covers the inputs that change totals; the channel tab does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository, countsKey]);

  useEffect(() => {
    if (enabled) void loadRows();
  }, [enabled, loadRows]);

  useEffect(() => {
    if (enabled) void loadCounts();
  }, [enabled, loadCounts]);

  const reload = useCallback(async () => {
    await Promise.all([loadRows(), loadCounts()]);
  }, [loadRows, loadCounts]);

  useRealtime(() => void reload(), { topics: ["inbox"] }, { enabled, debounceMs: 600 });

  /** Applies a server copy of one conversation; drops it when it no longer belongs in the open list. */
  const apply = useCallback((next: Conversation) => {
    setRows((prev) => {
      if (!prev) return prev;
      if (next.status !== "open") return prev.filter((c) => c.id !== next.id);
      return prev.map((c) => (c.id === next.id ? next : c));
    });
  }, []);

  return { rows, counts, error, loading, reload, apply };
}
