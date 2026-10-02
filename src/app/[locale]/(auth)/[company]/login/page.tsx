import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Building2, CloudOff } from "lucide-react";
import { companyDisplayName, companyLogoUrl } from "@/entities/company-branding";
import { loadCompanyBranding } from "@/entities/company-branding/server";
import { LoginForm, SessionEndedNotice } from "@/features/auth-by-credentials";
import { isSessionEndReason, SESSION_END_PARAM } from "@/shared/api/session-end";
import { routes } from "@/shared/config/routes";
import { companyLoginPath } from "@/shared/lib/workspace-path";
import { LoginScreen, LogoIcon, MonogramIcon, initialsOf } from "@/widgets/login-screen";

type Props = {
  params: Promise<{ locale: string; company: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, company } = await params;
  const lookup = await loadCompanyBranding(company);
  const t = await getTranslations({ locale, namespace: "auth" });
  if (lookup.status !== "found") return { title: t("signIn") };
  return { title: `${t("signIn")} · ${companyDisplayName(lookup.branding, locale)}` };
}

const quietLink = "font-semibold text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline";

export default async function CompanyLoginPage({ params, searchParams }: Props) {
  const { locale, company } = await params;
  setRequestLocale(locale);
  const reason = (await searchParams)[SESSION_END_PARAM];
  const t = await getTranslations("auth");
  const lookup = await loadCompanyBranding(company);
  const mainSignIn = `/${locale}${routes.login}?any=1`;

  if (lookup.status !== "found") {
    const missing = lookup.status === "not_found";
    const Icon = missing ? Building2 : CloudOff;
    return (
      <LoginScreen
        icon={
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-[26px] bg-white/10 text-white/80 shadow-[0_24px_48px_-18px_rgba(0,0,0,0.85),0_0_0_0.5px_rgba(255,255,255,0.22),inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-xl">
            <Icon className="h-9 w-9" strokeWidth={1.5} />
          </div>
        }
        title={missing ? t("notFoundTitle") : t("unavailableTitle")}
        subtitle={missing ? t("notFoundBody") : t("unavailableBody")}
      >
        <a
          href={missing ? mainSignIn : `/${locale}${companyLoginPath(company)}`}
          data-testid="company-login-fallback"
          className="flex h-12 w-full items-center justify-center rounded-full bg-white text-[15px] font-semibold text-zinc-950 shadow-[0_12px_30px_-14px_rgba(255,255,255,0.6)] transition-[transform,background-color] duration-200 hover:bg-white/90 active:scale-[0.98]"
        >
          {missing ? t("toMainSignIn") : t("retry")}
        </a>
      </LoginScreen>
    );
  }

  const { branding } = lookup;
  const name = companyDisplayName(branding, locale);
  const logo = companyLogoUrl(branding);

  return (
    <LoginScreen
      icon={logo ? <LogoIcon src={logo} alt={name} /> : <MonogramIcon label={initialsOf(name)} />}
      title={t("welcomeTo", { company: name })}
      subtitle={t("companySubtitle")}
      aside={
        <>
          {t("otherWorkspace")}{" "}
          <a href={mainSignIn} className={quietLink}>
            {t("useAnotherWorkspace")}
          </a>
        </>
      }
    >
      <div className="space-y-5">
        {isSessionEndReason(reason) ? <SessionEndedNotice reason={reason} /> : null}
        <LoginForm company={branding.slug} />
      </div>
    </LoginScreen>
  );
}
