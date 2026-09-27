import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/shared/config/env";
import { ApiError, apiErrorFromResponse } from "../api-error";
import { PROXY_BLOCKED_PATHS, VIEWER_REFRESHED_HEADER } from "../auth-contract";
import { ACCESS_COOKIE, REFRESH_COOKIE, SESSION_COOKIE, type ViewerSession } from "../session";
import { isDemoToken, loadViewer, refreshTokens } from "./auth-service";
import { backendFetch, clientMetaFrom, upstreamUnavailable, type ClientMeta } from "./backend";
import { errorResponse, sessionEnded, sessionFailureResponse } from "./bff-handlers";
import { sessionExpiresAt, setSessionCookie, setTokenCookies, type TokenSet } from "./cookies";
import { csrfError, isSafeMethod } from "./csrf";
import { signSession, verifySession } from "./session-token";
import { decideOnUnauthorized, sessionEndReasonFor } from "./unauthorized-policy";

const FORWARD_REQUEST_HEADERS = ["accept", "content-type", "idempotency-key", "accept-language"];
const FORWARD_RESPONSE_HEADERS = [
  "content-type",
  "content-disposition",
  "content-length",
  "cache-control",
  "retry-after",
  "x-request-id",
];

/** Streams any upstream body (JSON, CSV, files) through unchanged, with its download headers. */
function toResponse(upstream: Response): NextResponse {
  const headers = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  // fetch() already decoded a compressed body, so the upstream length no longer matches it.
  if (upstream.headers.has("content-encoding")) headers.delete("content-length");
  const bodyless = upstream.status === 204 || upstream.status === 304;
  return new NextResponse(bodyless ? null : upstream.body, { status: upstream.status, headers });
}

/**
 * After a `token_stale` refresh the snapshot is rebuilt from `/v1/auth/me` so nav and
 * permissions change immediately; otherwise (or if `/me` fails) only its expiry moves.
 */
async function nextSnapshot(
  current: ViewerSession | null,
  accessToken: string,
  reloadViewer: boolean,
  meta: ClientMeta,
): Promise<{ viewer: ViewerSession; reloaded: boolean } | null> {
  if (reloadViewer) {
    try {
      const viewer = await loadViewer(accessToken, meta, {
        mfaEnrollmentRequired: current?.mfaEnrollmentRequired,
      });
      return { viewer, reloaded: true };
    } catch {
      // the proxied response already succeeded; the client re-reads /auth/me on the header
    }
  }
  return current ? { viewer: { ...current, expiresAt: sessionExpiresAt() }, reloaded: false } : null;
}

/**
 * `/api/proxy/[...path]` → `${API_BASE_URL}/[...path]`. Attaches the HttpOnly access
 * token and performs at most one refresh per request (see `decideOnUnauthorized`).
 */
export async function proxyRequest(req: NextRequest, segments: string[]): Promise<NextResponse> {
  const path = `/${segments.map(encodeURIComponent).join("/")}`;
  if (PROXY_BLOCKED_PATHS.includes(path)) {
    return errorResponse(new ApiError({ status: 404, code: "not_found", message: "Not found" }));
  }
  if (!isSafeMethod(req.method)) {
    const csrf = csrfError(req);
    if (csrf) return errorResponse(csrf);
  }

  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  let access = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!access && !refresh) return sessionEnded();
  if (isDemoToken(access) || isDemoToken(refresh)) {
    // Demo sessions only exist while the backend is unreachable in demo mode.
    return env.demoMode ? errorResponse(upstreamUnavailable()) : sessionEnded();
  }

  const meta = clientMetaFrom(req.headers);
  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  const body = isSafeMethod(req.method) ? undefined : await req.arrayBuffer();
  const target = `${path}${req.nextUrl.search}`;
  const forward = (token: string) =>
    backendFetch(target, { method: req.method, headers, body, accessToken: token, meta });

  let rotated: TokenSet | null = null;
  let reloadViewer = false;
  try {
    if (!access && refresh) {
      rotated = await refreshTokens(refresh, meta);
      access = rotated.accessToken;
    }
    let upstream = await forward(access!);
    if (upstream.status === 401) {
      const { code } = await apiErrorFromResponse(upstream);
      const decision = decideOnUnauthorized(code, {
        refreshed: rotated !== null,
        hasRefreshToken: Boolean(refresh),
      });
      if (decision.action === "end") return sessionEnded(decision.reason);
      reloadViewer = decision.reloadViewer;
      rotated = await refreshTokens(refresh!, meta);
      upstream = await forward(rotated.accessToken);
      if (upstream.status === 401) {
        return sessionEnded(sessionEndReasonFor((await apiErrorFromResponse(upstream)).code));
      }
    }

    const res = toResponse(upstream);
    if (rotated) {
      setTokenCookies(res, rotated);
      const current = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
      const snapshot = await nextSnapshot(current, rotated.accessToken, reloadViewer, meta);
      if (snapshot) setSessionCookie(res, await signSession(snapshot.viewer));
      if (reloadViewer) res.headers.set(VIEWER_REFRESHED_HEADER, snapshot?.reloaded ? "1" : "0");
    }
    return res;
  } catch (err) {
    return sessionFailureResponse(err);
  }
}
