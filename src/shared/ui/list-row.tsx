import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "./tone";

type ListRowProps = {
  title: string;
  subtitle?: string;
  /** Leading icon in a soft tinted square; use `leading` for anything else (avatar). */
  icon?: LucideIcon;
  tone?: Tone;
  leading?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  className?: string;
  "data-testid"?: string;
};

/** Single-line row for card lists (fills the row height PagedList gives it). */
export function ListRow({
  title,
  subtitle,
  icon: Icon,
  tone = "zinc",
  leading,
  trailing,
  href,
  className,
  "data-testid": testId,
}: ListRowProps) {
  const shell = cn(
    "flex h-full items-center gap-3 rounded-2xl bg-zinc-50/80 px-3 transition-colors",
    href && "hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15",
    className,
  );
  const body = (
    <>
      {leading ??
        (Icon ? (
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TONES[tone].soft)}>
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>
        ) : null)}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-950">{title}</p>
        {subtitle ? <p className="truncate text-xs font-medium text-zinc-500">{subtitle}</p> : null}
      </div>
      {trailing ? <div className="flex shrink-0 items-center gap-2">{trailing}</div> : null}
    </>
  );

  return href ? (
    <Link href={href} className={shell} data-testid={testId}>
      {body}
    </Link>
  ) : (
    <div className={shell} data-testid={testId}>
      {body}
    </div>
  );
}
