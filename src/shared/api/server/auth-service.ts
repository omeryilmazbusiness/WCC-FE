import {
  DEMO_ROLE_PERMISSIONS,
  DEMO_ROLE_SCOPE,
  homeFor,
  isPermission,
} from "@/shared/config/permissions";
import { isAppRole, routes, type AppRole } from "@/shared/config/routes";
import { env } from "@/shared/config/env";
import { withWorkspace, type WorkspaceRef } from "@/shared/lib/workspace-path";
import { ApiError } from "../api-error";
import {
  AUTH_ENDPOINTS,
  type BackendLoginResponse,
  type BackendMeResponse,
  type BackendMfaSetupConfirmResponse,
  type MfaEnrollResponse,
  type BackendTokenPair,
  type BackendUser,
  type MfaVerifyRequest,
} from "../auth-contract";
import type { SessionUser, SessionWorkspace, ViewerSession } from "../session";
import { backendFetch, backendJson, type ClientMeta } from "./backend";
import { sessionExpiresAt, type TokenSet } from "./cookies";

const DEMO_TOKEN_PREFIX = "demo.";
const DEMO_PASSWORD = "ChangeMe123!";
const DEMO_BRANCH = "11111111-1111-1111-1111-111111111111";
const DEMO_COMPANY = "33333333-3333-3333-3333-333333333333";
const REFRESH_REUSE_WINDOW_MS = 30_000;

export function toTokenSet(pair: BackendTokenPair): TokenSet {
  return {
    accessToken: pair.access_token,
    refreshToken: pair.refresh_token,
    expiresIn: pair.expires_in,
  };
}

export function hasTokens(res: BackendLoginResponse): res is BackendLoginResponse & BackendTokenPair {
  return Boolean(res.access_token && res.refresh_token);
}

export function backendLogin(email: string, password: string, meta: ClientMeta) {
  return backendJson<BackendLoginResponse>(AUTH_ENDPOINTS.login, {
    method: "POST",
    body: JSON.stringify({ email, password }),
    meta,
  });
}

export function backendVerifyMfa(body: MfaVerifyRequest, meta: ClientMeta) {
  return backendJson<BackendLoginResponse>(AUTH_ENDPOINTS.mfaVerify, {
    method: "POST",
    body: JSON.stringify(body),
    meta,
  });
}

export function backendMfaSetup(enrollmentToken: string, meta: ClientMeta) {
  return backendJson<MfaEnrollResponse>(AUTH_ENDPOINTS.mfaSetup, {
    method: "POST",
    body: JSON.stringify({ enrollment_token: enrollmentToken }),
    meta,
  });
}

export function backendMfaSetupConfirm(enrollmentToken: string, code: string, meta: ClientMeta) {
  return backendJson<BackendMfaSetupConfirmResponse>(AUTH_ENDPOINTS.mfaSetupConfirm, {
    method: "POST",
    body: JSON.stringify({ enrollment_token: enrollmentToken, code }),
    meta,
  });
}

type RefreshStore = {
  inflight: Map<string, Promise<TokenSet>>;
  recent: Map<string, { tokens: TokenSet; at: number }>;
};

// Shared across route bundles in the same process so parallel 401s rotate once.
const refreshStore: RefreshStore = ((globalThis as { __wccRefresh?: RefreshStore }).__wccRefresh ??= {
  inflight: new Map(),
  recent: new Map(),
});

/**
 * Rotating refresh with an opaque token (never parsed here). Concurrent callers in this
 * process share one request and reuse its result for 30 s so parallel 401s rotate once;
 * across instances the backend accepts the same token again within its 10 s grace window.
 * A 401 means the session is gone (revoked, idle or absolute lifetime reached).
 */
export async function refreshTokens(refreshToken: string, meta: ClientMeta): Promise<TokenSet> {
  const now = Date.now();
  for (const [key, entry] of refreshStore.recent) {
    if (now - entry.at > REFRESH_REUSE_WINDOW_MS) refreshStore.recent.delete(key);
  }
  const recent = refreshStore.recent.get(refreshToken);
  if (recent) return recent.tokens;

  const pending = refreshStore.inflight.get(refreshToken);
  if (pending) return pending;

  const request = backendJson<BackendTokenPair>(AUTH_ENDPOINTS.refresh, {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
    meta,
  })
    .then((pair) => {
      const tokens = toTokenSet(pair);
      refreshStore.recent.set(refreshToken, { tokens, at: Date.now() });
      return tokens;
    })
    .finally(() => refreshStore.inflight.delete(refreshToken));

  refreshStore.inflight.set(refreshToken, request);
  return request;
}

export async function backendLogout(
  accessToken: string | undefined,
  refreshToken: string | undefined,
  meta: ClientMeta,
): Promise<void> {
  if (!accessToken && !refreshToken) return;
  if (accessToken && isDemoToken(accessToken)) return;
  try {
    await backendFetch(AUTH_ENDPOINTS.logout, {
      method: "POST",
      accessToken,
      body: JSON.stringify({ refresh_token: refreshToken ?? "" }),
      meta,
    });
  } catch {
    // cookies are cleared regardless; the backend session expires on its own
  }
}

function mapUser(user: BackendUser): SessionUser {
  if (!isAppRole(user.role)) {
    throw new ApiError({ status: 403, code: "unknown_role", message: "Unknown role" });
  }
  return {
    id: String(user.id),
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    branchId: String(user.branch_id ?? ""),
    teamId: user.team_id ?? null,
    mfaEnabled: Boolean(user.mfa_enabled),
  };
}

/** Session cookies stay small: a tenant never needs more branches than this in the switcher. */
const MAX_SESSION_BRANCHES = 60;

