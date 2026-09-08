"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { SearchField } from "@/shared/ui/search-field";
import { Button } from "@/shared/ui/button";

/** Minimalist custom “edit filters” glyph */
export function FilterEditIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("h-4 w-4", className)}
    >
      <path
        d="M4 7.5h10.5M4 12h7M4 16.5h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M15.2 15.1l4.1-4.1a1.15 1.15 0 0 1 1.63 1.63l-4.1 4.1-2.05.42.42-2.05Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type FilterSectionOption<T extends string = string> = {
  value: T;
  label: string;
  count?: number;
};

export type FilterSection<T extends string = string> = {
  id: string;
  label: string;
  value: T;
  options: FilterSectionOption<T>[];
  onChange: (value: T) => void;
};

type SearchFilterBarProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  clearLabel?: string;
  filterLabel?: string;
  resetLabel?: string;
  onReset?: () => void;
  isFiltered?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sections: FilterSection<any>[];
  className?: string;
};

/**
 * Frameless search + edit-filter trigger.
 * One pattern for every list screen — do not rebuild per page.
 */
export function SearchFilterBar({
  value,
  onValueChange,
  placeholder,
  clearLabel,
  filterLabel = "Filters",
  resetLabel = "Reset",
  onReset,
  isFiltered,
  sections,
  className,
}: SearchFilterBarProps) {
  const activeCount = sections.reduce((n, section) => {
    const first = section.options[0]?.value;
    return n + (first != null && section.value !== first ? 1 : 0);
  }, 0);

  return (
    <SearchField
      variant="minimal"
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      clearLabel={clearLabel}
      containerClassName={cn("max-w-none", className)}
      trailing={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={filterLabel}
              className={cn(
                "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-zinc-400 transition-all duration-300 hover:bg-zinc-100 hover:text-zinc-950",
                activeCount > 0 && "bg-zinc-950 text-white hover:bg-zinc-800 hover:text-white",
              )}
            >
              <FilterEditIcon />
              {activeCount > 0 ? (
                <span className="absolute end-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-white" />
              ) : null}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={10}
            className="w-[min(100vw-2rem,20rem)] rounded-[22px] p-0"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-[13px] font-semibold text-zinc-950">
                {filterLabel}
              </p>
              {isFiltered && onReset ? (
                <button
                  type="button"
                  onClick={onReset}
                  className="text-[12px] font-semibold text-zinc-400 transition-colors hover:text-zinc-950"
                >
                  {resetLabel}
                </button>
              ) : null}
            </div>
            <div className="h-px bg-zinc-100" />
            <div className="max-h-[22rem] space-y-4 overflow-y-auto px-2 py-3">
              {sections.map((section) => (
                <div key={section.id} className="space-y-1">
                  <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    {section.label}
                  </p>
                  <ul className="space-y-0.5">
                    {section.options.map((option) => {
                      const selected = option.value === section.value;
                      return (
                        <li key={option.value}>
                          <button
                            type="button"
                            onClick={() => section.onChange(option.value)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-sm font-medium transition-colors",
                              selected
                                ? "bg-zinc-950 text-white"
                                : "text-zinc-700 hover:bg-zinc-50",
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <Check
                                className={cn(
                                  "h-3.5 w-3.5",
                                  selected ? "opacity-100" : "opacity-0",
                                )}
                                strokeWidth={2}
                              />
                              {option.label}
                            </span>
                            {typeof option.count === "number" ? (
                              <span
                                className={cn(
                                  "text-[11px] tabular-nums",
                                  selected ? "text-white/60" : "text-zinc-400",
                                )}
                              >
                                {option.count}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
            {isFiltered && onReset ? (
              <>
                <div className="h-px bg-zinc-100" />
                <div className="p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 w-full justify-center text-zinc-500"
                    onClick={onReset}
                  >
                    {resetLabel}
                  </Button>
                </div>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
}
