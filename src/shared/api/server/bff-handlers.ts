import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/shared/config/env";
import { routes } from "@/shared/config/routes";
import { isCompanySlug, PLATFORM_SIGN_IN } from "@/shared/lib/workspace-path";
import {
  ApiError,
  isApiError,
  isNetworkError,
  SESSION_EXPIRED_CODE,
} from "../api-error";
import type {
  BackendLoginResponse,
  LoginResult,
  MfaSetupConfirmResult,
  SessionEndReason,
} from "../auth-contract";
import {
  ACCESS_COOKIE,
  ENROLLMENT_COOKIE,
  REFRESH_COOKIE,
  SESSION_COOKIE,
  type ViewerSession,
} from "../session";
import {
  backendLogin,
  backendLogout,
  backendMfaSetup,
  backendMfaSetupConfirm,
  backendVerifyMfa,
  demoLogin,
  hasTokens,
  landingFor,
  loadViewer,
  refreshTokens,
  toTokenSet,
} from "./auth-service";
import { clientMetaFrom, type ClientMeta } from "./backend";
import {
  clearAuthCookies,
  clearEnrollmentCookie,
  sessionExpiresAt,
  setCompanyCookie,
  setEnrollmentCookie,
  setSessionCookie,
  setTokenCookies,
  type TokenSet,
} from "./cookies";
import { csrfError } from "./csrf";
import { signSession, verifySession } from "./session-token";
import { decideOnUnauthorized, sessionEndOnRefreshFailure } from "./unauthorized-policy";

export function errorResponse(err: unknown): NextResponse {
  const apiErr = isApiError(err)
    ? err
    : new ApiError({ status: 500, code: "internal_error", message: "Internal error" });
  const status = apiErr.status === 0 ? 503 : apiErr.status;
  const res = NextResponse.json(
    {
      error: {
        code: apiErr.code,
        message: apiErr.message,
        ...(apiErr.fieldErrors ? { fields: apiErr.fieldErrors } : {}),
        ...(apiErr.retryAfter !== undefined ? { retry_after: apiErr.retryAfter } : {}),
        ...(apiErr.reason ? { reason: apiErr.reason } : {}),
      },
    },
    { status },
  );
  if (apiErr.retryAfter !== undefined) res.headers.set("Retry-After", String(apiErr.retryAfter));
  return res;
}

/** 401 `session_expired` + cleared auth cookies; the browser client then redirects to login. */
export function sessionEnded(reason: SessionEndReason = "expired"): NextResponse {
  const res = errorResponse(
    new ApiError({
      status: 401,
      code: SESSION_EXPIRED_CODE,
      message: reason === "revoked" ? "Signed out on this device" : "Session expired",
      reason,
    }),
  );
  clearAuthCookies(res);
  return res;
}

/** Maps a failed refresh / re-auth: session problems end the session, the rest pass through. */
export function sessionFailureResponse(err: unknown): NextResponse {
  const reason = isApiError(err)
    ? sessionEndOnRefreshFailure({ status: err.status, code: err.code, network: err.isNetwork })
    : null;
  return reason ? sessionEnded(reason) : errorResponse(err);
}

async function readJson<T>(req: NextRequest): Promise<Partial<T>> {
  return (await req.json().catch(() => ({}))) as Partial<T>;
}

/** The sign-in page to remember for the viewer: their company, or the platform page for admins. */
function signInOf(viewer: ViewerSession): string | undefined {
  return viewer.workspace?.company.slug ?? (viewer.user.role === "admin" ? PLATFORM_SIGN_IN : undefined);
}

async function authenticatedResponse(
  tokens: TokenSet,
  viewer: ViewerSession,
  status: "authenticated" | "mfa_enrollment_required",
  meta: ClientMeta,
): Promise<NextResponse> {
  const body: LoginResult = {
    status,
    home: status === "authenticated" ? await landingFor(tokens.accessToken, viewer, meta) : routes.security,
    viewer,
  };
  const res = NextResponse.json({ data: body });
  setTokenCookies(res, tokens);
  setSessionCookie(res, await signSession(viewer));
  setCompanyCookie(res, signInOf(viewer));
  return res;
}

