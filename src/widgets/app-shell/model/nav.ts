import {
  ArrowLeftRight,
  BedDouble,
  Bell,
  Briefcase,
  Building2,
  CalendarCheck2,
  FileBarChart2,
  FileSpreadsheet,
  FileWarning,
  Kanban,
  KeyRound,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Package,
  Plane,
  Plug,
  Rocket,
  ScrollText,
  Settings,
  Shield,
  ShieldHalf,
  Sparkles,
  Target,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ROUTE_PERMISSIONS,
  type GuardedRoute,
  type Permission,
} from "@/shared/config/permissions";
import { routes } from "@/shared/config/routes";

export type NavLabel =
  | "manager"
  | "workspace"
  | "pipeline"
  | "inbox"
  | "tasks"
  | "notifications"
  | "customers"
  | "packages"
  | "bookings"
  | "finance"
  | "fxRates"
  | "targets"
  | "importExport"
  | "reports"
  | "setup"
  | "aiSetup"
  | "suppliers"
  | "rooming"
  | "missingDocs"
  | "integrations"
  | "users"
  | "roles"
  | "audit"
  | "settings"
  | "companies";

export type NavItem = {
  href: GuardedRoute;
  label: NavLabel;
  icon: LucideIcon;
  /** Hide when the viewer also holds this (e.g. managers land on the dashboard). */
  unless?: Permission;
};

export type NavTone = "sky" | "violet" | "emerald" | "amber" | "indigo" | "slate" | "rose";

export type NavGroupId = "sales" | "operations" | "finance" | "tools" | "admin";

export type QuickItem = NavItem & { tone: NavTone };

export type NavGroup = {
  id: NavGroupId;
  icon: LucideIcon;
  tone: NavTone;
  items: readonly NavItem[];
};

/** Daily screens pinned above the groups as one-tap tiles. */
export const QUICK_ITEMS: readonly QuickItem[] = [
  { href: routes.manager, label: "manager", icon: LayoutDashboard, tone: "sky" },
  {
    href: routes.workspace,
    label: "workspace",
    icon: Briefcase,
    tone: "sky",
    unless: "dashboard.read",
  },
  { href: routes.inbox, label: "inbox", icon: MessageSquare, tone: "emerald" },
  { href: routes.tasks, label: "tasks", icon: ListTodo, tone: "amber" },
  { href: routes.notifications, label: "notifications", icon: Bell, tone: "rose" },
];

/** Visibility comes from `ROUTE_PERMISSIONS` — the same map the middleware enforces. */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: "sales",
    icon: TrendingUp,
    tone: "violet",
    items: [
      { href: routes.pipeline, label: "pipeline", icon: Kanban },
      { href: routes.customers, label: "customers", icon: Users },
      { href: routes.targets, label: "targets", icon: Target },
    ],
  },
  {
    id: "operations",
    icon: Plane,
    tone: "emerald",
    items: [
      { href: routes.packages, label: "packages", icon: Package },
      { href: routes.bookings, label: "bookings", icon: CalendarCheck2 },
      { href: routes.rooming, label: "rooming", icon: BedDouble },
      { href: routes.suppliers, label: "suppliers", icon: Truck },
      { href: routes.missingDocs, label: "missingDocs", icon: FileWarning },
    ],
  },
  {
    id: "finance",
    icon: Wallet,
    tone: "amber",
    items: [
      { href: routes.finance, label: "finance", icon: Wallet },
      { href: routes.financeFx, label: "fxRates", icon: ArrowLeftRight },
      { href: routes.reports, label: "reports", icon: FileBarChart2 },
    ],
  },
  {
    id: "tools",
    icon: Wrench,
    tone: "indigo",
    items: [
      { href: routes.integrations, label: "integrations", icon: Plug },
      {
        href: routes.importExport,
        label: "importExport",
        icon: FileSpreadsheet,
      },
      { href: routes.aiSetup, label: "aiSetup", icon: Sparkles },
      { href: routes.setup, label: "setup", icon: Rocket },
    ],
  },
  {
    id: "admin",
    icon: ShieldHalf,
    tone: "slate",
    items: [
      { href: routes.adminCompanies, label: "companies", icon: Building2 },
      { href: routes.adminUsers, label: "users", icon: Shield },
      { href: routes.adminRoles, label: "roles", icon: KeyRound },
      { href: routes.adminAudit, label: "audit", icon: ScrollText },
      { href: routes.adminSettings, label: "settings", icon: Settings },
    ],
  },
];

function canSee(item: NavItem, permissions: readonly string[]): boolean {
  return (
    permissions.includes(ROUTE_PERMISSIONS[item.href]) &&
    !(item.unless && permissions.includes(item.unless))
  );
}

export type VisibleNav = { quick: QuickItem[]; groups: NavGroup[] };

/** Quick tiles and groups trimmed to the viewer's permitted items; empty groups are dropped. */
export function visibleNav(permissions: readonly string[]): VisibleNav {
  return {
    quick: QUICK_ITEMS.filter((item) => canSee(item, permissions)),
    groups: NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => canSee(item, permissions)),
    })).filter((group) => group.items.length > 0),
  };
}

/** Most specific permitted route matching the path, so `/finance/fx` beats `/finance`. */
export function activeNavHref(nav: VisibleNav, pathname: string): GuardedRoute | undefined {
  return [...nav.quick, ...nav.groups.flatMap((group) => group.items)]
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

export function groupOf(
  groups: readonly NavGroup[],
  href: GuardedRoute | undefined,
): NavGroupId | undefined {
  if (!href) return undefined;
  return groups.find((group) => group.items.some((item) => item.href === href))?.id;
}
