import { setRequestLocale } from "next-intl/server";
import { loadSetupOverview } from "@/entities/setup/server";
import { getServerSession } from "@/shared/api/get-server-session";
import { redirect } from "@/shared/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { ManagerView } from "@/views/manager-view";

type Props = { params: Promise<{ locale: string }> };

export default async function ManagerPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getServerSession();
  if (session?.permissions.includes("setup.manage")) {
    const setup = await loadSetupOverview();
    if (setup?.required) redirect({ href: routes.setup, locale });
  }

  return <ManagerView />;
}
