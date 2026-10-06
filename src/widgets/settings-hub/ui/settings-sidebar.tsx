"use client";

import { useTranslations } from "next-intl";
import type { SettingsSectionId } from "@/shared/config/settings";
import { InsetGroup } from "@/shared/ui";
import { useSettingsGroups } from "../model/use-settings-groups";
import { ProfileCard } from "./profile-card";
import { SettingsRow } from "./settings-row";

/** The settings list: large title, profile card and grouped sections. */
export function SettingsSidebar({ active }: { active?: SettingsSectionId }) {
  const t = useTranslations("settings");
  // The profile card at the top is the viewer's own entry, like the Apple ID row.
  const groups = useSettingsGroups()
    .map((g) => ({ ...g, sections: g.sections.filter((s) => s.id !== "profile") }))
    .filter((g) => g.sections.length > 0);
  const Title = active ? "h2" : "h1";

  return (
    <nav aria-label={t("title")} className="space-y-5" data-testid="settings-nav">
      <Title className="px-1 text-[34px] font-bold leading-tight tracking-tight text-zinc-950">{t("title")}</Title>
      <ProfileCard active={active === "profile"} />
      {groups.map((group) => (
        <InsetGroup key={group.id} title={t(`groups.${group.id}`)}>
          {group.sections.map((s) => (
            <SettingsRow key={s.id} section={s} active={s.id === active} />
          ))}
        </InsetGroup>
      ))}
    </nav>
  );
}
