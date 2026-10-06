"use client";

import { CircleCheckBig, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { TeamSummary as Summary } from "@/entities/identity";
import { formatNumber, formatPercent } from "@/shared/lib/format";
import { StatTile } from "@/shared/ui";

/** Four headline tiles: headcount, active, locked out and MFA coverage. */
export function TeamSummary({ summary }: { summary: Summary }) {
  const t = useTranslations("team.summary");
  const locale = useLocale();
  const n = (v: number) => formatNumber(v, locale);
  const mfaShare = summary.total ? summary.mfa / summary.total : 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="team-summary">
      <StatTile icon={UsersRound} tone="indigo" label={t("members")} value={n(summary.total)} caption={t("inactive", { count: summary.inactive, formatted: n(summary.inactive) })} />
      <StatTile icon={CircleCheckBig} tone="emerald" label={t("active")} value={n(summary.active)} caption={t("activeCaption")} />
      <StatTile
        icon={LockKeyhole}
        tone={summary.locked ? "rose" : "zinc"}
        label={t("locked")}
        value={n(summary.locked)}
        caption={summary.locked ? t("lockedCaption") : t("lockedNone")}
      />
      <StatTile icon={ShieldCheck} tone="violet" label={t("mfa")} value={formatPercent(mfaShare, locale)} caption={t("mfaCaption", { count: summary.mfa, formatted: n(summary.mfa) })} />
    </div>
  );
}