function mapWorkspace(me: BackendMeResponse): SessionWorkspace | undefined {
  if (!me.company?.slug || !me.branches?.length) return undefined;
  return {
    company: {
      id: String(me.company.id),
      slug: me.company.slug,
      nameEn: me.company.name_en ?? "",
      nameAr: me.company.name_ar ?? "",
    },
    homeBranchId: String(me.home_branch_id ?? me.branch_id ?? ""),
    branches: me.branches
      .filter((b) => b.is_active !== false || String(b.id) === String(me.home_branch_id))
      .slice(0, MAX_SESSION_BRANCHES)
      .map((b) => ({
        id: String(b.id),
        slug: b.slug,
        code: b.code ?? "",
        nameEn: b.name_en ?? "",
        nameAr: b.name_ar ?? "",
        kind: b.kind === "main_center" ? "main_center" : "branch",
      })),
  };
}

export async function loadViewer(
  accessToken: string,
  meta: ClientMeta,
  flags: { mfaEnrollmentRequired?: boolean } = {},
): Promise<ViewerSession> {
  if (isDemoToken(accessToken)) {
    const role = accessToken.slice(DEMO_TOKEN_PREFIX.length);
    if (env.demoMode && isAppRole(role)) return demoViewer(role);
    throw new ApiError({ status: 401, code: "unauthorized", message: "Invalid session" });
  }
  const me = await backendJson<BackendMeResponse>(AUTH_ENDPOINTS.me, { accessToken, meta });
  const user = mapUser(me);
  return {
    user,
    permissions: (me.permissions ?? []).filter(isPermission),
    scope: me.scope ?? "own",
    workspace: mapWorkspace(me),
    expiresAt: sessionExpiresAt(),
    mfaEnrollmentRequired: Boolean(flags.mfaEnrollmentRequired) && !user.mfaEnabled,
  };
}

/** The viewer's home workspace (`company/home-branch`), if the session carries one. */
export function homeWorkspace(viewer: ViewerSession): WorkspaceRef | null {
  const ws = viewer.workspace;
  if (!ws) return null;
  const branch = ws.branches.find((b) => b.id === ws.homeBranchId) ?? ws.branches[0];
  return branch ? { company: ws.company.slug, branch: branch.slug } : null;
}

/**
 * Post-login landing inside the viewer's home workspace: a GM with unfinished
 * onboarding goes straight to `/setup`.
 */
export async function landingFor(
  accessToken: string,
  viewer: ViewerSession,
  meta: ClientMeta,
): Promise<string> {
  const ref = homeWorkspace(viewer);
  const home = homeFor(viewer.user.role, viewer.permissions);
  if (isDemoToken(accessToken) || !viewer.permissions.includes("setup.manage")) {
    return withWorkspace(home, ref);
  }
  try {
    const setup = await backendJson<{ required?: boolean }>("/setup", { accessToken, meta });
    return withWorkspace(setup.required ? routes.setup : home, ref);
  } catch {
    return withWorkspace(home, ref);
  }
}

export function isDemoToken(token: string | undefined): boolean {
  return Boolean(token?.startsWith(DEMO_TOKEN_PREFIX));
}

const DEMO_USERS: Record<string, { id: string; fullName: string; role: AppRole }> = {
  "gm@wodi.local": { id: "22222222-2222-2222-2222-222222222201", fullName: "General Manager", role: "gm" },
  "manager@wodi.local": { id: "22222222-2222-2222-2222-222222222202", fullName: "Branch Manager", role: "manager" },
  "sales@wodi.local": { id: "22222222-2222-2222-2222-222222222203", fullName: "Sales Employee", role: "employee" },
  "admin@wodi.local": { id: "22222222-2222-2222-2222-222222222204", fullName: "System Admin", role: "admin" },
  "finance@wodi.local": { id: "22222222-2222-2222-2222-222222222205", fullName: "Finance User", role: "finance" },
  "ops@wodi.local": { id: "22222222-2222-2222-2222-222222222206", fullName: "Operations User", role: "operations" },
};

function demoViewer(role: AppRole): ViewerSession {
  const [email, user] =
    Object.entries(DEMO_USERS).find(([, u]) => u.role === role) ?? Object.entries(DEMO_USERS)[0];
  return {
    user: { id: user.id, email, fullName: user.fullName, role, branchId: role === "admin" ? "" : DEMO_BRANCH },
    permissions: [...DEMO_ROLE_PERMISSIONS[role]],
    scope: DEMO_ROLE_SCOPE[role],
    workspace: role === "admin" ? undefined : {
      company: { id: DEMO_COMPANY, slug: "wodi", nameEn: "WODI Travel", nameAr: "ودي للسفر" },
      homeBranchId: DEMO_BRANCH,
      branches: [
        { id: DEMO_BRANCH, slug: "main", code: "WODI", nameEn: "Main Center", nameAr: "المركز الرئيسي", kind: "main_center" },
      ],
    },
    expiresAt: sessionExpiresAt(),
    demo: true,
  };
}

/** Only reachable when NEXT_PUBLIC_DEMO_MODE=true and the backend is unreachable. */
export function demoLogin(
  email: string,
  password: string,
): { tokens: TokenSet; viewer: ViewerSession } {
  const user = DEMO_USERS[email.trim().toLowerCase()];
  if (!env.demoMode || !user || password !== DEMO_PASSWORD) {
    throw new ApiError({ status: 401, code: "invalid_credentials", message: "Invalid credentials" });
  }
  return {
    tokens: {
      accessToken: `${DEMO_TOKEN_PREFIX}${user.role}`,
      refreshToken: `${DEMO_TOKEN_PREFIX}refresh`,
      expiresIn: 60 * 60 * 12,
    },
    viewer: demoViewer(user.role),
  };
}
