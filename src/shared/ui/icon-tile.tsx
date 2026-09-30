import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "./tone";

const SIZES = {
  sm: { box: "h-7 w-7 rounded-[10px]", icon: "h-3.5 w-3.5" },
  md: { box: "h-8 w-8 rounded-xl", icon: "h-4 w-4" },
  lg: { box: "h-10 w-10 rounded-2xl", icon: "h-5 w-5" },
} as const;

type Props = {
  icon: LucideIcon;
  tone: Tone;
  size?: keyof typeof SIZES;
  className?: string;
};

/** A soft, tone-tinted square holding an icon; the leading visual for facts and rows. */
export function IconTile({ icon: Icon, tone, size = "md", className }: Props) {
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center", SIZES[size].box, TONES[tone].soft, className)}
      aria-hidden
    >
      <Icon className={SIZES[size].icon} strokeWidth={2.2} />
    </span>
  );
}
