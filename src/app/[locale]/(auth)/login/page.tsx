import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { LoginForm, SessionEndedNotice } from "@/features/auth-by-credentials";
import { isSessionEndReason, SESSION_END_PARAM } from "@/shared/api/session-end";
import { LoginScreen, MonogramIcon } from "@/widgets/login-screen";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const reason = (await searchParams)[SESSION_END_PARAM];
  const t = await getTranslations("auth");
  const ta = await getTranslations("app");

  return (
    <LoginScreen
      icon={<MonogramIcon label={ta("shortName")} />}
      title={t("genericTitle")}
      subtitle={t("subtitle")}
    >
      <div className="space-y-5">
        {isSessionEndReason(reason) ? <SessionEndedNotice reason={reason} /> : null}
        <LoginForm />
      </div>
    </LoginScreen>
  );
}
