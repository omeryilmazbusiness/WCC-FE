import type { LucideIcon } from "lucide-react";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "./tone";

type StatTileProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: Tone;
  /** Makes the whole tile a link. */
  href?: string;
  /** One short line under the label (unit, period). */
  caption?: string;
  className?: string;
  "data-testid"?: string;
};

/** Big-icon, big-number tile with a light colour wash — the dashboard's building block. */
export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "sky",
  href,
  caption,
  className,
  "data-testid": testId,
}: StatTileProps) {
  const shell = cn(
    "group flex h-full min-h-[148px] flex-col justify-between rounded-[28px] border border-zinc-200/60 bg-gradient-to-br p-5 shadow-[0_10px_34px_-24px_rgba(15,23,42,0.35)] transition-all duration-300",
    TONES[tone].tint,
    href && "hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15",
    className,
  );
  const body = (
    <>
      <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", TONES[tone].solid)}>
        <Icon className="h-6 w-6" strokeWidth={2} />
      </span>
      <div className="mt-4 min-w-0">
        <p className="truncate text-[34px] font-semibold leading-none tracking-tight tabular-nums text-zinc-950">
          {value}
        </p>
        <p className="mt-2 truncate text-[13px] font-medium text-zinc-500">{label}</p>
        {caption ? <p className="mt-0.5 truncate text-[11px] font-medium text-zinc-400">{caption}</p> : null}
      </div>
    </>
  );

  return href ? (
    <Link href={href} className={cn("block", shell)} data-testid={testId}>
      {body}
    </Link>
  ) : (
    <div className={shell} data-testid={testId}>
      {body}
    </div>
  );
}
