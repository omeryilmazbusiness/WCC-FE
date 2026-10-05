import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "@/shared/ui";

/** White rounded panel with a big soft icon header, used by every finance tab. */
export function Section({
  icon: Icon,
  tone,
  title,
  subtitle,
  actions,
  children,
  className,
  testId,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <section className={cn("rounded-[28px] border border-zinc-200/60 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)} data-testid={testId}>
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", TONES[tone].soft)} aria-hidden>
          <Icon className="h-6 w-6" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16.5px] font-semibold tracking-tight text-zinc-950">{title}</h3>
          {subtitle ? <p className="text-[12.5px] text-zinc-500">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