const DEFAULT_ENROLLMENT_TTL_SECONDS = 900;

async function completeLogin(login: BackendLoginResponse, meta: ClientMeta): Promise<NextResponse> {
  if (login.mfa_required && login.mfa_challenge) {
    const body: LoginResult = { status: "mfa_required", challenge: login.mfa_challenge };
    return NextResponse.json({ data: body });
  }
  if (login.mfa_enrollment_required && login.enrollment_token && !hasTokens(login)) {
    const body: LoginResult = { status: "mfa_setup_required" };
    const res = NextResponse.json({ data: body });
    setEnrollmentCookie(
      res,
      login.enrollment_token,
      login.enrollment_expires_in ?? DEFAULT_ENROLLMENT_TTL_SECONDS,
    );
    return res;
  }
  if (!hasTokens(login)) {
    throw new ApiError({ status: 502, code: "bad_gateway", message: "Unexpected login response" });
  }
  const tokens = toTokenSet(login);
  const enrollment = Boolean(login.mfa_enrollment_required);
  const viewer = await loadViewer(tokens.accessToken, meta, { mfaEnrollmentRequired: enrollment });
  return authenticatedResponse(
    tokens,
    viewer,
    viewer.mfaEnrollmentRequired ? "mfa_enrollment_required" : "authenticated",
    meta,
  );
}

export async function handleLogin(req: NextRequest): Promise<NextResponse> {
  const csrf = csrfError(req);
  if (csrf) return errorResponse(csrf);
  const { email, password, company, platform } = await readJson<{
    email: string;
    password: string;
    company: string;
    platform: boolean;
  }>(req);
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return errorResponse(
      new ApiError({ status: 400, code: "validation_error", message: "Email and password are required" }),
    );
  }
  const meta = clientMetaFrom(req.headers);
  try {
    const scope =
      platform === true
        ? { platform: true }
        : typeof company === "string" && isCompanySlug(company)
          ? { company }
          : {};
    return await completeLogin(await backendLogin(email, password, meta, scope), meta);
  } catch (err) {
    if (env.demoMode && isNetworkError(err)) {
      try {
        const demo = demoLogin(email, password);
        return await authenticatedResponse(demo.tokens, demo.viewer, "authenticated", meta);
      } catch (demoErr) {
        return errorResponse(demoErr);
      }
    }
    return errorResponse(err);
  }
}

export async function handleMfaVerify(req: NextRequest): Promise<NextResponse> {
  const csrf = csrfError(req);
  if (csrf) return errorResponse(csrf);
  const { challenge, code } = await readJson<{ challenge: string; code: string }>(req);
  if (typeof challenge !== "string" || typeof code !== "string" || !challenge || !code.trim()) {
    return errorResponse(
      new ApiError({ status: 400, code: "validation_error", message: "Challenge and code are required" }),
    );
  }
  const meta = clientMetaFrom(req.headers);
  try {
    const res = await backendVerifyMfa({ challenge, code: code.replace(/\s+/g, "") }, meta);
    return await completeLogin({ ...res, mfa_required: false }, meta);
  } catch (err) {
    return errorResponse(err);
  }
}

function enrollmentExpired(): NextResponse {
  const res = errorResponse(
    new ApiError({ status: 401, code: SESSION_EXPIRED_CODE, message: "MFA setup expired" }),
  );
  clearEnrollmentCookie(res);
  return res;
}

/** Starts pre-session MFA setup with the HttpOnly enrollment token from login. */
export async function handleMfaSetup(req: NextRequest): Promise<NextResponse> {
  const csrf = csrfError(req);
  if (csrf) return errorResponse(csrf);
  const token = req.cookies.get(ENROLLMENT_COOKIE)?.value;
  if (!token) return enrollmentExpired();
  try {
    return NextResponse.json({ data: await backendMfaSetup(token, clientMetaFrom(req.headers)) });
  } catch (err) {
    return isApiError(err) && err.status === 401 ? enrollmentExpired() : errorResponse(err);
  }
}

