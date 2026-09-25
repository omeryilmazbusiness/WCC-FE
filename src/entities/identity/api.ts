import { env } from "@/shared/config/env";
import { FetchHttpClient, ApiError } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import type { AppRole } from "@/shared/config/routes";

function tokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  const session = parseSession(raw ? decodeURIComponent(raw) : null);
  return session?.accessToken ?? null;
}

const http = () => new FetchHttpClient(env.apiBaseUrl, tokenFromCookie);

export type Branch = {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
};

export type Team = {
  id: string;
  branch_id: string;
  code: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
};

export type ApiUser = {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  branch_id: string;
  team_id?: string | null;
  is_active: boolean;
  mfa_enabled?: boolean;
};

export type AuditEvent = {
  id: string;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  branch_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
};

const DEMO_BRANCH: Branch = {
  id: "11111111-1111-1111-1111-111111111111",
  code: "HQ",
  name_en: "Head Office",
  name_ar: "المكتب الرئيسي",
  is_active: true,
};

function pickString(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "string" && v) return v;
  }
  return "";
}

function mapBranch(raw: unknown): Branch | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = pickString(r, "id", "ID");
  if (!id) return null;
  return {
    id,
    code: pickString(r, "code", "Code") || "—",
    name_en: pickString(r, "name_en", "NameEN") || id,
    name_ar: pickString(r, "name_ar", "NameAR"),
    is_active: Boolean(r.is_active ?? r.IsActive ?? true),
  };
}

function mapTeam(raw: unknown): Team | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = pickString(r, "id", "ID");
  const branchId = pickString(r, "branch_id", "BranchID");
  if (!id || !branchId) return null;
  return {
    id,
    branch_id: branchId,
    code: pickString(r, "code", "Code") || "—",
    name_en: pickString(r, "name_en", "NameEN") || id,
    name_ar: pickString(r, "name_ar", "NameAR"),
    is_active: Boolean(r.is_active ?? r.IsActive ?? true),
  };
}

const DEMO_USERS: ApiUser[] = [
  {
    id: "22222222-2222-2222-2222-222222222201",
    email: "gm@wodi.local",
    full_name: "General Manager",
    role: "gm",
    branch_id: DEMO_BRANCH.id,
    is_active: true,
  },
  {
    id: "22222222-2222-2222-2222-222222222202",
    email: "manager@wodi.local",
    full_name: "Branch Manager",
    role: "manager",
    branch_id: DEMO_BRANCH.id,
    is_active: true,
  },
  {
    id: "22222222-2222-2222-2222-222222222203",
    email: "sales@wodi.local",
    full_name: "Sales Employee",
    role: "employee",
    branch_id: DEMO_BRANCH.id,
    team_id: "33333333-3333-3333-3333-333333333301",
    is_active: true,
  },
  {
    id: "22222222-2222-2222-2222-222222222204",
    email: "admin@wodi.local",
    full_name: "System Admin",
    role: "admin",
    branch_id: DEMO_BRANCH.id,
    is_active: true,
  },
];

async function withDemoFallback<T>(fn: () => Promise<T>, demo: () => T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError || err instanceof TypeError) return demo();
    throw err;
  }
}

export async function listBranches(): Promise<Branch[]> {
  return withDemoFallback(
    async () => {
      const raw = await http().request<unknown[]>("/branches");
      return (Array.isArray(raw) ? raw : [])
        .map(mapBranch)
        .filter((b): b is Branch => b !== null);
    },
    () => [DEMO_BRANCH],
  );
}

