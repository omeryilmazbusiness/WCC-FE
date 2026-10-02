"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Building2, ShieldCheck } from "lucide-react";
import type { ViewerSession } from "@/shared/api/session";
import { loginHref, sessionEndReason } from "@/shared/api/session-end";
import { routes } from "@/shared/config/routes";
import { Link, usePathname, WorkspaceRefProvider } from "@/shared/i18n/navigation";
import type { WorkspaceRef } from "@/shared/lib/workspace-path";
import { cn } from "@/shared/lib/cn";
import { ToastProvider } from "@/shared/ui";
import { ViewerProvider, useViewer } from "@/entities/viewer";
import { SessionExpiryWatcher } from "@/features/auth-by-credentials";
import { activeNavHref, visibleNav } from "../model/nav";
import { AppHeader } from "./app-header";
import { SidebarNav } from "./sidebar-nav";

type Props = {
  viewer: ViewerSession;
  /** Workspace of the request, so SSR markup matches the client (see `WorkspaceRefProvider`). */
  workspace?: WorkspaceRef | null;
  children: React.ReactNode;
};

/** Session, permission and toast context shared by every signed-in surface. */
export function ShellProviders({ viewer, workspace = null, children }: Props) {
  const locale = useLocale();
  const onSessionExpired = useCallback(
    (err: unknown) =>
      window.location.assign(loginHref(locale, sessionEndReason(err))),
    [locale],
  );

  return (
    <WorkspaceRefProvider value={workspace}>
      <ViewerProvider
        initialViewer={viewer}
        onSessionExpired={onSessionExpired}
      >
        <ToastProvider>
          <SessionExpiryWatcher />
          {children}
        </ToastProvider>
      </ViewerProvider>
    </WorkspaceRefProvider>
  );
}

export function AppShell({ viewer, workspace, children }: Props) {
  return (
    <ShellProviders viewer={viewer} workspace={workspace}>
      <ShellFrame>{children}</ShellFrame>
    </ShellProviders>
  );
}

function ShellFrame({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const ta = useTranslations("app");
  const pathname = usePathname();
  const { user, permissions } = useViewer();
  const nav = visibleNav(permissions);
  const activeHref = activeNavHref(nav, pathname);
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

        <SidebarNav nav={nav} activeHref={activeHref} />

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
