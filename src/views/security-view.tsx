"use client";

import { useLocale, useTranslations } from "next-intl";
import { UserRound } from "lucide-react";
import { useViewer } from "@/entities/viewer";
import { logout } from "@/features/auth-by-credentials";
import { MfaSettingsCard } from "@/features/manage-mfa";
import { SessionsCard } from "@/features/manage-sessions";
import { loginHref } from "@/shared/api/session-end";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Screen } from "@/shared/ui";

type Props = {
  enrollmentRequired?: boolean;
};

export function SecurityView({ enrollmentRequired }: Props) {
  const t = useTranslations("security");
  const locale = useLocale();
  const { user, scope, mfaEnrollmentRequired } = useViewer();
  const mustEnroll = !user.mfaEnabled && Boolean(enrollmentRequired || mfaEnrollmentRequired);

  async function signOutCurrent() {
    await logout();
    window.location.assign(loginHref(locale));
  }

  const rows: { label: string; value: string }[] = [
    { label: t("email"), value: user.email },
    { label: t("role"), value: user.role },
    { label: t("scope"), value: t(`scopes.${scope}`) },
  ];

  return (
    <Screen data-testid="security-view">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <MfaSettingsCard enrollmentRequired={enrollmentRequired} />
          {mustEnroll ? null : <SessionsCard onSignOutCurrent={signOutCurrent} />}
        </div>
        <Card className="self-start">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
                <UserRound className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <CardTitle>{user.fullName}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 text-sm">
                  <dt className="font-medium text-zinc-500">{row.label}</dt>
                  <dd className="truncate font-semibold capitalize text-zinc-900">{row.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </Screen>
  );
}
