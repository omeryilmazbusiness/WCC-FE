"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "@/shared/ui";

type Props = {
  icon: LucideIcon;
  tone: Tone;
  value: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  /** Muted and inert, e.g. a filter with nothing behind it. */
  disabled?: boolean;
  /** Tints the value, e.g. overdue work. */
  alert?: boolean;
  title?: string;
  /** Smaller figure for long values such as compact money. */
  compact?: boolean;
  "data-testid"?: string;
};

/** Gradient icon over a big number and a short label; a pressable filter or sort chip for dashboard cards. */
export function MetricTile({
  icon: Icon,
  tone,
  value,
  label,
  active,
  onClick,
  disabled,
  alert,
  title,
  compact,
  "data-testid": testId,
}: Props) {
  const inert = Boolean(disabled) && !active;
  return (
    <button
      type="button"
      disabled={inert}
      aria-pressed={active}
      title={title ?? label}
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "flex min-w-0 flex-col items-center gap-1.5 rounded-[20px] px-1 pb-2.5 pt-3 transition-all",
        active
          ? "bg-white shadow-[0_14px_30px_-18px_rgba(15,23,42,0.45)] ring-2 ring-zinc-900/80"
          : "bg-zinc-50/70 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_26px_-20px_rgba(15,23,42,0.45)]",
        inert && "cursor-default opacity-45 hover:translate-y-0 hover:bg-zinc-50/70 hover:shadow-none",
      )}
    >
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", TONES[tone].gradient)}>
        <Icon className="h-5 w-5" strokeWidth={2.1} />
      </span>
      <span
        className={cn(
          compact ? "text-[15px]" : "text-[18px]",
          "block max-w-full truncate font-semibold leading-[22px] tabular-nums tracking-tight",
          alert ? "text-rose-600" : "text-zinc-950",
        )}
      >
        {value}
      </span>
      <span className="w-full truncate text-center text-[11px] font-medium text-zinc-500">{label}</span>
    </button>
  );
}
