"use client";

import { useCallback, useMemo } from "react";
import { useTranslations, type AbstractIntlMessages } from "next-intl";
import type { ViewerSession } from "@/shared/api/session";
import { loginHref, sessionEndReason } from "@/shared/api/session-end";
import { routes } from "@/shared/config/routes";
import { IntlClientProvider } from "@/shared/i18n/intl-client-provider";
import { usePathname, useWorkspaceRef, WorkspaceRefProvider } from "@/shared/i18n/navigation";
import { routing } from "@/shared/i18n/routing";
import { cn } from "@/shared/lib/cn";
import type { WorkspaceRef } from "@/shared/lib/workspace-path";
import { ToastProvider } from "@/shared/ui";
import { ViewerProvider, useCan, useViewer } from "@/entities/viewer";
import { UpgradePlanProvider } from "@/features/request-plan-upgrade";
import { ROLE_PERMISSIONS } from "@/shared/config/permissions";
import { AssistantBubble, AssistantPanel, AssistantProvider, useAssistantTransport } from "@/features/ai-assistant";
import { SessionExpiryWatcher } from "@/features/auth-by-credentials";
import { IdleLogoutWatcher } from "@/features/idle-logout";
import { createUiPreferenceRepository } from "@/entities/ui-preference";
import { activeNavHref, navGroupsFor, visibleNavGroups } from "../model/nav";
import { ScreenOpenerProvider } from "../model/screen-opener";
import { useNavFavorites } from "../model/use-nav-favorites";
import { useSidebarCollapse } from "../model/use-sidebar-collapse";
import { useWorkspaceTabs } from "../model/use-workspace-tabs";
import { AppHeader } from "./app-header";
import { ShellSidebar } from "./shell-sidebar";
import { WorkspaceTabBar } from "./workspace-tab-bar";

type Props = {
  viewer: ViewerSession;
  /** Workspace of the request, so SSR markup matches the client (see `WorkspaceRefProvider`). */
  workspace?: WorkspaceRef | null;
  /** From the server locale segment — never read via `useLocale` here. */
  locale: string;
  /** Same catalog the locale layout loaded, so the shell keeps intl if a 404 remounts it. */
  messages: AbstractIntlMessages;
  children: React.ReactNode;
};

type AppShellProps = Props & {
  /** Saved sidebar shortcuts, loaded on the server; `null` uses the role default. */
  navFavorites?: string[] | null;
  /** From the sidebar cookie so the first paint has the right width. */
  sidebarCollapsed?: boolean;
};

/** Session, permission and toast context shared by every signed-in surface. */
export function ShellProviders({
  viewer,
  workspace = null,
  locale,
  messages,
  children,
}: Props) {
  const lang = routing.locales.includes(locale as (typeof routing.locales)[number])
    ? locale
    : routing.defaultLocale;
  const onSessionExpired = useCallback(
    (err: unknown) =>
      window.location.assign(loginHref(lang, sessionEndReason(err))),
    [lang],
  );

  return (
    <IntlClientProvider locale={lang} messages={messages}>
      <WorkspaceRefProvider value={workspace}>
        <ViewerProvider
          initialViewer={viewer}
          onSessionExpired={onSessionExpired}
        >
          <ToastProvider>
            <SessionExpiryWatcher />
            <IdleLogoutWatcher />
            {children}
          </ToastProvider>
        </ViewerProvider>
      </WorkspaceRefProvider>
    </IntlClientProvider>
  );
}

export function AppShell({
  viewer,
  workspace,
  locale,
  messages,
  navFavorites = null,
  sidebarCollapsed = false,
  children,
}: AppShellProps) {
  return (
    <ShellProviders viewer={viewer} workspace={workspace} locale={locale} messages={messages}>
      <ShellFrame navFavorites={navFavorites} sidebarCollapsed={sidebarCollapsed}>
        {children}
      </ShellFrame>
    </ShellProviders>
  );
}

const MAIN_ID = "shell-main";

function ShellFrame({
  navFavorites,
  sidebarCollapsed,
  children,
}: {
  navFavorites: string[] | null;
  sidebarCollapsed: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, permissions, workspace } = useViewer();
  const groups = useMemo(
    () => navGroupsFor(permissions, ROLE_PERMISSIONS[user.role] ?? permissions),
    [permissions, user.role],
  );
  const activeHref = activeNavHref(groups, pathname);
  const preferences = useMemo(() => createUiPreferenceRepository(), []);
  const favorites = useNavFavorites({ groups, initial: navFavorites, repository: preferences });
  const tabs = useWorkspaceTabs({ groups, permissions, storageKey: `wcc.tabs.v1:${user.id}` });
  const { collapsed, toggle } = useSidebarCollapse(sidebarCollapsed);
  const canAssist = useCan("ai.read");

  return (
    <AssistantProvider enabled={canAssist}>
    <UpgradePlanProvider>
    <ScreenOpenerProvider value={tabs.openFromLink}>
      <div className="flex min-h-screen bg-[#F9FAFB]" data-testid="app-shell">
        <ShellSidebar
          collapsed={collapsed}
          onToggle={toggle}
          groups={groups}
          favorites={favorites}
          activeHref={activeHref}
          securityActive={pathname === routes.security}
          user={user}
          plan={workspace?.company.plan}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <WorkspaceTabBar groups={groups} tabs={tabs} panelId={MAIN_ID} />
          <main
            id={MAIN_ID}
            className={cn(
              "mx-auto w-full max-w-[1400px] flex-1 px-5 py-6 sm:px-8 sm:py-7 lg:px-10",
              // Room for the pinned assistant bubble at the end of every page.
              canAssist && "pb-24 sm:pb-28",
            )}
          >
            {children}
          </main>
        </div>
      </div>
      <ShellAssistant groups={groups} activeHref={activeHref} />
    </ScreenOpenerProvider>
    </UpgradePlanProvider>
    </AssistantProvider>
  );
}

/** The shell-wide assistant: a pinned bubble and one panel, answering from Help & FAQ first, then the backend. */
function ShellAssistant({ groups, activeHref }: { groups: ReturnType<typeof visibleNavGroups>; activeHref: ReturnType<typeof activeNavHref> }) {
  const tNav = useTranslations("nav");
  const workspace = useWorkspaceRef();
  const transport = useAssistantTransport();
  const active = groups.flatMap((g) => g.items).find((item) => item.href === activeHref);

  return (
    <>
      <AssistantBubble />
      <AssistantPanel
        transport={transport}
        screen={active?.label}
        screenLabel={active ? tNav(active.label) : undefined}
        branchId={workspace?.branch}
      />
    </>
  );
}
