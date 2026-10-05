import { cn } from "@/shared/lib/cn";
import { colorIndex, initials } from "@/shared/lib/avatar";

const PALETTE = [
  "from-sky-400 to-blue-600",
  "from-violet-400 to-purple-600",
  "from-emerald-400 to-teal-600",
  "from-amber-300 to-orange-500",
  "from-rose-400 to-pink-600",
  "from-indigo-400 to-indigo-600",
];

type Props = { id: string; name: string; size?: "sm" | "md"; className?: string };

/** Initials avatar with a stable per-person gradient. */
export function InitialsAvatar({ id, name, size = "sm", className }: Props) {
  return (
    <span
      title={name}
      aria-label={name}
      role="img"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-white",
        size === "sm" ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-[13px]",
        PALETTE[colorIndex(id || name, PALETTE.length)],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
