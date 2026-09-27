import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { LoginForm, SessionEndedNotice } from "@/features/auth-by-credentials";
import { LocaleSwitcher } from "@/features/switch-locale";
import { isSessionEndReason, SESSION_END_PARAM } from "@/shared/api/session-end";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";

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
    <div className="auth-backdrop flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute end-6 top-6">
        <LocaleSwitcher />
      </div>
      <Card className="w-full max-w-md hover:shadow-[0_16px_40px_-22px_rgba(15,23,42,0.32)]">
        <CardHeader className="space-y-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-[0_10px_24px_-14px_rgba(10,10,10,0.55)]">
            <span className="text-sm font-bold tracking-tight">{ta("shortName")}</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-zinc-950">
            {t("title")}
          </CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isSessionEndReason(reason) ? <SessionEndedNotice reason={reason} /> : null}
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
