"use client";

import { useState, type ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  ChevronRight,
  Fingerprint,
  KeyRound,
  Mail,
  MapPin,
  MonitorSmartphone,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ROLE_LOOK } from "@/entities/identity";
import { getProfile, profileCompleteness, type Profile } from "@/entities/profile";
import { useRefreshViewer, useViewer } from "@/entities/viewer";
import { ChangeEmailDialog, ChangePasswordDialog, PersonalInfoForm, ProfilePhoto } from "@/features/edit-profile";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { formatDate } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { CopyButton, GlyphTile, InsetGroup, QueryState, TONES, type Tone } from "@/shared/ui";

/** The viewer's own account: photo, personal details, sign-in and the organisation they belong to. */
export function ProfileSection() {
  const viewer = useViewer();
  const refreshViewer = useRefreshViewer();
  const query = useApiQuery(() => getProfile(), [], { cacheKey: ["me-profile", viewer.user.id] });

  function onSaved(next: Profile) {
    query.setData(next);
    void refreshViewer();
  }

  return (
    <QueryState loadingVariant="lines" loading={query.loading && !query.data} error={query.data ? undefined : query.error} onRetry={() => void query.reload()}>
      {query.data ? <ProfileScreen profile={query.data} onSaved={onSaved} /> : null}
    </QueryState>
  );
}

function ProfileScreen({ profile, onSaved }: { profile: Profile; onSaved: (p: Profile) => void }) {
  const t = useTranslations("settings.profile");
  const tRole = useTranslations("team.roles");
  const locale = useLocale();
  const viewer = useViewer();
  const [dialog, setDialog] = useState<"email" | "password" | null>(null);

  const workspace = viewer.workspace;
  const company = workspace?.company;
  const companyName = company ? (locale === "ar" && company.nameAr) || company.nameEn : null;
  const branch = profile.branchId ? workspace?.branches.find((b) => b.id === profile.branchId) : undefined;
  const branchName = branch ? (locale === "ar" && branch.nameAr) || branch.nameEn : null;
  const teamName = profile.team ? (locale === "ar" && profile.team.nameAr) || profile.team.nameEn : null;
  const roleLook = ROLE_LOOK[profile.role] ?? ROLE_LOOK.employee;
  const completeness = profileCompleteness(profile);

  return (
    <div className="space-y-7" data-testid="profile-section">
      <section className="overflow-hidden rounded-[24px] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-zinc-200/60">
        <div className="h-20 bg-gradient-to-br from-sky-100 via-indigo-100 to-violet-100" aria-hidden />
        <div className="-mt-12 flex flex-col items-center px-5 pb-5 text-center">
          <ProfilePhoto profile={profile} onSaved={onSaved} />
          <h2 className="mt-3 text-[22px] font-bold tracking-tight text-zinc-950" data-testid="profile-name">
            {profile.fullName}
          </h2>
          {profile.jobTitle ? <p className="text-[14px] text-zinc-600">{profile.jobTitle}</p> : null}
          <p className="mt-0.5 text-[13px] text-zinc-400" dir="ltr">
            {profile.email}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold", TONES[roleLook.tone].soft)}>
              <roleLook.icon className="h-3.5 w-3.5" aria-hidden />
              {tRole(profile.role)}
            </span>
            {companyName ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-[12px] font-medium text-zinc-600">
                <Building2 className="h-3.5 w-3.5" aria-hidden />
                {companyName}
              </span>
            ) : null}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium",
                profile.mfaEnabled ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              {profile.mfaEnabled ? t("mfaOn") : t("mfaOff")}
            </span>
          </div>
          {completeness < 100 ? (
            <div className="mt-5 w-full max-w-sm text-start" data-testid="profile-completeness">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-semibold text-zinc-700">{t("completeness.title")}</span>
                <span className="tabular-nums text-zinc-500">{completeness}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-[width] duration-500" style={{ width: `${completeness}%` }} />
              </div>
              <p className="mt-1.5 text-[11.5px] text-zinc-400">{t("completeness.hint")}</p>
            </div>
          ) : null}
        </div>
      </section>

      <PersonalInfoForm profile={profile} onSaved={onSaved} />

      <InsetGroup title={t("signIn.title")} footer={t("signIn.footer")}>
        <ActionRow icon={Mail} tone="sky" label={t("signIn.email")} value={profile.email} valueDir="ltr" onClick={() => setDialog("email")} testId="profile-row-email" />
        <ActionRow
          icon={KeyRound}
          tone="amber"
          label={t("signIn.password")}
          value={t("signIn.passwordValue")}
          onClick={() => setDialog("password")}
          testId="profile-row-password"
        />
        <ActionRow
          icon={Fingerprint}
          tone={profile.mfaEnabled ? "emerald" : "rose"}
          label={t("signIn.mfa")}
          value={profile.mfaEnabled ? t("signIn.on") : t("signIn.off")}
          href={routes.security}
          testId="profile-row-mfa"
        />
        <ActionRow icon={MonitorSmartphone} tone="indigo" label={t("signIn.sessions")} value={t("signIn.sessionsValue")} href={routes.security} testId="profile-row-sessions" />
      </InsetGroup>

      <InsetGroup title={t("org.title")} footer={t("org.footer")} data-testid="profile-org">
        <InfoRow icon={roleLook.icon} tone={roleLook.tone} label={t("org.role")} value={tRole(profile.role)} />
        {companyName ? <InfoRow icon={Building2} tone="violet" label={t("org.company")} value={companyName} /> : null}
        {profile.role !== "admin" ? (
          <InfoRow icon={MapPin} tone="teal" label={t("org.branch")} value={branchName ?? t("org.allBranches")} />
        ) : null}
        <InfoRow icon={UsersRound} tone="sky" label={t("org.team")} value={teamName ?? t("org.noTeam")} muted={!teamName} />
        <InfoRow icon={CalendarDays} tone="zinc" label={t("org.memberSince")} value={formatDate(profile.createdAt, locale, { year: "numeric", month: "long", day: "numeric" })} />
      </InsetGroup>

      <div className="flex flex-wrap items-center justify-between gap-2 px-4 text-[11.5px] text-zinc-400">
        <span>{t("updated", { date: formatDate(profile.updatedAt, locale, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) })}</span>
        <span className="flex items-center gap-1">
          {t("accountId")}
          <code className="font-mono text-zinc-500" dir="ltr">
            {profile.id.slice(0, 8)}
          </code>
          <CopyButton value={profile.id} label={t("copyId")} />
        </span>
      </div>

      <ChangeEmailDialog open={dialog === "email"} onOpenChange={(o) => setDialog(o ? "email" : null)} profile={profile} onSaved={onSaved} />
      <ChangePasswordDialog open={dialog === "password"} onOpenChange={(o) => setDialog(o ? "password" : null)} email={profile.email} />
    </div>
  );
}

