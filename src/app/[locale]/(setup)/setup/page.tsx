import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { loadSetupOverview } from "@/entities/setup/server";
import { SETUP_INTRO_COOKIE, shouldShowIntro } from "@/features/gm-setup";
import { getServerSession } from "@/shared/api/get-server-session";
import { SetupView } from "@/views/setup-view";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export default async function SetupPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [initial, session, jar] = await Promise.all([loadSetupOverview(), getServerSession(), cookies()]);
  const showIntro = session ? shouldShowIntro(jar.get(SETUP_INTRO_COOKIE)?.value, session.user.id) : false;
  return <SetupView initial={initial} showIntro={showIntro} />;
}
