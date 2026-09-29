import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/shared/i18n/navigation";
import { getServerSession, getServerWorkspace } from "@/shared/api/get-server-session";
import { homeFor } from "@/shared/config/permissions";
import { routes } from "@/shared/config/routes";
import { ShellProviders } from "@/widgets/app-shell";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/** Full-screen onboarding: signed-in context without the app navigation. */
export default async function SetupLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getServerSession();
  if (!session) {
    redirect({ href: routes.login, locale });
    return null;
  }
  if (!session.permissions.includes("setup.manage")) {
    redirect({ href: homeFor(session.user.role, session.permissions), locale });
    return null;
  }

  return (
    <ShellProviders viewer={session} workspace={await getServerWorkspace()}>
      {children}
    </ShellProviders>
  );
}