/** Confirms the first TOTP code; the backend then issues the session. */
export async function handleMfaSetupConfirm(req: NextRequest): Promise<NextResponse> {
  const csrf = csrfError(req);
  if (csrf) return errorResponse(csrf);
  const token = req.cookies.get(ENROLLMENT_COOKIE)?.value;
  if (!token) return enrollmentExpired();
  const { code } = await readJson<{ code: string }>(req);
  if (typeof code !== "string" || !code.trim()) {
    return errorResponse(
      new ApiError({ status: 400, code: "validation_error", message: "Code is required" }),
    );
  }
  const meta = clientMetaFrom(req.headers);
  try {
    const confirmed = await backendMfaSetupConfirm(token, code.replace(/\s+/g, ""), meta);
    const tokens = toTokenSet(confirmed);
    const viewer = await loadViewer(tokens.accessToken, meta, { mfaEnrollmentRequired: false });
    const body: MfaSetupConfirmResult = {
      home: await landingFor(tokens.accessToken, viewer, meta),
      viewer,
      recovery_codes: confirmed.recovery_codes ?? [],
    };
    const res = NextResponse.json({ data: body });
    setTokenCookies(res, tokens);
    setSessionCookie(res, await signSession(viewer));
    setCompanyCookie(res, signInOf(viewer));
    clearEnrollmentCookie(res);
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}

async function resignSession(req: NextRequest, res: NextResponse) {
  const current = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (current) {
    setSessionCookie(res, await signSession({ ...current, expiresAt: sessionExpiresAt() }));
  }
}

export async function handleRefresh(req: NextRequest): Promise<NextResponse> {
  const csrf = csrfError(req);
  if (csrf) return errorResponse(csrf);
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) return sessionEnded();
  try {
    const tokens = await refreshTokens(refresh, clientMetaFrom(req.headers));
    const res = NextResponse.json({ data: { ok: true } });
    setTokenCookies(res, tokens);
    await resignSession(req, res);
    return res;
  } catch (err) {
    return sessionFailureResponse(err);
  }
}

export async function handleLogout(req: NextRequest): Promise<NextResponse> {
  const csrf = csrfError(req);
  if (csrf) return errorResponse(csrf);
  await backendLogout(
    req.cookies.get(ACCESS_COOKIE)?.value,
    req.cookies.get(REFRESH_COOKIE)?.value,
    clientMetaFrom(req.headers),
  );
  const res = NextResponse.json({ data: { ok: true } });
  clearAuthCookies(res);
  return res;
}

/** Re-reads `/v1/auth/me` so role / permission changes reach the signed session. */
export async function handleMe(req: NextRequest): Promise<NextResponse> {
  const meta = clientMetaFrom(req.headers);
  let access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  const current = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const flags = { mfaEnrollmentRequired: current?.mfaEnrollmentRequired };
  let rotated: TokenSet | null = null;

  try {
    if (!access && refresh) {
      rotated = await refreshTokens(refresh, meta);
      access = rotated.accessToken;
    }
    if (!access) return sessionEnded();

    let viewer: ViewerSession;
    try {
      viewer = await loadViewer(access, meta, flags);
    } catch (err) {
      if (!(isApiError(err) && err.status === 401)) throw err;
      const decision = decideOnUnauthorized(err.code, {
        refreshed: rotated !== null,
        hasRefreshToken: Boolean(refresh),
      });
      if (decision.action === "end") return sessionEnded(decision.reason);
      rotated = await refreshTokens(refresh!, meta);
      viewer = await loadViewer(rotated.accessToken, meta, flags);
    }

    const res = NextResponse.json({ data: viewer });
    if (rotated) setTokenCookies(res, rotated);
    setSessionCookie(res, await signSession(viewer));
    return res;
  } catch (err) {
    return sessionFailureResponse(err);
  }
}
