import { cookies, headers } from "next/headers";
import { ApiError, SESSION_EXPIRED_CODE } from "../api-error";
import { FetchHttpClient, type HttpClient } from "../http-client";
import { ACCESS_COOKIE } from "../session";
import { serverEnv } from "./server-env";
import { sessionEndReasonFor } from "./unauthorized-policy";

/**
 * Server Components talk to the backend directly with the caller's access token.
 * Cookies cannot be rotated or cleared during RSC render, so every backend 401
 * (`session_revoked`, `token_stale`, expired) surfaces as `session_expired` with a
 * `reason`; the next browser call through `/api/proxy` refreshes or ends the session.
 */
export async function createServerHttpClient(): Promise<HttpClient> {
  const jar = await cookies();
  const incoming = await headers();
  const token = jar.get(ACCESS_COOKIE)?.value;
  return new FetchHttpClient({
    baseUrl: serverEnv.apiBaseUrl,
    headers: () => {
      const out: Record<string, string> = {};
      if (token) out.Authorization = `Bearer ${token}`;
      const forwardedFor = incoming.get("x-forwarded-for");
      if (forwardedFor) out["X-Forwarded-For"] = forwardedFor;
      return out;
    },
    onUnauthorized: (err) =>
      new ApiError({
        status: 401,
        code: SESSION_EXPIRED_CODE,
        message: err.message,
        reason: sessionEndReasonFor(err.code),
      }),
  });
}
