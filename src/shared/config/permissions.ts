import { routes, type AppRole } from "./routes";

/** Mirrors `internal/platform/auth/rbac.go` — the backend stays the source of truth. */
export const PERMISSIONS = [
  "users.read",
  "users.write",
  "users.unlock",
  "roles.read",
  "audit.read",
  "branches.read",
  "customers.read",
  "customers.write",
  "pii.read",
  "privacy.manage",
  "leads.read",
  "leads.write",
  "leads.delete",
  "bookings.read",
  "bookings.write",
  "bookings.override",
  "bookings.discount",
  "payments.read",
  "payments.write",
  "payments.approve",
  "fx.manage",
  "documents.read",
  "documents.write",
  "documents.review",
  "visa.read",
  "visa.write",
  "suppliers.read",
  "suppliers.write",
  "suppliers.finance",
  "flights.search",
  "ops.read",
  "dashboard.read",
  "packages.read",
  "packages.write",
  "hotels.read",
  "hotels.write",
  "tasks.read",
  "tasks.write",
  "inbox.read",
  "inbox.write",
  "integrations.read",
  "integrations.write",
  "targets.read",
  "targets.write",
  "imports.read",
  "imports.write",
  "notifications.read",
  "notifications.write",
  "notifications.manage",
  "reports.read",
  "reports.export",
  "ai.read",
  "ai.write",
  "ai.setup",
  "settings.read",
  "settings.write",
  "setup.manage",
  "branches.manage",
  "companies.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type AccessScope = "own" | "team" | "branch" | "company" | "global";

const PERMISSION_SET = new Set<string>(PERMISSIONS);

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && PERMISSION_SET.has(value);
}

/**
 * Route → permission guarding the backend API that screen depends on.
 * Single source for sidebar visibility and the middleware route guard.
 */
export const ROUTE_PERMISSIONS = {
  [routes.manager]: "dashboard.read",
  [routes.workspace]: "tasks.read",
  [routes.pipeline]: "leads.read",
  [routes.inbox]: "inbox.read",
  [routes.tasks]: "tasks.read",
  [routes.notifications]: "notifications.read",
  [routes.customers]: "customers.read",
  [routes.packages]: "packages.read",
  [routes.bookings]: "bookings.read",
  [routes.finance]: "payments.read",
  [routes.financeFx]: "payments.read",
  [routes.targets]: "targets.read",
  [routes.importExport]: "imports.read",
  [routes.reports]: "reports.read",
  [routes.setup]: "setup.manage",
  [routes.aiSetup]: "ai.setup",
  [routes.suppliers]: "suppliers.read",
  [routes.hotels]: "hotels.read",
  [routes.flights]: "flights.search",
  [routes.missingDocs]: "documents.read",
  [routes.team]: "users.read",
  [routes.adminRoles]: "roles.read",
  [routes.adminAudit]: "audit.read",
  [routes.adminSettings]: "settings.read",
  [routes.adminCompanies]: "companies.manage",
} as const satisfies Record<string, Permission>;

export type GuardedRoute = keyof typeof ROUTE_PERMISSIONS;

const GUARDED_BY_LENGTH = (Object.keys(ROUTE_PERMISSIONS) as GuardedRoute[]).sort(
  (a, b) => b.length - a.length,
);

/** Longest-prefix match so `/customers/123` inherits `/customers`. */
export function requiredPermissionFor(pathWithoutLocale: string): Permission | null {
  for (const route of GUARDED_BY_LENGTH) {
    if (pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`)) {
      return ROUTE_PERMISSIONS[route];
    }
  }
  return null;
}

export function hasPermission(
  granted: readonly string[],
  required: Permission | readonly Permission[],
): boolean {
  const list: readonly Permission[] = typeof required === "string" ? [required] : required;
  return list.every((p) => granted.includes(p));
}

export function canAccessPath(granted: readonly string[], pathWithoutLocale: string): boolean {
  const required = requiredPermissionFor(pathWithoutLocale);
  return required === null || granted.includes(required);
}

const ROLE_HOME: Record<AppRole, GuardedRoute> = {
  gm: routes.manager,
  manager: routes.manager,
  employee: routes.workspace,
  operations: routes.workspace,
  finance: routes.finance,
  admin: routes.adminCompanies,
};

/** Role's preferred landing page if permitted, else the first permitted screen. */
export function homeFor(role: AppRole, granted: readonly string[]): string {
  const preferred = ROLE_HOME[role];
  if (preferred && granted.includes(ROUTE_PERMISSIONS[preferred])) return preferred;
  const first = (Object.keys(ROUTE_PERMISSIONS) as GuardedRoute[]).find((route) =>
    granted.includes(ROUTE_PERMISSIONS[route]),
  );
  return first ?? routes.security;
}

/**
 * Demo-mode copy of the backend RBAC matrix, used only when NEXT_PUBLIC_DEMO_MODE=true
 * and the backend is unreachable. Never consulted for a real session.
 */
export const DEMO_ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  gm: PERMISSIONS.filter((p) => p !== "companies.manage"),
  // Platform operator: belongs to no company and holds no company-data permission.
  admin: ["companies.manage", "users.read", "users.write", "users.unlock", "audit.read", "ops.read"],
  manager: PERMISSIONS.filter(
    (p) =>
      p !== "users.write" &&
      p !== "users.unlock" &&
      p !== "ops.read" &&
      p !== "privacy.manage" &&
      p !== "fx.manage" &&
      p !== "setup.manage" &&
      p !== "branches.manage" &&
      p !== "companies.manage",
  ),
  employee: [
    "branches.read", "customers.read", "customers.write", "leads.read", "leads.write",
    "bookings.read", "bookings.write", "documents.read", "documents.write", "visa.read",
    "visa.write", "suppliers.read", "flights.search", "tasks.read", "tasks.write", "packages.read",
    "hotels.read",
    "inbox.read", "inbox.write", "targets.read", "imports.read",
    "notifications.read", "notifications.write", "reports.read", "ai.read", "ai.write",
  ],
  finance: [
    "branches.read", "customers.read", "payments.read", "payments.write", "payments.approve",
    "fx.manage", "bookings.read", "bookings.write", "audit.read", "documents.read", "suppliers.read",
    "suppliers.finance", "hotels.read",
    "tasks.read", "targets.read", "imports.read", "imports.write",
    "notifications.read", "notifications.write", "reports.read", "reports.export",
    "ai.read", "settings.read",
  ],
  operations: [
    "branches.read", "customers.read", "customers.write", "pii.read",
    "documents.read", "documents.write", "documents.review", "visa.read", "visa.write",
    "suppliers.read", "suppliers.write", "flights.search", "bookings.read", "bookings.write",
    "packages.read", "packages.write", "hotels.read", "hotels.write", "tasks.read", "tasks.write",
    "inbox.read", "inbox.write", "integrations.read", "imports.read", "imports.write",
    "notifications.read", "notifications.write", "reports.read", "reports.export",
    "ai.read", "ai.write", "settings.read",
  ],
};

export const DEMO_ROLE_SCOPE: Record<AppRole, AccessScope> = {
  gm: "company",
  admin: "global",
  manager: "branch",
  finance: "branch",
  operations: "branch",
  employee: "own",
};
