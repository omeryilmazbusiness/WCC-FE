/**
 * Route map — single source for navigation & role redirects (OCP-friendly).
 */
export const routes = {
  login: "/login",
  manager: "/manager",
  workspace: "/workspace",
  customers: "/customers",
  customer: (id: string) => `/customers/${id}`,
  pipeline: "/pipeline",
  packages: "/packages",
  package: (id: string) => `/packages/${id}`,
  bookings: "/bookings",
  booking: (id: string) => `/bookings/${id}`,
  tasks: "/tasks",
  inbox: "/inbox",
  adminUsers: "/admin/users",
  adminRoles: "/admin/roles",
  adminAudit: "/admin/audit",
} as const;

export type AppRole =
  | "gm"
  | "manager"
  | "employee"
  | "finance"
  | "operations"
  | "admin";

export function homeForRole(role: AppRole): string {
  if (role === "employee" || role === "operations") return routes.workspace;
  if (role === "admin") return routes.adminUsers;
  return routes.manager;
}

export function canAccessAdmin(role: AppRole): boolean {
  return role === "gm" || role === "admin";
}
