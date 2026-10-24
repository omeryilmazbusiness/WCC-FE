/** Shared across tabs so activity in one desk tab keeps the others open. */
export const IDLE_ACTIVITY_KEY = "wcc.idle.last-activity";
export const IDLE_WARN_BEFORE_MS = 60_000;

export function idleRemainingMs(lastActivityAt: number, minutes: number, now: number): number {
  if (minutes <= 0) return Number.POSITIVE_INFINITY;
  return lastActivityAt + minutes * 60_000 - now;
}

export function idleShouldLogout(remainingMs: number): boolean {
  return Number.isFinite(remainingMs) && remainingMs <= 0;
}

export function idleShouldWarn(remainingMs: number, warnBeforeMs = IDLE_WARN_BEFORE_MS): boolean {
  return Number.isFinite(remainingMs) && remainingMs > 0 && remainingMs <= warnBeforeMs;
}
