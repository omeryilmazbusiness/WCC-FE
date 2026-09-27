"use client";

import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";
import { useRealtime } from "./use-realtime";

export type ApiQuery<T> = {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => Promise<void>;
  /** Refetches in the background: no loading state, and a failure keeps current data. */
  refresh: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | undefined>>;
};

export type ApiQueryOptions = {
  enabled?: boolean;
  /**
   * Server event topic prefixes (e.g. `["task", "payment"]`) that refetch this query in
   * the background when announced on the realtime stream; the current data stays visible.
   */
  liveTopics?: readonly string[];
};

/**
 * Minimal async-read state for widgets: pairs with `QueryState` for loading / error /
 * forbidden / empty. Stale responses from superseded calls are ignored.
 */
export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList,
  options: ApiQueryOptions = {},
): ApiQuery<T> {
  const enabled = options.enabled ?? true;
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(enabled);
  const callId = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async (silent: boolean) => {
    const id = ++callId.current;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const next = await fetcherRef.current();
      if (id === callId.current) {
        setData(next);
        setError(null);
      }
    } catch (err) {
      // a failed background refresh keeps the data already on screen
      if (id === callId.current && !silent) setError(err);
    } finally {
      if (id === callId.current) setLoading(false);
    }
  }, []);

  const reload = useCallback(() => load(false), [load]);
  const refresh = useCallback(() => load(true), [load]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reload, ...deps]);

  const live = options.liveTopics;
  useRealtime(
    () => void refresh(),
    { types: ["invalidate"], topics: live },
    { enabled: enabled && Boolean(live?.length) },
  );

  return { data, error, loading, reload, refresh, setData };
}
