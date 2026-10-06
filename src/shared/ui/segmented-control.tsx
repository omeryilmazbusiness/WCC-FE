"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** Small badge after the label; pass an already formatted number. */
  count?: string;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  /** `lg` matches the 44px buttons used in hero headers. */
  size?: "md" | "lg";
  className?: string;
  "aria-label"?: string;
};

/** Soft Light view switcher — Kanban / Table etc. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex rounded-2xl border border-zinc-200/80 bg-zinc-100/80 p-1 shadow-sm",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            data-testid={`segment-${opt.value}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl font-semibold transition-all duration-300",
              size === "lg" ? "h-9 px-3.5 text-[13px]" : "px-3.5 py-2 text-xs",
              active
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800",
            )}
          >
            {Icon ? <Icon className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} strokeWidth={2.2} aria-hidden /> : null}
            {opt.label}
            {opt.count !== undefined ? (
              <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", active ? "bg-zinc-100 text-zinc-700" : "bg-zinc-200/70 text-zinc-500")}>
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
