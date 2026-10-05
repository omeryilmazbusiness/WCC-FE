import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "@/shared/ui";

/** Soft card with a big tinted icon heading; the building block of every workspace tab. */
export function WorkspaceSection({
  icon: Icon,
  tone,
  title,
  aside,
  children,
  className,
  testId,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <section className={cn("rounded-[24px] border border-zinc-200/70 bg-white p-4 sm:p-5", className)} data-testid={testId}>
      <header className="mb-3 flex items-center gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", TONES[tone].solid)} aria-hidden>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-zinc-950">{title}</h3>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function Fact({ label, value, dir }: { label: string; value: ReactNode; dir?: "ltr" | "rtl" }) {
  return (
    <div className="min-w-0 rounded-2xl bg-zinc-50/80 px-3 py-2.5">
      <dt className="truncate text-[11.5px] font-medium text-zinc-500">{label}</dt>
      <dd className="mt-0.5 truncate text-[14px] font-semibold text-zinc-950" dir={dir}>
        {value || "—"}
      </dd>
    </div>
  );
}
