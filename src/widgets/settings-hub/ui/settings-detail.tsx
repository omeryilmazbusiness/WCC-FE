"use client";

import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { SETTINGS_ROOT, type SettingsDetailId } from "@/shared/config/settings";
import { Link } from "@/shared/i18n/navigation";
import { GlyphTile } from "@/shared/ui";
import { SECTION_LOOK } from "./section-look";

/** Detail screen frame: back link on phones, large glyph, title and description, then the content. */
export function SettingsDetail({ section, children }: { section: SettingsDetailId; children: ReactNode }) {
  const t = useTranslations("settings");
  const look = SECTION_LOOK[section];

  return (
    <article className="space-y-6" data-testid={`settings-detail-${section}`}>
      <Link
        href={SETTINGS_ROOT}
        scroll={false}
        className="-ms-1.5 inline-flex items-center text-[16px] font-medium text-[#007AFF] lg:hidden"
        data-testid="settings-back"
      >
        <ChevronLeft className="h-6 w-6 rtl:-scale-x-100" strokeWidth={2.4} aria-hidden />
        {t("title")}
      </Link>
      <header className="flex items-center gap-4">
        <GlyphTile icon={look.icon} tone={look.tone} size="lg" />
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-zinc-950 sm:text-[30px]">{t(`sections.${section}.title`)}</h1>
          <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-zinc-500">{t(`sections.${section}.description`)}</p>
        </div>
      </header>
      {children}
    </article>
  );
}
