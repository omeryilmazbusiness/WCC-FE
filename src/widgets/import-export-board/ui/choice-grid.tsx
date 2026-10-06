"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import type { Look } from "@/entities/importexport";
import { cn } from "@/shared/lib/cn";
import { TONES } from "@/shared/ui";

export type Choice<T extends string> = {
  value: T;
  look: Look;
  title: string;
  hint?: string;
  /** Small pill in the corner (e.g. "Export only"). */
  badge?: string;
  disabled?: boolean;
};

type Props<T extends string> = {
  label: string;
  choices: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "lg" | "md";
  className?: string;
  footer?: (choice: Choice<T>) => ReactNode;
  "data-testid"?: string;
};

/** Radio group of big-icon cards with arrow-key navigation (RTL aware). */
export function ChoiceGrid<T extends string>({
  label,
  choices,
  value,
  onChange,
  size = "lg",
  className,
  footer,
  "data-testid": testId,
}: Props<T>) {
  const enabled = choices.filter((c) => !c.disabled);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"];
    if (!keys.includes(e.key) || enabled.length === 0) return;
    e.preventDefault();
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const forward = e.key === "ArrowDown" || e.key === (rtl ? "ArrowLeft" : "ArrowRight");
    const i = enabled.findIndex((c) => c.value === value);
    const next = enabled[(i + (forward ? 1 : -1) + enabled.length) % enabled.length];
    onChange(next.value);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className={cn("grid gap-3", className)} data-testid={testId}>
      {choices.map((choice) => {
        const Icon = choice.look.icon;
        const tone = TONES[choice.look.tone];
        const active = choice.value === value;
        return (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-disabled={choice.disabled || undefined}
            disabled={choice.disabled}
            tabIndex={active ? 0 : -1}
            data-value={choice.value}
            onClick={() => onChange(choice.value)}
            className={cn(
              "group relative flex flex-col items-start rounded-[24px] border bg-gradient-to-br text-start transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
              size === "lg" ? "min-h-[136px] gap-3 p-4" : "min-h-[112px] gap-2.5 p-3.5",
              choice.disabled
                ? "cursor-not-allowed border-dashed border-zinc-200 from-zinc-50 to-zinc-50 opacity-70"
                : active
                  ? cn("border-transparent shadow-[0_18px_40px_-24px_rgba(15,23,42,0.5)] ring-2 ring-zinc-900/80", tone.tint)
                  : "border-zinc-200/70 from-white to-white hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-22px_rgba(15,23,42,0.45)]",
            )}
          >
            <span className="flex w-full items-start justify-between gap-2">
              <span
                className={cn(
                  "flex items-center justify-center transition-transform duration-300",
                  size === "lg" ? "h-12 w-12 rounded-2xl" : "h-10 w-10 rounded-[14px]",
                  !choice.disabled && "group-hover:scale-105",
                  choice.disabled ? "bg-zinc-100 text-zinc-400" : active ? tone.gradient : tone.soft,
                )}
                aria-hidden
              >
                <Icon className={size === "lg" ? "h-6 w-6" : "h-5 w-5"} strokeWidth={2} />
              </span>
              {choice.badge ? (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10.5px] font-semibold text-zinc-500">{choice.badge}</span>
              ) : active ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-white" aria-hidden>
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              ) : null}
            </span>
            <span className="min-w-0">
              <span className={cn("block font-semibold tracking-tight text-zinc-950", size === "lg" ? "text-[15px]" : "text-[14px]")}>
                {choice.title}
              </span>
              {choice.hint ? <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-zinc-500">{choice.hint}</span> : null}
            </span>
            {footer ? footer(choice) : null}
          </button>
        );
      })}
    </div>
  );
}
