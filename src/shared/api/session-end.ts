import { routes } from "@/shared/config/routes";
import { isApiError, SESSION_EXPIRED_CODE } from "./api-error";
import type { SessionEndReason } from "./auth-contract";

export const SESSION_END_PARAM = "reason";

export function isSessionEndReason(value: unknown): value is SessionEndReason {
  return value === "expired" || value === "revoked";
}

/** Why the BFF ended the session; any other 401 is treated as a plain expiry. */
export function sessionEndReason(err: unknown): SessionEndReason {
  return isApiError(err) && err.code === SESSION_EXPIRED_CODE && isSessionEndReason(err.reason)
    ? err.reason
    : "expired";
}

export function loginHref(locale: string, reason?: SessionEndReason): string {
  const base = `/${locale}${routes.login}`;
  return reason ? `${base}?${SESSION_END_PARAM}=${reason}` : base;
}
