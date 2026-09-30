import type { LucideIcon } from "lucide-react";
import { CalendarCheck2, CalendarDays, CalendarRange, SlidersHorizontal, SunMedium } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "@/shared/ui";
import type { TargetPeriodKind, TargetStatus } from "../model";

export const PERIOD_KIND_META: Record<TargetPeriodKind, { icon: LucideIcon; tone: Tone }> = {
  weekly: { icon: CalendarDays, tone: "sky" },
  monthly: { icon: CalendarRange, tone: "violet" },
  season: { icon: SunMedium, tone: "amber" },
  yearly: { icon: CalendarCheck2, tone: "emerald" },
  custom: { icon: SlidersHorizontal, tone: "rose" },
};

export const TARGET_STATUS_TONE: Record<TargetStatus, Tone> = {
  ahead: "emerald",
  on_track: "sky",
  behind: "rose",
  placeholder: "zinc",
};

const SIZES = {
  sm: { box: "h-9 w-9 rounded-xl", icon: "h-[18px] w-[18px]" },
  md: { box: "h-11 w-11 rounded-2xl", icon: "h-5 w-5" },
  lg: { box: "h-14 w-14 rounded-[20px]", icon: "h-7 w-7" },
} as const;

type Props = {
  kind: TargetPeriodKind;
  size?: keyof typeof SIZES;
  className?: string;
};

/** Gradient tile that identifies a target's period kind at a glance. */
export function PeriodKindIcon({ kind, size = "md", className }: Props) {
  const meta = PERIOD_KIND_META[kind] ?? PERIOD_KIND_META.custom;
  const Icon = meta.icon;
  const s = SIZES[size];
  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center", s.box, TONES[meta.tone].gradient, className)}
    >
      <Icon className={s.icon} strokeWidth={2} />
    </span>
  );
}
