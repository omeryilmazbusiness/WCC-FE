"use client";

import { ArrowUpRight, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { settingsPath, type SettingsSection } from "@/shared/config/settings";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { GlyphTile } from "@/shared/ui";
import { SECTION_LOOK } from "./section-look";

/** One tappable settings row: colour glyph, title, one-line hint and a disclosure chevron. */
export function SettingsRow({ section, active }: { section: SettingsSection; active: boolean }) {
  const t = useTranslations("settings.sections");
  const look = SECTION_LOOK[section.id];
  const Disclosure = section.href ? ArrowUpRight : ChevronRight;

  return (
    <Link
      href={settingsPath(section)}
      scroll={section.href ? undefined : false}
      aria-current={active ? "page" : undefined}
      data-testid={`settings-row-${section.id}`}
      className={cn(
        "flex min-h-[56px] items-center gap-3 px-3.5 py-2 outline-none transition-colors focus-visible:bg-sky-50",
        active ? "bg-[#007AFF] text-white" : "hover:bg-zinc-50 active:bg-zinc-100",
      )}
    >
      <GlyphTile icon={look.icon} tone={look.tone} className={cn(active && "ring-1 ring-white/40")} />
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[15px] font-medium", active ? "text-white" : "text-zinc-950")}>{t(`${section.id}.title`)}</span>
        <span className={cn("block truncate text-[12px]", active ? "text-white/80" : "text-zinc-500")}>{t(`${section.id}.hint`)}</span>
      </span>
      <Disclosure className={cn("h-[18px] w-[18px] shrink-0 rtl:-scale-x-100", active ? "text-white/80" : "text-zinc-300")} strokeWidth={2.4} aria-hidden />
    </Link>
  );
}
