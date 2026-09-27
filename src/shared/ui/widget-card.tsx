import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "./tone";

type WidgetCardProps = {
  title: string;
  icon: LucideIcon;
  tone?: Tone;
  /** Small counter next to the title (e.g. open items). */
  count?: number;
  /** "See all" target in the header. */
  href?: string;
  hrefLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
};

/**
 * iOS widget-style card: solid icon, one-line title, optional counter and "see all".
 * Stretches to its grid cell so cards in a row stay the same height.
 */
export function WidgetCard({
  title,
  icon: Icon,
  tone = "sky",
  count,
  href,
  hrefLabel,
  actions,
  children,
  className,
  "data-testid": testId,
}: WidgetCardProps) {
  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-[28px] border border-zinc-200/60 bg-white p-5 shadow-[0_10px_34px_-24px_rgba(15,23,42,0.35)] sm:p-6",
        className,
      )}
      data-testid={testId}
    >
      <header className="mb-4 flex items-center gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TONES[tone].solid)}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <h2 className="min-w-0 truncate text-[17px] font-semibold tracking-tight text-zinc-950">{title}</h2>
        {count !== undefined ? (
          <span
            className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", TONES[tone].soft)}
            data-testid="widget-count"
          >
            {count}
          </span>
        ) : null}
        <div className="ms-auto flex shrink-0 items-center gap-2">
          {actions}
          {href ? (
            <Link
              href={href}
              aria-label={hrefLabel ?? title}
              title={hrefLabel}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" strokeWidth={2} />
            </Link>
          ) : null}
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
