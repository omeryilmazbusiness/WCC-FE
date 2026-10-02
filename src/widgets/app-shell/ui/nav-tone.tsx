import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import type { NavTone } from "../model/nav";

/** Static class strings per tone so Tailwind can see them. */
export const TONE: Record<NavTone, { tile: string; glyph: string; dot: string }> = {
  sky: { tile: "from-sky-400 to-blue-500", glyph: "text-sky-400", dot: "bg-sky-400" },
  violet: {
    tile: "from-violet-400 to-fuchsia-500",
    glyph: "text-violet-400",
    dot: "bg-violet-400",
  },
  emerald: {
    tile: "from-emerald-400 to-teal-500",
    glyph: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  amber: { tile: "from-amber-400 to-orange-500", glyph: "text-amber-400", dot: "bg-amber-400" },
  indigo: { tile: "from-indigo-400 to-blue-600", glyph: "text-indigo-400", dot: "bg-indigo-400" },
  slate: { tile: "from-slate-400 to-slate-600", glyph: "text-slate-300", dot: "bg-slate-300" },
};

export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30";

const SIZE = {
  md: { box: "h-10 w-10 rounded-[14px]", icon: "h-5 w-5" },
  sm: { box: "h-[22px] w-[22px] rounded-[7px]", icon: "h-3 w-3" },
} as const;

/** iOS-style gradient icon tile. */
export function NavTile({
  tone,
  icon: Icon,
  size = "md",
}: {
  tone: NavTone;
  icon: LucideIcon;
  size?: keyof typeof SIZE;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-br text-white shadow-sm ring-1 ring-white/15",
        SIZE[size].box,
        TONE[tone].tile,
      )}
    >
      <Icon className={SIZE[size].icon} strokeWidth={2.1} />
    </span>
  );
}
