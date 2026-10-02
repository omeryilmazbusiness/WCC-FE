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
  LayoutGrid,
  ListTodo,
  MessageSquare,
  Package,
  Plane,
  PlaneTakeoff,
  Plug,
  Rocket,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
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
import { MAX_NAV_FAVORITES } from "@/entities/ui-preference";
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
  | "flights"
  | "missingDocs"
  | "integrations"
  | "users"
  | "roles"
  | "audit"
  | "settings"
  | "companies";

export type NavTone = "sky" | "violet" | "emerald" | "amber" | "indigo" | "slate";

export type NavItem = {
  href: GuardedRoute;
  label: NavLabel;
  icon: LucideIcon;
  /** Hide when the viewer also holds this (e.g. managers land on the dashboard). */
  unless?: Permission;
};

export type NavGroupId = "overview" | "sales" | "operations" | "finance" | "tools" | "admin";

export type NavGroup = {
  id: NavGroupId;
  icon: LucideIcon;
  tone: NavTone;
  items: readonly NavItem[];
};

/** A pinned shortcut, coloured like the group it belongs to. */
export type FavoriteItem = NavItem & { tone: NavTone };

/** Visibility comes from `ROUTE_PERMISSIONS` — the same map the middleware enforces. */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: "overview",
    icon: LayoutGrid,
    tone: "sky",
    items: [
      { href: routes.manager, label: "manager", icon: LayoutDashboard },
      { href: routes.workspace, label: "workspace", icon: Briefcase, unless: "dashboard.read" },
      { href: routes.tasks, label: "tasks", icon: ListTodo },
      { href: routes.notifications, label: "notifications", icon: Bell },
    ],
  },
  {
    id: "sales",
    icon: TrendingUp,
    tone: "violet",
    items: [
      { href: routes.pipeline, label: "pipeline", icon: Kanban },
      { href: routes.inbox, label: "inbox", icon: MessageSquare },
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
      { href: routes.flights, label: "flights", icon: PlaneTakeoff },
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
      { href: routes.importExport, label: "importExport", icon: FileSpreadsheet },
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

/** Shortcuts shown until the user customises favorites; unpermitted ones drop out. */
export const DEFAULT_FAVORITES: readonly GuardedRoute[] = [
  routes.manager,
  routes.workspace,
  routes.inbox,
  routes.tasks,
  routes.notifications,
];

function canSee(item: NavItem, permissions: readonly string[]): boolean {
  return (
    permissions.includes(ROUTE_PERMISSIONS[item.href]) &&
    !(item.unless && permissions.includes(item.unless))
  );
}

/** Groups trimmed to the viewer's permitted items; empty groups are dropped. */
export function visibleNavGroups(permissions: readonly string[]): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSee(item, permissions)),
  })).filter((group) => group.items.length > 0);
}

/**
 * Pinned shortcuts the viewer can open, in the saved order. Unknown or
 * no-longer-permitted routes are skipped rather than shown broken.
 */
export function resolveFavorites(
  groups: readonly NavGroup[],
  saved: readonly string[] | null,
): FavoriteItem[] {
  const byHref = new Map<string, FavoriteItem>();
  for (const group of groups) {
    for (const item of group.items) byHref.set(item.href, { ...item, tone: group.tone });
  }
  const out: FavoriteItem[] = [];
  for (const href of saved ?? DEFAULT_FAVORITES) {
    const item = byHref.get(href);
    if (item && !out.some((f) => f.href === href)) out.push(item);
    if (out.length === MAX_NAV_FAVORITES) break;
  }
  return out;
}

/** Most specific permitted route matching the path, so `/finance/fx` beats `/finance`. */
export function activeNavHref(
  groups: readonly NavGroup[],
  pathname: string,
): GuardedRoute | undefined {
  return groups
    .flatMap((group) => group.items.map((item) => item.href))
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

/** Screen a path belongs to: the nav route it lives under, else its first segment. */
export function screenRoot(groups: readonly NavGroup[], path: string): string {
  const clean = path.split(/[?#]/)[0] || "/";
  return activeNavHref(groups, clean) ?? `/${clean.split("/").filter(Boolean)[0] ?? ""}`;
}

export type ScreenMeta = {
  /** Translation key under `nav`, or null for screens outside the menu. */
  label: NavLabel | "security" | null;
  icon: LucideIcon;
  tone: NavTone;
};

export function screenMeta(groups: readonly NavGroup[], root: string): ScreenMeta {
  for (const group of groups) {
    const item = group.items.find((i) => i.href === root);
    if (item) return { label: item.label, icon: item.icon, tone: group.tone };
  }
  if (root === routes.security) return { label: "security", icon: ShieldCheck, tone: "slate" };
  return { label: null, icon: LayoutGrid, tone: "slate" };
}

export function groupOf(
  groups: readonly NavGroup[],
  href: GuardedRoute | undefined,
): NavGroupId | undefined {
  if (!href) return undefined;
  return groups.find((group) => group.items.some((item) => item.href === href))?.id;
}

/** Moves `from` to `to` where `to` is an insertion index in the original list. */
export function reorder<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(from < to ? to - 1 : to, 0, moved);
  return next;
}
