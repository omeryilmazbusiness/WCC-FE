import type { LucideIcon } from "lucide-react";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "./tone";

type ActionTileProps = {
  label: string;
  icon: LucideIcon;
  href: string;
  tone?: Tone;
  className?: string;
};

/** Round icon shortcut with a one-word caption (iOS Control Center style). */
export function ActionTile({ label, icon: Icon, href, tone = "sky", className }: ActionTileProps) {
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        "group flex w-[72px] flex-col items-center gap-1.5 rounded-2xl py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-200 group-hover:-translate-y-0.5 group-active:scale-95",
          TONES[tone].solid,
        )}
      >
        <Icon className="h-6 w-6" strokeWidth={2} />
      </span>
      <span className="w-full truncate text-center text-[11px] font-semibold text-zinc-600">{label}</span>
    </Link>
  );
}
