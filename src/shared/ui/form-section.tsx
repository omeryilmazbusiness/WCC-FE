import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { GlyphTile } from "./inset-group";
import type { Tone } from "./tone";

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
        <GlyphTile icon={Icon} tone={tone} size="section" />
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-semibold leading-tight tracking-tight text-zinc-950">{title}</h3>
          {hint ? <p className="mt-1 text-[12.5px] font-medium leading-snug text-zinc-500">{hint}</p> : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
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
