"use client";

import { useSyncExternalStore } from "react";
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

type Snapshot = { board: FxLiveBoard | null; error: unknown; loading: boolean };

const INITIAL: Snapshot = { board: null, error: null, loading: true };

let snapshot: Snapshot = INITIAL;
let inflight: Promise<void> | null = null;
let fetchedAt = 0;
let generation = 0;
let timer: number | undefined;
const listeners = new Set<() => void>();

/** Keeps the snapshot identity when nothing changed, so a hydrating consumer never sees a spurious update. */
function emit(next: Partial<Snapshot>) {
  const keys = Object.keys(next) as (keyof Snapshot)[];
  if (keys.every((k) => Object.is(snapshot[k], next[k]))) return;
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener();
}

function apply(board: FxLiveBoard) {
  fetchedAt = Date.now();
  emit({ board, error: null });
}

function reload(): Promise<void> {
  if (inflight) return inflight;
  const gen = generation;
  emit({ loading: true });
  const run = repo
    .get()
    .then(
      (next) => {
        if (gen === generation) apply(next);
      },
      (err: unknown) => {
        if (gen === generation) emit({ error: err });
      },
    )
    .finally(() => {
      inflight = null;
      emit({ loading: false });
    });
  inflight = run;
  return run;
}

function ensureFresh(maxAgeMs: number): Promise<void> {
  return isOlderThan(fetchedAt, maxAgeMs) ? reload() : Promise.resolve();
}

function replace(board: FxLiveBoard) {
  generation += 1;
  apply(board);
}

function stopPolling() {
  if (timer !== undefined) window.clearInterval(timer);
  timer = undefined;
}

function startPolling() {
  stopPolling();
  timer = window.setInterval(() => void reload(), FX_LIVE_POLL_MS);
}

function onVisibility() {
  if (document.visibilityState === "visible") {
    void ensureFresh(FX_LIVE_POLL_MS);
    startPolling();
  } else {
    stopPolling();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    void ensureFresh(FX_LIVE_POLL_MS);
    if (document.visibilityState === "visible") startPolling();
    document.addEventListener("visibilitychange", onVisibility);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
    }
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => INITIAL;

/**
 * Live FX board shared by every consumer on the page (shell indicator, FX screen, …): one
 * GET at a time, polled every 5 minutes only while the tab is visible and someone is mounted.
 */
export function useLiveFxBoard(): LiveFxBoardState {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { ...state, reload, ensureFresh, replace };
}
