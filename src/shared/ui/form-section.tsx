import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "./tone";

type Props = {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  hint?: string;
  aside?: ReactNode;
  testId?: string;
  children: ReactNode;
};

/** An iOS-style grouped card with a large gradient icon heading one part of the form. */
export function FormSection({ icon: Icon, tone, title, hint, aside, testId, children }: Props) {
  return (
    <section
      className="rounded-[26px] border border-zinc-200/60 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5"
      data-testid={testId}
    >
      <header className="mb-4 flex items-center gap-3.5">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]", TONES[tone].gradient)} aria-hidden>
          <Icon className="h-6 w-6" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-semibold tracking-tight text-zinc-950">{title}</h3>
          {hint ? <p className="mt-0.5 text-[12.5px] font-medium text-zinc-500">{hint}</p> : null}
        </div>
        {aside}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/** A small caption above a group of controls that are not a single input. */
export function GroupLabel({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-zinc-700">
      {children}
      {extra}
    </div>
  );
}
