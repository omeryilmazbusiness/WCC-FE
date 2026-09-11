import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";

/** Soft Light tones — no entity imports (FSD-safe). */
const TONE_STYLES = {
  sky: "bg-sky-50 text-sky-800",
  indigo: "bg-indigo-50 text-indigo-800",
  violet: "bg-violet-50 text-violet-800",
  amber: "bg-amber-50 text-amber-900",
  emerald: "bg-emerald-50 text-emerald-800",
  zinc: "bg-zinc-100 text-zinc-600",
} as const;

export type StageBadgeTone = keyof typeof TONE_STYLES;

type StageBadgeProps = {
  tone?: StageBadgeTone;
  label: string;
  className?: string;
};

export function StageBadge({
  tone = "zinc",
  label,
  className,
}: StageBadgeProps) {
  return (
    <Badge className={cn(TONE_STYLES[tone], "capitalize", className)}>
      {label}
    </Badge>
  );
}

/** Map CRM lead stages → badge tone without coupling shared → entities */
export const LEAD_STAGE_TONES: Record<string, StageBadgeTone> = {
  new: "sky",
  contacted: "indigo",
  qualified: "violet",
  proposal: "amber",
  won: "emerald",
  lost: "zinc",
};
