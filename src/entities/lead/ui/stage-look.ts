import {
  BadgeCheck,
  Banknote,
  CircleX,
  FileSignature,
  PhoneCall,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/shared/ui";
import type { LeadStage } from "../model";

export type StageLook = { icon: LucideIcon; tone: Tone };

/** Icon and color per pipeline stage; the single source for columns, cards and menus. */
export const LEAD_STAGE_LOOK: Record<LeadStage, StageLook> = {
  new: { icon: Sparkles, tone: "sky" },
  contacted: { icon: PhoneCall, tone: "indigo" },
  qualified: { icon: BadgeCheck, tone: "violet" },
  proposal: { icon: FileSignature, tone: "amber" },
  paid: { icon: Banknote, tone: "teal" },
  won: { icon: Trophy, tone: "emerald" },
  lost: { icon: CircleX, tone: "zinc" },
};

export function stageLook(stage: string): StageLook {
  return LEAD_STAGE_LOOK[stage as LeadStage] ?? LEAD_STAGE_LOOK.new;
}
