/**
 * Route map — single source for navigation & role redirects (OCP-friendly).
 * Route → permission guards live in `./permissions`.
 */
export const routes = {
  login: "/login",
  platformLogin: "/platform/login",
  security: "/security",
  manager: "/manager",
  workspace: "/workspace",
  customers: "/customers",
  customer: (id: string) => `/customers/${id}`,
  pipeline: "/pipeline",
  packages: "/packages",
  package: (id: string) => `/packages/${id}`,
  bookings: "/bookings",
  booking: (id: string) => `/bookings/${id}`,
  finance: "/finance",
  financeFx: "/finance/fx",
  targets: "/targets",
  importExport: "/import-export",
  reports: "/reports",
  setup: "/setup",
  aiSetup: "/setup/ai",
  suppliers: "/suppliers",
  supplier: (id: string) => `/suppliers/${id}`,
  missingDocs: "/missing-docs",
  tasks: "/tasks",
  inbox: "/inbox",
  notifications: "/notifications",
  team: "/team",
  adminRoles: "/admin/roles",
  adminAudit: "/admin/audit",
  adminSettings: "/admin/settings",
  adminCompanies: "/admin/companies",
  hotels: "/hotels",
  hotel: (id: string) => `/hotels/${id}`,
  flights: "/flights",
  /** Public balance confirmation link of a reconciliation letter. */
  confirm: (token: string) => `/confirm/${token}`,
} as const;

export type AppRole =
  | "gm"
  | "manager"
  | "employee"
  | "finance"
  | "operations"
  | "admin";

export const APP_ROLES: readonly AppRole[] = [
  "gm",
  "manager",
  "employee",
  "finance",
  "operations",
  "admin",
];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}
