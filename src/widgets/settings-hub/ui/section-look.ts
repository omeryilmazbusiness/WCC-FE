import { KeyRound, ScrollText, UserRound, Users, type LucideIcon } from "lucide-react";
import type { SettingsSectionId } from "@/shared/config/settings";
import type { Tone } from "@/shared/ui";

export type SectionLook = { icon: LucideIcon; tone: Tone };

export const SECTION_LOOK: Record<SettingsSectionId, SectionLook> = {
  profile: { icon: UserRound, tone: "violet" },
  team: { icon: Users, tone: "sky" },
  roles: { icon: KeyRound, tone: "indigo" },
  audit: { icon: ScrollText, tone: "zinc" },
};
