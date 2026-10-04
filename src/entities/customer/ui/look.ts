import {
  CalendarCheck2,
  CircleAlert,
  CircleCheckBig,
  CircleDashed,
  FileText,
  ListTodo,
  Plane,
  ShieldX,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/shared/ui";
import type { PassportStatus, TimelineKind } from "../model";

export type Look = { icon: LucideIcon; tone: Tone };

export const TIMELINE_LOOK: Record<TimelineKind, Look> = {
  lead: { icon: Sparkles, tone: "violet" },
  booking: { icon: Plane, tone: "sky" },
  payment: { icon: Wallet, tone: "emerald" },
  document: { icon: FileText, tone: "amber" },
  task: { icon: ListTodo, tone: "indigo" },
};

export function timelineLook(kind: string): Look {
  return TIMELINE_LOOK[kind as TimelineKind] ?? { icon: CalendarCheck2, tone: "zinc" };
}

export const PASSPORT_LOOK: Record<PassportStatus, Look> = {
  missing: { icon: CircleDashed, tone: "zinc" },
  valid: { icon: CircleCheckBig, tone: "emerald" },
  expiring: { icon: CircleAlert, tone: "amber" },
  expired: { icon: ShieldX, tone: "rose" },
};
