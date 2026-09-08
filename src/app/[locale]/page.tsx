import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/shared/i18n/navigation";
import { getServerSession } from "@/shared/api/get-server-session";
import { homeForRole, routes } from "@/shared/config/routes";

type Props = { params: Promise<{ locale: string }> };

export default async function LocaleIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getServerSession();
  if (!session) {
    redirect({ href: routes.login, locale });
    return null;
  }
  redirect({ href: homeForRole(session.user.role), locale });
}
