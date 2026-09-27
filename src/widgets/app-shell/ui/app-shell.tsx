"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bell,
  Building2,
  LayoutDashboard,
  Users,
  Briefcase,
  Kanban,
  Package,
  CalendarCheck2,
  ListTodo,
  MessageSquare,
  Wallet,
  Target,
  FileSpreadsheet,
  FileBarChart2,
  Sparkles,
  FileWarning,
  Truck,
  Plug,
  Shield,
  KeyRound,
  ScrollText,
  Settings,
  BedDouble,
  ShieldCheck,
  ArrowLeftRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ViewerSession } from "@/shared/api/session";
import { loginHref, sessionEndReason } from "@/shared/api/session-end";
import {
  ROUTE_PERMISSIONS,
  type GuardedRoute,
  type Permission,
} from "@/shared/config/permissions";
import { routes } from "@/shared/config/routes";
import { Link, usePathname } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { ToastProvider } from "@/shared/ui";
import { ViewerProvider, useViewer } from "@/entities/viewer";
import { SessionExpiryWatcher } from "@/features/auth-by-credentials";
import { AppHeader } from "./app-header";

type Props = {
  viewer: ViewerSession;
  children: React.ReactNode;
};

type NavLabel =
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
  | "aiSetup"
  | "suppliers"
  | "rooming"
  | "missingDocs"
  | "integrations"
  | "users"
  | "roles"
  | "audit"
  | "settings";

type NavItem = {
  href: GuardedRoute;
  label: NavLabel;
  icon: LucideIcon;
  /** Hide when the viewer also holds this (e.g. managers land on the dashboard). */
  unless?: Permission;
};

/** Visibility comes from `ROUTE_PERMISSIONS` — the same map the middleware enforces. */
const NAV_ITEMS: readonly NavItem[] = [
  { href: routes.manager, label: "manager", icon: LayoutDashboard },
  { href: routes.workspace, label: "workspace", icon: Briefcase, unless: "dashboard.read" },
  { href: routes.pipeline, label: "pipeline", icon: Kanban },
  { href: routes.inbox, label: "inbox", icon: MessageSquare },
  { href: routes.tasks, label: "tasks", icon: ListTodo },
  { href: routes.notifications, label: "notifications", icon: Bell },
  { href: routes.customers, label: "customers", icon: Users },
  { href: routes.packages, label: "packages", icon: Package },
  { href: routes.bookings, label: "bookings", icon: CalendarCheck2 },
  { href: routes.finance, label: "finance", icon: Wallet },
  { href: routes.financeFx, label: "fxRates", icon: ArrowLeftRight },
  { href: routes.targets, label: "targets", icon: Target },
  { href: routes.importExport, label: "importExport", icon: FileSpreadsheet },
  { href: routes.reports, label: "reports", icon: FileBarChart2 },
  { href: routes.aiSetup, label: "aiSetup", icon: Sparkles },
  { href: routes.suppliers, label: "suppliers", icon: Truck },
  { href: routes.rooming, label: "rooming", icon: BedDouble },
  { href: routes.missingDocs, label: "missingDocs", icon: FileWarning },
  { href: routes.integrations, label: "integrations", icon: Plug },
  { href: routes.adminUsers, label: "users", icon: Shield },
  { href: routes.adminRoles, label: "roles", icon: KeyRound },
  { href: routes.adminAudit, label: "audit", icon: ScrollText },
  { href: routes.adminSettings, label: "settings", icon: Settings },
];

function visibleNav(permissions: readonly string[]): NavItem[] {
  return NAV_ITEMS.filter(
    (item) =>
      permissions.includes(ROUTE_PERMISSIONS[item.href]) &&
      !(item.unless && permissions.includes(item.unless)),
  );
}

export function AppShell({ viewer, children }: Props) {
  const locale = useLocale();
  const onSessionExpired = useCallback(
    (err: unknown) => window.location.assign(loginHref(locale, sessionEndReason(err))),
    [locale],
  );

  return (
    <ViewerProvider initialViewer={viewer} onSessionExpired={onSessionExpired}>
      <ToastProvider>
        <SessionExpiryWatcher />
        <ShellFrame>{children}</ShellFrame>
      </ToastProvider>
    </ViewerProvider>
  );
}

function ShellFrame({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const ta = useTranslations("app");
  const pathname = usePathname();
  const { user, permissions } = useViewer();
  const items = visibleNav(permissions);
  const activeHref = items
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
  const securityActive = pathname === routes.security;

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]" data-testid="app-shell">
      <aside className="sticky top-0 flex h-screen w-[var(--shell-width)] shrink-0 flex-col bg-zinc-950 text-white">
        <div className="flex h-12 items-center gap-2.5 border-b border-white/10 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-zinc-950 shadow-sm">
            <Building2 className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold tracking-tight">
              {ta("shortName")}
            </p>
            <p className="truncate text-[10px] font-medium text-zinc-500">
              {ta("name")}
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2.5 py-3">
          {items.map((item) => {
            const active = item.href === activeHref;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-300",
                  active
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:bg-white/8 hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                    active
                      ? "bg-zinc-950 text-white"
                      : "bg-white/10 text-white group-hover:bg-white/15",
                  )}
                >
                  <Icon className="h-[17px] w-[17px]" strokeWidth={1.75} />
                </span>
                {t(item.label)}
              </Link>
            );
          })}
        </nav>

        <Link
          href={routes.security}
          aria-current={securityActive ? "page" : undefined}
          data-testid="shell-security-link"
          className={cn(
            "flex items-center gap-3 border-t border-white/10 px-4 py-3 transition-colors",
            securityActive ? "bg-white/10" : "hover:bg-white/5",
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-zinc-300">
              {user.fullName}
            </p>
            <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              {user.role}
            </p>
          </div>
          <ShieldCheck
            className="h-4 w-4 shrink-0 text-zinc-500"
            strokeWidth={1.75}
            aria-label={t("security")}
          />
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-6 sm:px-8 sm:py-7 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
