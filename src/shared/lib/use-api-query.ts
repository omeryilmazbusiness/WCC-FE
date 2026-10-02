"use client";

import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";
import { QueryCache } from "./query-cache";
import { useRealtime } from "./use-realtime";
import { splitWorkspace } from "./workspace-path";

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
  /**
   * Identity of the data (every input the fetcher reads, e.g. `["tasks", userId]`).
   * When set, reopening the screen shows the last result instantly and refreshes it in
   * the background (stale-while-revalidate). Scoped to the current company / branch.
   */
  cacheKey?: readonly unknown[];
};

const cache = new QueryCache({ maxEntries: 100, maxAgeMs: 5 * 60_000 });

/** Company / branch of the page URL, so cached data never crosses workspaces. */
function workspaceScope(): string {
  const path = window.location.pathname.replace(/^\/(en|ar)(?=\/|$)/, "");
  const ws = splitWorkspace(path).workspace;
  return ws ? `${ws.company}/${ws.branch}` : "";
}

function cacheKeyOf(parts: readonly unknown[] | undefined): string | null {
  // Server render: module state is shared between users, so never cache there.
  if (!parts || typeof window === "undefined") return null;
  return QueryCache.keyOf(workspaceScope(), parts);
}

/** Drops every cached screen result (e.g. sign-out, branch change). */
export function clearQueryCache(): void {
  cache.clear();
}

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
  const key = cacheKeyOf(options.cacheKey);
  const [data, setDataState] = useState<T | undefined>(() =>
    key ? cache.get<T>(key) : undefined,
  );
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(() => enabled && (key ? cache.get(key) === undefined : true));
  const callId = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(key);
  keyRef.current = key;

  const load = useCallback(async (silent: boolean) => {
    const id = ++callId.current;
    const k = keyRef.current;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const next = await fetcherRef.current();
      if (k) cache.set(k, next);
      if (id === callId.current) {
        setDataState(next);
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

  /** Optimistic edits by the screen also update what a revisit shows. */
  const setData = useCallback<React.Dispatch<React.SetStateAction<T | undefined>>>((action) => {
    setDataState((prev) => {
      const next = typeof action === "function" ? (action as (p: T | undefined) => T | undefined)(prev) : action;
      const k = keyRef.current;
      if (k && next !== undefined) cache.set(k, next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const cached = key ? cache.get<T>(key) : undefined;
    if (cached !== undefined) {
      setDataState(cached);
      setError(null);
      setLoading(false);
      void refresh();
    } else {
      void reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reload, refresh, key, ...deps]);

  const live = options.liveTopics;
  useRealtime(
    () => void refresh(),
    { types: ["invalidate"], topics: live },
    { enabled: enabled && Boolean(live?.length) },
  );

  return { data, error, loading, reload, refresh, setData };
}
