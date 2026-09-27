"use client";

import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

export type ApiQuery<T> = {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | undefined>>;
};

/**
 * Minimal async-read state for widgets: pairs with `QueryState` for loading / error /
 * forbidden / empty. Stale responses from superseded calls are ignored.
 */
export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList,
  options: { enabled?: boolean } = {},
): ApiQuery<T> {
  const enabled = options.enabled ?? true;
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(enabled);
  const callId = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    const id = ++callId.current;
    setLoading(true);
    setError(null);
    try {
      const next = await fetcherRef.current();
      if (id === callId.current) setData(next);
    } catch (err) {
      if (id === callId.current) setError(err);
    } finally {
      if (id === callId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reload, ...deps]);

  return { data, error, loading, reload, setData };
}
