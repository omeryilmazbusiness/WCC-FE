import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginForm, SessionEndedNotice } from "@/features/auth-by-credentials";
import { isSessionEndReason, SESSION_END_PARAM } from "@/shared/api/session-end";
import { WCC_LOGO } from "@/shared/config/brand";
import { LoginScreen, LogoIcon } from "@/widgets/login-screen";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: `${t("signIn")} · ${t("platformTitle")}` };
}

export default async function PlatformLoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const reason = (await searchParams)[SESSION_END_PARAM];
  const t = await getTranslations("auth");
  const ta = await getTranslations("app");

  return (
    <LoginScreen
      icon={<LogoIcon src={WCC_LOGO} alt={ta("name")} />}
      title={t("platformTitle")}
      subtitle={t("platformSubtitle")}
    >
      <div className="space-y-5">
        {isSessionEndReason(reason) ? <SessionEndedNotice reason={reason} /> : null}
        <LoginForm platform />
      </div>
    </LoginScreen>
  );
}
