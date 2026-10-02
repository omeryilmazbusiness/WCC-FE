import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/shared/i18n/navigation";
import { getServerSession, getServerWorkspace } from "@/shared/api/get-server-session";
import { routes } from "@/shared/config/routes";
import { loadUiPreferences } from "@/entities/ui-preference/server";
import { AppShell, SIDEBAR_COOKIE, isSidebarCollapsed } from "@/widgets/app-shell";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function ShellLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getServerSession();
  if (!session) {
    redirect({ href: routes.login, locale });
    return null;
  }

  const [workspace, preferences, jar] = await Promise.all([
    getServerWorkspace(),
    loadUiPreferences(),
    cookies(),
  ]);
  return (
    <AppShell
      viewer={session}
      workspace={workspace}
      navFavorites={preferences?.navFavorites ?? null}
      sidebarCollapsed={isSidebarCollapsed(jar.get(SIDEBAR_COOKIE)?.value)}
    >
      {children}
    </AppShell>
  );
}
