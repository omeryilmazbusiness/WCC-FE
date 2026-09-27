import { ApiError } from "../api-error";
import { CSRF_HEADER, CSRF_HEADER_VALUE } from "../http-client";
import { serverEnv } from "./server-env";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isSafeMethod(method: string): boolean {
  return SAFE_METHODS.has(method.toUpperCase());
}

function requestOrigin(req: Request): string {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

/**
 * Cookie-authenticated mutations require the custom header (cannot be sent cross-site
 * without a CORS preflight we never answer) and, when present, a same-origin Origin.
 */
export function csrfError(req: Request): ApiError | null {
  const forbidden = (message: string) =>
    new ApiError({ status: 403, code: "csrf_failed", message });

  if (req.headers.get(CSRF_HEADER) !== CSRF_HEADER_VALUE) {
    return forbidden("Missing CSRF header");
  }
  const origin = req.headers.get("origin");
  if (!origin) return null;
  const allowed = new Set([new URL(req.url).origin, requestOrigin(req), ...serverEnv.allowedOrigins]);
  return allowed.has(origin) ? null : forbidden("Cross-origin request rejected");
}
