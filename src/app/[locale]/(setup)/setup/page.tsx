import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { loadSetupOverview } from "@/entities/setup/server";
import { loadUiPreferences } from "@/entities/ui-preference/server";
import { SETUP_INTRO_COOKIE, shouldShowWelcome } from "@/features/gm-setup";
import { getServerSession } from "@/shared/api/get-server-session";
import { SetupView } from "@/views/setup-view";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export default async function SetupPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [initial, session, preferences, jar] = await Promise.all([
    loadSetupOverview(),
    getServerSession(),
    loadUiPreferences(),
    cookies(),
  ]);
  const showIntro = session
    ? shouldShowWelcome(preferences?.welcomeSeenAt, jar.get(SETUP_INTRO_COOKIE)?.value, session.user.id)
    : false;
  return <SetupView initial={initial} showIntro={showIntro} />;
}
