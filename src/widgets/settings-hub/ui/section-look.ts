import { CircleHelp, Inbox, KeyRound, LifeBuoy, ScrollText, Sparkles, UserRound, Users, type LucideIcon } from "lucide-react";
import type { SettingsSectionId } from "@/shared/config/settings";
import type { Tone } from "@/shared/ui";

export type SectionLook = { icon: LucideIcon; tone: Tone };

export const SECTION_LOOK: Record<SettingsSectionId, SectionLook> = {
  profile: { icon: UserRound, tone: "violet" },
  team: { icon: Users, tone: "sky" },
  roles: { icon: KeyRound, tone: "indigo" },
  audit: { icon: ScrollText, tone: "zinc" },
  faq: { icon: CircleHelp, tone: "teal" },
  ai: { icon: Sparkles, tone: "violet" },
  support: { icon: LifeBuoy, tone: "rose" },
  supportInbox: { icon: Inbox, tone: "indigo" },
};
