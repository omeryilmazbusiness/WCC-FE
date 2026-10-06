import type { ReactNode } from "react";
import type { Look } from "@/entities/importexport";
import { cn } from "@/shared/lib/cn";
import { TONES } from "@/shared/ui";

type Props = {
  look: Look;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
};

/** White rounded card with a big gradient icon heading — the board's section container. */
export function Panel({ look, title, description, actions, children, className, "data-testid": testId }: Props) {
  const Icon = look.icon;
  return (
    <section
      className={cn(
        "rounded-[28px] border border-zinc-200/60 bg-white p-5 shadow-[0_10px_34px_-24px_rgba(15,23,42,0.35)] sm:p-6",
        className,
      )}
      data-testid={testId}
    >
      <header className="mb-5 flex flex-wrap items-center gap-4">
        <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]", TONES[look.tone].gradient)} aria-hidden>
          <Icon className="h-7 w-7" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">{title}</h2>
          {description ? <p className="text-[13px] text-zinc-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

/** Small uppercase caption above a group of controls. */
export function GroupLabel({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p id={id} className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
      {children}
    </p>
  );
}

/** Big icon + message for empty and finished states. */
export function Hero({
  look,
  title,
  body,
  children,
  "data-testid": testId,
}: {
  look: Look;
  title: string;
  body?: string;
  children?: ReactNode;
  "data-testid"?: string;
}) {
  const Icon = look.icon;
  return (
    <div
      className={cn("flex flex-col items-center gap-4 rounded-[24px] bg-gradient-to-b px-6 py-12 text-center", TONES[look.tone].tint)}
      data-testid={testId}
    >
      <span className={cn("flex h-20 w-20 items-center justify-center rounded-[26px]", TONES[look.tone].gradient)} aria-hidden>
        <Icon className="h-10 w-10" strokeWidth={1.9} />
      </span>
      <div className="max-w-md space-y-1.5">
        <p className="text-[19px] font-semibold tracking-tight text-zinc-950">{title}</p>
        {body ? <p className="text-[14px] text-zinc-500">{body}</p> : null}
      </div>
      {children}
    </div>
  );
}
