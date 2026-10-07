/** Resolves after `ms`, or rejects as soon as `signal` aborts. */
export function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(timer), reject(signal.reason)), { once: true });
  });
}

/**
 * Delay between reveal pieces so a reply of any length appears within `budgetMs`:
 * short replies type naturally, long ones never keep the reader waiting.
 */
export function revealDelay(pieces: number, perPieceMs: number, budgetMs = 900): number {
  if (pieces <= 0 || perPieceMs <= 0) return 0;
  return Math.min(perPieceMs, Math.floor(budgetMs / pieces));
}

/** Word-sized pieces (with their trailing space) for a typing reveal; joined they rebuild the text. */
export function revealPieces(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? [];
}
