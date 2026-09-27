"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  realtimeConnection,
  topicMatches,
  type RealtimeSignal,
  type RealtimeStatus,
} from "@/shared/api/realtime";

export type RealtimeFilter = {
  types?: readonly RealtimeSignal["type"][];
  /** Topic prefixes, e.g. `["task", "payment.recorded"]`; omit for every topic. */
  topics?: readonly string[];
};

function accepts(s: RealtimeSignal, filter: RealtimeFilter) {
  if (filter.types && !filter.types.includes(s.type)) return false;
  return !filter.topics || topicMatches(s.topic, filter.topics);
}

/**
 * Calls `onSignal` for matching server signals. Bursts are coalesced into one call per
 * `debounceMs`, since a single business change can announce several events.
 */
export function useRealtime(
  onSignal: (s: RealtimeSignal) => void,
  filter: RealtimeFilter = {},
  options: { enabled?: boolean; debounceMs?: number } = {},
) {
  const enabled = options.enabled ?? true;
  const debounceMs = options.debounceMs ?? 400;
  const handler = useRef(onSignal);
  handler.current = onSignal;
  const filterRef = useRef(filter);
  filterRef.current = filter;

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let last: RealtimeSignal | null = null;
    const unsubscribe = realtimeConnection().subscribe((s) => {
      if (!accepts(s, filterRef.current)) return;
      last = s;
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        if (last) handler.current(last);
      }, debounceMs);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [enabled, debounceMs]);
}

export function useRealtimeStatus(): RealtimeStatus {
  return useSyncExternalStore(
    (cb) => realtimeConnection().onStatus(cb),
    () => realtimeConnection().status,
    () => "idle",
  );
}
