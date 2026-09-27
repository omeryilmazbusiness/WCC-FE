"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createFxLiveRepository } from "../api";
import { FX_LIVE_POLL_MS, isOlderThan, type FxLiveBoard } from "../model";

const repo = createFxLiveRepository();

export type LiveFxBoardState = {
  board: FxLiveBoard | null;
  /** Last load error; the previous board (if any) stays visible. */
  error: unknown;
  loading: boolean;
  reload: () => Promise<void>;
  /** Reloads only when the last successful load is at least `maxAgeMs` old. */
  ensureFresh: (maxAgeMs: number) => Promise<void>;
  /** Adopt a board obtained elsewhere (e.g. a manual refresh); supersedes in-flight loads. */
  replace: (board: FxLiveBoard) => void;
};

/**
 * Live FX board for the app shell: loads on mount, polls every 5 minutes only while the
 * tab is visible, and never runs two GETs at once.
 */
export function useLiveFxBoard(): LiveFxBoardState {
  const [board, setBoard] = useState<FxLiveBoard | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const inflight = useRef<Promise<void> | null>(null);
  const fetchedAt = useRef(0);
  const generation = useRef(0);

  const apply = useCallback((next: FxLiveBoard) => {
    fetchedAt.current = Date.now();
    setBoard(next);
    setError(null);
  }, []);

  const reload = useCallback(() => {
    if (inflight.current) return inflight.current;
    const gen = generation.current;
    setLoading(true);
    const run = repo
      .get()
      .then(
        (next) => {
          if (gen === generation.current) apply(next);
        },
        (err: unknown) => {
          if (gen === generation.current) setError(err);
        },
      )
      .finally(() => {
        inflight.current = null;
        setLoading(false);
      });
    inflight.current = run;
    return run;
  }, [apply]);

  const ensureFresh = useCallback(
    (maxAgeMs: number) =>
      isOlderThan(fetchedAt.current, maxAgeMs) ? reload() : Promise.resolve(),
    [reload],
  );

  const replace = useCallback(
    (next: FxLiveBoard) => {
      generation.current += 1;
      apply(next);
    },
    [apply],
  );

  useEffect(() => {
    let timer: number | undefined;
    const stop = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      timer = window.setInterval(() => void reload(), FX_LIVE_POLL_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void ensureFresh(FX_LIVE_POLL_MS);
        start();
      } else {
        stop();
      }
    };

    void reload();
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reload, ensureFresh]);

  return { board, error, loading, reload, ensureFresh, replace };
}
