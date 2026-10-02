"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_TIMING,
  TYPEWRITER_START,
  graphemes,
  stepTypewriter,
  visibleText,
  type TypewriterTiming,
} from "./typewriter";

type Options = {
  timing?: TypewriterTiming;
  /** Swap whole words instead of typing (prefers-reduced-motion). */
  instant?: boolean;
  /** Pause while off-screen. */
  enabled?: boolean;
};

/** Types each word, holds it, deletes it, then moves on to the next — forever. */
export function useTypewriter(words: readonly string[], { timing = DEFAULT_TIMING, instant = false, enabled = true }: Options = {}) {
  const key = words.join("\u0000");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const split = useMemo(() => words.map(graphemes), [key]);
  const [state, setState] = useState(TYPEWRITER_START);

  useEffect(() => {
    setState(TYPEWRITER_START);
  }, [key]);

  useEffect(() => {
    if (!enabled) return;
    const { state: next, delay } = stepTypewriter(split, state, timing, instant);
    const handle = window.setTimeout(() => setState(next), delay);
    return () => window.clearTimeout(handle);
  }, [enabled, instant, split, state, timing]);

  return { text: visibleText(split, state), word: state.word % Math.max(1, split.length), phase: state.phase };
}