export async function updateBranch(
  id: string,
  body: { code: string; name_en: string; name_ar?: string },
): Promise<Branch> {
  return withDemoFallback(
    async () => {
      const raw = await http().request<unknown>(`/branches/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          code: body.code,
          name_en: body.name_en,
          name_ar: body.name_ar ?? "",
        }),
      });
      const mapped = mapBranch(raw);
      if (!mapped) throw new Error("invalid branch");
      return mapped;
    },
    () => ({
      ...DEMO_BRANCH,
      id,
      code: body.code,
      name_en: body.name_en,
      name_ar: body.name_ar ?? "",
    }),
  );
}

export async function listTeams(branchId?: string): Promise<Team[]> {
  const q = branchId ? `?branch_id=${branchId}` : "";
  return withDemoFallback(
    async () => {
      const raw = await http().request<unknown[]>(`/teams${q}`);
      return (Array.isArray(raw) ? raw : [])
        .map(mapTeam)
        .filter((t): t is Team => t !== null);
    },
    () => [
      {
        id: "33333333-3333-3333-3333-333333333301",
        branch_id: DEMO_BRANCH.id,
        code: "SALES",
        name_en: "Sales Team",
        name_ar: "",
        is_active: true,
      },
    ],
  );
}

export async function listUsers(params?: {
  q?: string;
  role?: string;
  branchId?: string;
}): Promise<ApiUser[]> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.role) sp.set("role", params.role);
  if (params?.branchId) sp.set("branch_id", params.branchId);
  const qs = sp.toString() ? `?${sp}` : "";
  return withDemoFallback(
    () => http().request<ApiUser[]>(`/users${qs}`),
    () =>
      DEMO_USERS.filter((u) => {
        if (params?.role && u.role !== params.role) return false;
        if (params?.q && !`${u.email}${u.full_name}`.includes(params.q)) return false;
        return true;
      }),
  );
}

export async function createUser(body: {
  email: string;
  password: string;
  full_name: string;
  role: AppRole;
  branch_id: string;
  team_id?: string;
}): Promise<ApiUser> {
  return withDemoFallback(
    () =>
      http().request<ApiUser>("/users", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    () => ({
      id: crypto.randomUUID(),
      email: body.email,
      full_name: body.full_name,
      role: body.role,
      branch_id: body.branch_id,
      team_id: body.team_id,
      is_active: true,
    }),
  );
}

export async function updateUser(
  id: string,
  body: Partial<{
    full_name: string;
    role: AppRole;
    branch_id: string;
    is_active: boolean;
    mfa_enabled: boolean;
    password: string;
  }>,
): Promise<ApiUser> {
  return withDemoFallback(
    () =>
      http().request<ApiUser>(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    () => {
      const u = DEMO_USERS.find((x) => x.id === id) ?? DEMO_USERS[0];
      return { ...u, ...body, full_name: body.full_name ?? u.full_name };
    },
  );
}

export async function fetchPermissionMatrix(): Promise<{
  roles: AppRole[];
  permissions: Record<string, string[]>;
}> {
  return withDemoFallback(
    () =>
      http().request<{
        roles: AppRole[];
        permissions: Record<string, string[]>;
      }>("/permissions"),
    () => ({
      roles: ["gm", "manager", "employee", "finance", "operations", "admin"],
      permissions: {
        gm: ["users.read", "users.write", "roles.read", "audit.read", "dashboard.read", "leads.read", "leads.write", "bookings.read", "bookings.write", "tasks.read", "tasks.write"],
        admin: ["users.read", "users.write", "roles.read", "audit.read", "ops.read"],
        manager: ["users.read", "roles.read", "audit.read", "dashboard.read", "leads.read", "leads.write", "bookings.read", "bookings.write", "tasks.read", "tasks.write"],
        employee: ["customers.write", "leads.read", "leads.write", "bookings.read", "bookings.write", "tasks.read", "tasks.write"],
        finance: ["payments.read", "payments.write", "bookings.read", "bookings.write", "audit.read", "tasks.read"],
        operations: ["documents.write", "bookings.read", "bookings.write", "packages.write", "tasks.read", "tasks.write"],
      },
    }),
  );
}

export async function listAuditEvents(params?: {
  actorId?: string;
  entityType?: string;
  from?: string;
  to?: string;
}): Promise<AuditEvent[]> {
  const sp = new URLSearchParams();
  if (params?.actorId) sp.set("actor_id", params.actorId);
  if (params?.entityType) sp.set("entity_type", params.entityType);
  if (params?.from) sp.set("from", params.from);
  if (params?.to) sp.set("to", params.to);
  const qs = sp.toString() ? `?${sp}` : "";
  return withDemoFallback(
    () => http().request<AuditEvent[]>(`/audit-events${qs}`),
    () => [
      {
        id: "a1",
        actor_id: DEMO_USERS[0].id,
        action: "auth.login",
        entity_type: "user",
        entity_id: DEMO_USERS[0].id,
        created_at: new Date().toISOString(),
        metadata: {},
      },
      {
        id: "a2",
        actor_id: DEMO_USERS[1].id,
        action: "user.updated",
        entity_type: "user",
        entity_id: DEMO_USERS[2].id,
        created_at: new Date(Date.now() - 3600_000).toISOString(),
        metadata: { before: { role: "employee" }, after: { role: "employee" } },
      },
    ],
  );
}

export async function apiLogout(): Promise<void> {
  try {
    await http().request("/auth/logout", { method: "POST" });
  } catch {
    // offline / demo — ignore
  }
}
