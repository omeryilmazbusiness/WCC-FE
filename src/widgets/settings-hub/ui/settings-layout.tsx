"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SettingsSectionId } from "@/shared/config/settings";
import { cn } from "@/shared/lib/cn";
import { GlyphTile } from "@/shared/ui";
import { SettingsSidebar } from "./settings-sidebar";

/**
 * iPad-style split view: the list stays on the left and the open section on the right.
 * Below `lg` it behaves like iPhone Settings — the list, or the open section with a back link.
 * The sticky list and the scroll margin both sit 7rem down: the sticky app header (3.5rem) and workspace tab bar (2.5rem), plus a gap.
 * The pane's min height keeps a short or still-loading section from clamping the page scroll under the list.
 */
export function SettingsLayout({ active, children }: { active?: SettingsSectionId; children: ReactNode }) {
  const hubRef = useRef<HTMLDivElement>(null);

  // Rows navigate with scroll={false}; a page scrolled past the hub returns to where the sticky list rests, so the list never moves.
  useEffect(() => {
    const hub = hubRef.current;
    if (!hub) return;
    if (hub.getBoundingClientRect().top < parseFloat(getComputedStyle(hub).scrollMarginTop)) hub.scrollIntoView({ block: "start" });
  }, [active]);

  return (
    <div
      ref={hubRef}
      className="scroll-mt-28 lg:grid lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] lg:items-start lg:gap-8"
      data-testid="settings-hub"
    >
      <aside className={cn(active ? "hidden lg:block" : "block", "lg:sticky lg:top-28 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:pb-6 lg:pe-1")}>
        <SettingsSidebar active={active} />
      </aside>
      <div className={cn(active ? "block" : "hidden lg:block", "min-w-0 lg:min-h-[calc(100dvh-7rem)]")}>{children}</div>
    </div>
  );
}

/** Right-hand placeholder on wide screens until a section is opened. */
export function SettingsWelcome() {
  const t = useTranslations("settings");
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[28px] bg-white/70 px-8 text-center ring-1 ring-zinc-200/60" data-testid="settings-welcome">
      <GlyphTile icon={Settings} tone="zinc" size="lg" />
      <p className="mt-5 text-[22px] font-semibold tracking-tight text-zinc-950">{t("welcomeTitle")}</p>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-zinc-500">{t("welcomeBody")}</p>
    </div>
  );
}
