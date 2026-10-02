/**
 * Pure type → hold → delete → pause cycle over a list of words. Works on grapheme
 * clusters so joined scripts (Arabic) and emoji never split mid-character.
 */
export type TypewriterPhase = "typing" | "holding" | "deleting" | "pausing";

export type TypewriterState = { word: number; length: number; phase: TypewriterPhase };

export type TypewriterTiming = {
  typeMs: number;
  deleteMs: number;
  holdMs: number;
  pauseMs: number;
};

export const DEFAULT_TIMING: TypewriterTiming = { typeMs: 95, deleteMs: 55, holdMs: 1600, pauseMs: 380 };

export function graphemes(text: string): string[] {
  const Segmenter = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Segmenter) return Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment);
  return Array.from(text);
}

export const TYPEWRITER_START: TypewriterState = { word: 0, length: 0, phase: "typing" };

/** Next state and how long to wait before showing it. `instant` skips per-letter steps. */
export function stepTypewriter(
  words: readonly (readonly string[])[],
  s: TypewriterState,
  timing: TypewriterTiming,
  instant = false,
): { state: TypewriterState; delay: number } {
  if (words.length === 0) return { state: TYPEWRITER_START, delay: timing.holdMs };
  const full = words[s.word % words.length].length;
  switch (s.phase) {
    case "typing":
      if (instant || s.length + 1 >= full) return { state: { ...s, length: full, phase: "holding" }, delay: instant ? 0 : timing.typeMs };
      return { state: { ...s, length: s.length + 1 }, delay: timing.typeMs };
    case "holding":
      return { state: { ...s, phase: "deleting" }, delay: timing.holdMs };
    case "deleting":
      if (instant || s.length <= 1) return { state: { ...s, length: 0, phase: "pausing" }, delay: instant ? 0 : timing.deleteMs };
      return { state: { ...s, length: s.length - 1 }, delay: timing.deleteMs };
    case "pausing":
      return { state: { word: (s.word + 1) % words.length, length: 0, phase: "typing" }, delay: timing.pauseMs };
  }
}

export function visibleText(words: readonly (readonly string[])[], s: TypewriterState): string {
  return words.length ? words[s.word % words.length].slice(0, s.length).join("") : "";
}
