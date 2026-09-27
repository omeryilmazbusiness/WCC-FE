import { isApiError } from "@/shared/api/api-error";
import { LOCKED_ERROR_CODE } from "@/shared/api/auth-contract";

export type Lockout = { kind: "locked" | "rate_limited"; until: number | null };

/** 423 (account locked) and 429 (rate limited) both carry Retry-After seconds. */
export function lockoutFrom(err: unknown): Lockout | null {
  if (!isApiError(err)) return null;
  const locked = err.status === 423 || err.code === LOCKED_ERROR_CODE;
  if (!locked && err.status !== 429) return null;
  return {
    kind: locked ? "locked" : "rate_limited",
    until: err.retryAfter !== undefined ? Date.now() + err.retryAfter * 1000 : null,
  };
}
