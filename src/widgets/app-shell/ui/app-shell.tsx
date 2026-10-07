"use client";

import { useCallback, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ViewerSession } from "@/shared/api/session";
import { loginHref, sessionEndReason } from "@/shared/api/session-end";
import { routes } from "@/shared/config/routes";
import { usePathname, useWorkspaceRef, WorkspaceRefProvider } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import type { WorkspaceRef } from "@/shared/lib/workspace-path";
import { ToastProvider } from "@/shared/ui";
import { createPreviewTransport } from "@/entities/assistant";
import { ViewerProvider, useCan, useViewer } from "@/entities/viewer";
import { AssistantBubble, AssistantPanel, AssistantProvider } from "@/features/ai-assistant";
import { SessionExpiryWatcher } from "@/features/auth-by-credentials";
import { createUiPreferenceRepository } from "@/entities/ui-preference";
import { activeNavHref, visibleNavGroups } from "../model/nav";
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
  children: React.ReactNode;
};

type AppShellProps = Props & {
  /** Saved sidebar shortcuts, loaded on the server; `null` uses the role default. */
  navFavorites?: string[] | null;
  /** From the sidebar cookie so the first paint has the right width. */
  sidebarCollapsed?: boolean;
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

export function AppShell({
  viewer,
  workspace,
  navFavorites = null,
  sidebarCollapsed = false,
  children,
}: AppShellProps) {
  return (
    <ShellProviders viewer={viewer} workspace={workspace}>
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
  const { user, permissions } = useViewer();
  const groups = useMemo(() => visibleNavGroups(permissions), [permissions]);
  const activeHref = activeNavHref(groups, pathname);
  const preferences = useMemo(() => createUiPreferenceRepository(), []);
  const favorites = useNavFavorites({ groups, initial: navFavorites, repository: preferences });
  const tabs = useWorkspaceTabs({ groups, permissions, storageKey: `wcc.tabs.v1:${user.id}` });
  const { collapsed, toggle } = useSidebarCollapse(sidebarCollapsed);
  const canAssist = useCan("ai.read");

  return (
    <AssistantProvider enabled={canAssist}>
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
    </AssistantProvider>
  );
}

/** The shell-wide assistant: a pinned bubble and one panel; the backend later swaps in a live transport. */
function ShellAssistant({ groups, activeHref }: { groups: ReturnType<typeof visibleNavGroups>; activeHref: ReturnType<typeof activeNavHref> }) {
  const tNav = useTranslations("nav");
  const workspace = useWorkspaceRef();
  const transport = useMemo(() => createPreviewTransport(), []);
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