const ROW = "flex min-h-[52px] w-full items-center gap-3 px-4 py-2 text-start";

function RowBody({ icon, tone, label, value, valueDir, muted, trailing }: { icon: LucideIcon; tone: Tone; label: string; value: string; valueDir?: "ltr"; muted?: boolean; trailing?: ReactNode }) {
  return (
    <>
      <GlyphTile icon={icon} tone={tone} />
      <span className="min-w-0 flex-1 text-[15px] text-zinc-950">{label}</span>
      <span className={cn("min-w-0 max-w-[55%] truncate text-[14.5px]", muted ? "text-zinc-300" : "text-zinc-500")} dir={valueDir}>
        {value}
      </span>
      {trailing}
    </>
  );
}

const CHEVRON = <ChevronRight className="h-[18px] w-[18px] shrink-0 text-zinc-300 rtl:-scale-x-100" strokeWidth={2.4} aria-hidden />;

function ActionRow({
  onClick,
  href,
  testId,
  ...body
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  valueDir?: "ltr";
  onClick?: () => void;
  href?: string;
  testId: string;
}) {
  const cls = cn(ROW, "transition-colors hover:bg-zinc-50 active:bg-zinc-100");
  if (href) {
    return (
      <Link href={href} className={cls} data-testid={testId}>
        <RowBody {...body} trailing={CHEVRON} />
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} data-testid={testId}>
      <RowBody {...body} trailing={CHEVRON} />
    </button>
  );
}

function InfoRow(props: { icon: LucideIcon; tone: Tone; label: string; value: string; muted?: boolean }) {
  return (
    <div className={ROW}>
      <RowBody {...props} />
    </div>
  );
}
