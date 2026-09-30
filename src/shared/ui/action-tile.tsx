import type { LucideIcon } from "lucide-react";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "./tone";

type ActionTileProps = {
  label: string;
  icon: LucideIcon;
  href: string;
  tone?: Tone;
  /** `lg` = large gradient squircle for hero rows. */
  size?: "md" | "lg";
  className?: string;
};

const SIZES = {
  md: {
    wrap: "w-[72px] gap-1.5",
    badge: "h-14 w-14 rounded-full",
    icon: "h-6 w-6",
    label: "text-[11px] text-zinc-600",
  },
  lg: {
    wrap: "w-[88px] gap-2",
    badge: "h-16 w-16 rounded-[22px] ring-1 ring-inset ring-white/25",
    icon: "h-7 w-7",
    label: "text-xs text-zinc-700",
  },
} as const;

/** Icon shortcut with a one-word caption (iOS Control Center style). */
export function ActionTile({ label, icon: Icon, href, tone = "sky", size = "md", className }: ActionTileProps) {
  const look = SIZES[size];
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        "group flex flex-col items-center rounded-2xl py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15",
        look.wrap,
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center transition-all duration-200 group-hover:-translate-y-0.5 group-active:scale-95",
          look.badge,
          size === "lg" ? TONES[tone].gradient : TONES[tone].solid,
        )}
      >
        <Icon className={look.icon} strokeWidth={size === "lg" ? 1.9 : 2} />
      </span>
      <span className={cn("w-full truncate text-center font-semibold", look.label)}>{label}</span>
    </Link>
  );
}
