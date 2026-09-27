import type { AllowedTransition } from "@/entities/booking";

export const STATUS_REASON_MIN = 10;
export const INVALID_TRANSITION_CODE = "invalid_transition";
export const GUARD_FAILED_CODE = "guard_failed";

export type StatusChangeFailure =
  | { kind: "invalidTransition" }
  | { kind: "guardFailed"; guards: string[] }
  | { kind: "other" };

export function isStatusReasonValid(reason: string): boolean {
  return reason.trim().length >= STATUS_REASON_MIN;
}

/** Overrides are always justified, so they need a reason too. */
export function reasonRequired(transition: AllowedTransition, override: boolean): boolean {
  return transition.requiresReason || transition.requiresOverride || override;
}

function guardList(details: unknown): string[] {
  const guards = (details as { guards?: unknown } | undefined)?.guards;
  return Array.isArray(guards) ? guards.filter((g): g is string => typeof g === "string") : [];
}

export function classifyStatusError(err: unknown): StatusChangeFailure {
  const e = (err ?? {}) as { status?: unknown; code?: unknown; details?: unknown };
  if (e.status === 409 && e.code === INVALID_TRANSITION_CODE) return { kind: "invalidTransition" };
  if (e.status === 422 && e.code === GUARD_FAILED_CODE) {
    return { kind: "guardFailed", guards: guardList(e.details) };
  }
  return { kind: "other" };
}
