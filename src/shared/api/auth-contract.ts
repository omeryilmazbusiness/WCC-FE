import type { AccessScope } from "@/shared/config/permissions";
import type { ViewerSession } from "./session";

/**
 * Backend auth wire contract (wodi-crm-be `/v1/auth/*`, `/v1/users/{id}/unlock|sessions/revoke`).
 */
export const AUTH_ENDPOINTS = {
  login: "/auth/login",
  refresh: "/auth/refresh",
  logout: "/auth/logout",
  me: "/auth/me",
  mfaVerify: "/auth/mfa/verify",
  mfaSetup: "/auth/mfa/setup",
  mfaSetupConfirm: "/auth/mfa/setup/confirm",
  mfaEnroll: "/auth/mfa/enroll",
  mfaConfirm: "/auth/mfa/confirm",
  mfaDisable: "/auth/mfa/disable",
  mfaRecoveryCodes: "/auth/mfa/recovery-codes",
  sessions: "/auth/sessions",
  session: (id: string) => `/auth/sessions/${encodeURIComponent(id)}`,
  revokeOtherSessions: "/auth/sessions/revoke-others",
  password: "/auth/password",
  unlockUser: (id: string) => `/users/${id}/unlock`,
  revokeUserSessions: (id: string) => `/users/${encodeURIComponent(id)}/sessions/revoke`,
} as const;

/** Token-issuing endpoints the browser must never reach through the generic proxy. */
export const PROXY_BLOCKED_PATHS: readonly string[] = [
  AUTH_ENDPOINTS.login,
  AUTH_ENDPOINTS.refresh,
  AUTH_ENDPOINTS.logout,
  AUTH_ENDPOINTS.mfaVerify,
  AUTH_ENDPOINTS.mfaSetup,
  AUTH_ENDPOINTS.mfaSetupConfirm,
  // Answers with a fresh token pair, which must land in HttpOnly cookies (BFF route), never in JS.
  AUTH_ENDPOINTS.password,
];

export const LOCKED_ERROR_CODE = "account_locked";
export const RATE_LIMITED_ERROR_CODE = "rate_limited";

/** Backend 401: session revoked / expired or user deactivated — refreshing cannot help. */
export const SESSION_REVOKED_CODE = "session_revoked";
/** Backend 401: role / permissions changed — one refresh yields a token with fresh claims. */
export const TOKEN_STALE_CODE = "token_stale";
export type BackendUnauthorizedCode = typeof SESSION_REVOKED_CODE | typeof TOKEN_STALE_CODE;

/**
 * BFF → browser: why the session ended (`error.reason` next to code `session_expired`,
 * and the `?reason=` query on the login page).
 */
export type SessionEndReason = "expired" | "revoked";

/** Set by the proxy when it re-signed the viewer snapshot after a `token_stale` refresh. */
export const VIEWER_REFRESHED_HEADER = "x-wcc-viewer-refreshed";

export type AuthMethod = "password" | "totp" | "recovery" | "mfa_setup";

export type BackendSession = {
  id: string;
  created_at: string;
  last_seen_at: string;
  last_ip: string;
  user_agent: string;
  auth_method: AuthMethod;
  idle_expires_at: string;
  absolute_expires_at: string;
  current: boolean;
};

export type RevokedCountResponse = { revoked: number };

export type BackendUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  branch_id: string;
  team_id?: string | null;
  is_active?: boolean;
  mfa_enabled?: boolean;
  job_title?: string;
  avatar_version?: string | null;
};

export type BackendTokenPair = {
  access_token: string;
  /** Opaque rotating value — never parsed by the FE. */
  refresh_token: string;
  expires_in: number;
};

export type BackendLoginResponse = Partial<BackendTokenPair> & {
  mfa_required?: boolean;
  mfa_challenge?: string;
  mfa_enrollment_required?: boolean;
  /** Single-purpose token for pre-session MFA setup (GM/Admin without MFA). */
  enrollment_token?: string;
  enrollment_expires_in?: number;
  user?: BackendUser;
};

export type BackendWorkspaceBranch = {
  id: string;
  slug: string;
  code: string;
  name_en: string;
  name_ar: string;
  kind: "main_center" | "branch";
  is_active?: boolean;
};

export type BackendMeResponse = BackendUser & {
  permissions: string[];
  scope: AccessScope;
  company?: { id: string; slug: string; name_en: string; name_ar: string };
  home_branch_id?: string;
  active_branch_id?: string;
  branches?: BackendWorkspaceBranch[];
};

export type MfaVerifyRequest = { challenge: string; code: string };
export type MfaEnrollResponse = { secret: string; otpauth_url: string };
export type MfaConfirmRequest = { code: string };
export type MfaConfirmResponse = { recovery_codes: string[] };
export type BackendMfaSetupConfirmResponse = BackendTokenPair & {
  recovery_codes: string[];
  user?: BackendUser;
};
export type MfaDisableRequest = { password: string; code: string };
export type MfaRecoveryCodesRequest = { code: string };

/** BFF → browser login outcome (tokens stay in HttpOnly cookies). */
export type LoginResult =
  | { status: "authenticated"; home: string; viewer: ViewerSession }
  | { status: "mfa_required"; challenge: string }
  | { status: "mfa_enrollment_required"; home: string; viewer: ViewerSession }
  /** No session yet: MFA must be set up first; the setup token lives in an HttpOnly cookie. */
  | { status: "mfa_setup_required" };

export type MfaSetupConfirmResult = {
  home: string;
  viewer: ViewerSession;
  recovery_codes: string[];
};
