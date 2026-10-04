"use client";

import { Minus, Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "@/shared/ui";

type Props = {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  decrementLabel: string;
  incrementLabel: string;
  testId?: string;
  invalid?: boolean;
};

/** An iOS-style − / + counter row. */
export function Stepper({
  icon: Icon,
  tone,
  label,
  hint,
  value,
  min = 0,
  max,
  onChange,
  decrementLabel,
  incrementLabel,
  testId,
  invalid,
}: Props) {
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm ring-1 ring-inset ring-zinc-200 transition hover:bg-zinc-50 active:scale-95 disabled:pointer-events-none disabled:opacity-35";
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[20px] bg-zinc-50 p-2.5 ring-1 ring-inset",
        invalid ? "ring-rose-300" : "ring-zinc-200/70",
      )}
      data-testid={testId}
    >
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px]", TONES[tone].soft)} aria-hidden>
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-zinc-900">{label}</p>
        {hint ? <p className="truncate text-[11.5px] font-medium text-zinc-400">{hint}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={decrementLabel}>
          <Minus className="h-4 w-4" strokeWidth={2.6} aria-hidden />
        </button>
        <span className="w-7 text-center text-[17px] font-bold tabular-nums text-zinc-950" aria-live="polite" data-testid={testId ? `${testId}-value` : undefined}>
          {value}
        </span>
        <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={incrementLabel}>
          <Plus className="h-4 w-4" strokeWidth={2.6} aria-hidden />
        </button>
      </div>
    </div>
  );
}
