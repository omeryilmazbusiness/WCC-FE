import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { IconTile } from "./icon-tile";
import type { Tone } from "./tone";

type InfoSectionProps = {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  /** Short count or status next to the title. */
  badge?: ReactNode;
  action?: ReactNode;
  className?: string;
  "data-testid"?: string;
  children: ReactNode;
};

/** iOS grouped card: a tinted icon and title over its content. */
export function InfoSection({ icon, tone, title, badge, action, className, "data-testid": testId, children }: InfoSectionProps) {
  return (
    <section
      className={cn("rounded-[26px] border border-zinc-200/60 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5", className)}
      data-testid={testId}
    >
      <header className="mb-3.5 flex items-center gap-2.5">
        <IconTile icon={icon} tone={tone} size="lg" />
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-zinc-950">
          {title}
          {badge ? <span className="ms-2 align-middle">{badge}</span> : null}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

type InfoRowProps = {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  muted?: boolean;
  action?: ReactNode;
  /** `ltr` for phone numbers, e-mail and codes inside RTL pages. */
  dir?: "ltr" | "auto";
  "data-testid"?: string;
};

/** Settings-style fact row: big tinted icon, small label, prominent value. */
export function InfoRow({ icon, tone, label, value, hint, muted, action, dir = "auto", "data-testid": testId }: InfoRowProps) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" data-testid={testId}>
      <IconTile icon={icon} tone={tone} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11.5px] font-medium text-zinc-400">{label}</p>
        <div dir={dir} className={cn("truncate text-start text-[14px] font-semibold", muted ? "text-zinc-400" : "text-zinc-900")}>
          {value}
        </div>
        {hint ? <div className="truncate text-[11.5px] text-zinc-500">{hint}</div> : null}
      </div>
      {action}
    </div>
  );
}

/** Small pill for row and card actions. */
export const infoActionClass =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl bg-zinc-50 px-2.5 text-[12px] font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-200/70 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50";
