import type { BackendUnauthorizedCode, SessionEndReason } from "../auth-contract";

/**
 * Pure BFF decisions for backend 401s and refresh failures (no I/O; see
 * `scripts/selftest-unauthorized-policy.ts`). Type-only imports keep it loadable by
 * `node --experimental-strip-types`, hence the string literals checked against the contract.
 */

export type UnauthorizedDecision =
  | { action: "refresh"; reloadViewer: boolean }
  | { action: "end"; reason: SessionEndReason };

export type UnauthorizedState = {
  /** A refresh already happened while serving this request (max one per request). */
  refreshed: boolean;
  hasRefreshToken: boolean;
};

/** Reason to report when a 401 can no longer be recovered by refreshing. */
export function sessionEndReasonFor(code: string | undefined): SessionEndReason {
  return (code as BackendUnauthorizedCode | undefined) === "session_revoked" ? "revoked" : "expired";
}

export function decideOnUnauthorized(
  code: string | undefined,
  state: UnauthorizedState,
): UnauthorizedDecision {
  const reason = sessionEndReasonFor(code);
  if (reason === "revoked" || state.refreshed || !state.hasRefreshToken) {
    return { action: "end", reason };
  }
  return {
    action: "refresh",
    reloadViewer: (code as BackendUnauthorizedCode | undefined) === "token_stale",
  };
}

export type RefreshFailure = { status: number; code: string; network: boolean };

/** `null` → not a session problem (network / 5xx): surface the error unchanged. */
export function sessionEndOnRefreshFailure(failure: RefreshFailure): SessionEndReason | null {
  if (failure.network) return null;
  if (failure.status === 400 || failure.status === 401) return sessionEndReasonFor(failure.code);
  return null;
}
