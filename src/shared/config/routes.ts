/**
 * Route map — single source for navigation & role redirects (OCP-friendly).
 */
export const routes = {
  login: "/login",
  manager: "/manager",
  workspace: "/workspace",
  customers: "/customers",
  customer: (id: string) => `/customers/${id}`,
} as const;

export type AppRole = "gm" | "manager" | "employee";

export function homeForRole(role: AppRole): string {
  if (role === "employee") return routes.workspace;
  return routes.manager;
}
