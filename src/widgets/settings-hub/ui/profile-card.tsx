"use client";

import { ChevronRight, UserRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { UserAvatar } from "@/entities/profile";
import { useViewer } from "@/entities/viewer";
import { SETTINGS_ROOT } from "@/shared/config/settings";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";

/** The viewer's own card at the top of settings, like the Apple ID row; opens their profile. */
export function ProfileCard({ active = false }: { active?: boolean }) {
  const t = useTranslations("settings");
  const tRole = useTranslations("app.roles");
  const locale = useLocale();
  const viewer = useViewer();
  const company = viewer.workspace?.company;
  const companyName = company ? (locale === "ar" && company.nameAr) || company.nameEn : null;

  return (
    <Link
      href={`${SETTINGS_ROOT}/profile`}
      scroll={false}
      aria-current={active ? "page" : undefined}
      data-testid="settings-profile"
      className={cn(
        "flex items-center gap-3.5 rounded-[20px] bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-zinc-200/60 transition-colors hover:bg-zinc-50",
        active && "lg:bg-[#007AFF]/[0.06] lg:ring-[#007AFF]/30",
      )}
    >
      <UserAvatar
        id={viewer.user.id}
        name={viewer.user.fullName || viewer.user.email}
        avatarVersion={viewer.user.avatarVersion}
        size="lg"
        className="shadow-[0_10px_24px_-12px_rgba(79,70,229,0.8)]"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px] font-semibold tracking-tight text-zinc-950">{viewer.user.fullName}</span>
        <span className="block truncate text-[12.5px] text-zinc-500">
          {viewer.user.jobTitle || tRole(viewer.user.role)}
          {companyName ? ` · ${companyName}` : ""}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[12px] font-medium text-[#007AFF]">
          <UserRound className="h-3.5 w-3.5" aria-hidden />
          {t("profileHint")}
        </span>
      </span>
      <ChevronRight className="h-[18px] w-[18px] shrink-0 text-zinc-300 rtl:-scale-x-100" strokeWidth={2.4} aria-hidden />
    </Link>
  );
}
