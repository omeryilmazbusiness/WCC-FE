"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "@/shared/ui";

/** Big iOS-style metric tile: gradient icon, large figure, quiet caption. */
export function HeroTile({
  icon: Icon,
  tone,
  label,
  value,
  caption,
  onClick,
  testId,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  onClick?: () => void;
  testId?: string;
}) {
  const body = (
    <>
      <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]", TONES[tone].gradient)} aria-hidden>
        <Icon className="h-7 w-7" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-semibold uppercase tracking-wide text-zinc-400">{label}</span>
        <span className="mt-1 block truncate text-[26px] font-semibold leading-tight tracking-tight tabular-nums text-zinc-950">{value}</span>
        {caption ? <span className="mt-0.5 block truncate text-[12.5px] text-zinc-500">{caption}</span> : null}
      </span>
    </>
  );
  const cls = cn(
    "flex min-w-0 items-center gap-4 rounded-[28px] border border-zinc-200/60 bg-gradient-to-br p-5 text-start shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
    TONES[tone].tint,
    onClick && "transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.5)]",
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={cls} data-testid={testId}>
      {body}
    </button>
  ) : (
    <div className={cls} data-testid={testId}>
      {body}
    </div>
  );
}

/** Compact counter tile used for alert and status filters. */
export function CountTile({
  icon: Icon,
  tone,
  label,
  count,
  active,
  muted,
  onClick,
  testId,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  count: ReactNode;
  active?: boolean;
  /** Nothing to act on: soft icon, no colour pull. */
  muted?: boolean;
  onClick?: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      disabled={!onClick}
      data-testid={testId}
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-[24px] border bg-gradient-to-br p-3.5 text-start transition duration-300 disabled:cursor-default",
        muted ? "from-white via-white to-white" : TONES[tone].tint,
        active ? "border-zinc-900/80 ring-1 ring-zinc-900/80" : "border-zinc-200/60 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[0_14px_34px_-26px_rgba(15,23,42,0.45)]",
      )}
    >
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", muted ? "bg-zinc-100 text-zinc-400" : TONES[tone].solid)} aria-hidden>
        <Icon className="h-6 w-6" strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="block text-[22px] font-semibold leading-none tabular-nums text-zinc-950">{count}</span>
        <span className="mt-1 line-clamp-2 block text-[12.5px] font-medium leading-tight text-zinc-500">{label}</span>
      </span>
    </button>
  );
}

/** Soft rounded pill for statuses. */
export function Pill({ tone, icon: Icon, children }: { tone: Tone; icon?: LucideIcon; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold", TONES[tone].soft)}>
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
      {children}
    </span>
  );
}

/** Row with a large soft icon, two lines of text and a trailing figure. */
export function MoneyRow({
  icon: Icon,
  tone,
  title,
  subtitle,
  amount,
  amountHint,
  amountTone,
  actions,
  testId,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: ReactNode;
  subtitle?: ReactNode;
  amount?: ReactNode;
  amountHint?: ReactNode;
  amountTone?: "positive" | "negative" | "muted";
  actions?: ReactNode;
  testId?: string;
}) {
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" data-testid={testId}>
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", TONES[tone].soft)} aria-hidden>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-zinc-900">{title}</div>
        {subtitle ? <div className="truncate text-[12px] text-zinc-500">{subtitle}</div> : null}
      </div>
      {amount !== undefined ? (
        <div className="text-end">
          <div
            className={cn(
              "text-[15px] font-bold tabular-nums",
              amountTone === "positive" ? "text-emerald-600" : amountTone === "negative" ? "text-rose-600" : amountTone === "muted" ? "text-zinc-400" : "text-zinc-900",
            )}
          >
            {amount}
          </div>
          {amountHint ? <div className="text-[11.5px] tabular-nums text-zinc-400">{amountHint}</div> : null}
        </div>
      ) : null}
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </li>
  );
}

/** Horizontal bar with a label and a value, scaled against `max`. */
export function Bar({ label, value, max, tone, display }: { label: ReactNode; value: number; max: number; tone: Tone; display: ReactNode }) {
  const pct = max > 0 ? Math.max(2, Math.min(100, Math.round((Math.abs(value) / max) * 100))) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
        <span className="truncate font-semibold text-zinc-700">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums text-zinc-900">{display}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
        <div className={cn("h-full rounded-full", TONES[tone].dot)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export const CURRENCY_TONES: Tone[] = ["emerald", "indigo", "amber", "rose", "violet", "sky", "teal", "zinc"];
