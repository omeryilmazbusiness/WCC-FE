import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/shared/i18n/navigation";
import { getServerSession } from "@/shared/api/get-server-session";
import { routes } from "@/shared/config/routes";
import { AppShell } from "@/widgets/app-shell";

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

  return <AppShell user={session.user}>{children}</AppShell>;
}
