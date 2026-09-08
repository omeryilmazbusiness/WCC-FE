"use client";

import * as React from "react";
import { Check, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

export type FilterOption<T extends string = string> = {
  value: T;
  label: string;
  count?: number;
};

export type FilterChipProps = {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  onClear?: () => void;
  className?: string;
};

/** Pill chip for quick filter toggles */
export function FilterChip({
  label,
  active,
  count,
  onClick,
  onClear,
  className,
}: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-2xl border px-3.5 text-sm font-semibold transition-all duration-300",
        active
          ? "border-zinc-900 bg-zinc-950 text-white shadow-[0_10px_24px_-14px_rgba(10,10,10,0.55)]"
          : "border-zinc-200/80 bg-white text-zinc-600 shadow-sm hover:-translate-y-0.5 hover:border-zinc-300 hover:text-zinc-950",
        className,
      )}
    >
      <span>{label}</span>
      {typeof count === "number" ? (
        <span
          className={cn(
            "rounded-lg px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
            active ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-500",
          )}
        >
          {count}
        </span>
      ) : null}
      {active && onClear ? (
        <span
          role="button"
          tabIndex={0}
          aria-label="Clear filter"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onClear();
            }
          }}
          className="ms-0.5 rounded-md p-0.5 hover:bg-white/15"
        >
          <X className="h-3 w-3" />
        </span>
      ) : null}
    </button>
  );
}

export type FilterMenuProps<T extends string = string> = {
  label?: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
  allValue?: T;
  triggerLabel?: string;
  className?: string;
};

/** Dropdown filter — reusable for status, branch, stage, etc. */
export function FilterMenu<T extends string = string>({
  label = "Filter",
  value,
  options,
  onChange,
  allValue,
  triggerLabel,
  className,
}: FilterMenuProps<T>) {
  const isActive = allValue != null ? value !== allValue : true;
  const selected = options.find((o) => o.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={isActive ? "default" : "outline"}
          size="sm"
          className={cn("gap-2", className)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} />
          {triggerLabel ?? selected?.label ?? label}
          {isActive ? (
            <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold">
              1
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => {
          const selectedOption = option.value === value;
          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => onChange(option.value)}
              className="justify-between"
            >
              <span className="flex items-center gap-2">
                {selectedOption ? (
                  <Check className="h-3.5 w-3.5 text-zinc-950" />
                ) : (
                  <span className="h-3.5 w-3.5" />
                )}
                {option.label}
              </span>
              {typeof option.count === "number" ? (
                <span className="text-xs tabular-nums text-zinc-400">
                  {option.count}
                </span>
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type FilterBarProps = {
  children: React.ReactNode;
  className?: string;
  onReset?: () => void;
  resetLabel?: string;
  showReset?: boolean;
};

/**
 * Horizontal toolbar for SearchField + FilterChip/FilterMenu composition.
 */
export function FilterBar({
  children,
  className,
  onReset,
  resetLabel = "Reset",
  showReset,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center",
        className,
      )}
    >
      {children}
      {showReset && onReset ? (
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          {resetLabel}
        </Button>
      ) : null}
    </div>
  );
}
