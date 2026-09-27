import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "./tone";
import { Link } from "@/shared/i18n/navigation";


export type SurfaceAccent = Tone;

type SurfacePanelProps = {
  title: string;
  description?: string;
  icon: LucideIcon;
  accent?: SurfaceAccent;
  href?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
};

/**
 * Soft Light section panel — workspace cards, dashboard blocks, empty shells.
 */
export function SurfacePanel({
  title,
  description,
  icon: Icon,
  accent = "sky",
  href,
  actions,
  children,
  className,
  "data-testid": testId,
}: SurfacePanelProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
            TONES[accent].soft,
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={1.6} />
        </span>
        {actions}
      </div>
      <h2 className="mt-5 text-[15px] font-semibold tracking-tight text-zinc-950">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </>
  );

  const shell = cn(
    "rounded-[24px] border border-zinc-200/70 bg-white p-6 shadow-[0_12px_36px_-22px_rgba(15,23,42,0.22)] sm:p-7",
    href &&
      "block transition-all duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[0_16px_40px_-22px_rgba(15,23,42,0.3)]",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={shell} data-testid={testId}>
        {body}
      </Link>
    );
  }

  return (
    <section className={shell} data-testid={testId}>
      {body}
    </section>
  );
}
