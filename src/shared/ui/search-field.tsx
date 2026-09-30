"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export type SearchFieldProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> & {
  value: string;
  onValueChange: (value: string) => void;
  onClear?: () => void;
  clearLabel?: string;
  containerClassName?: string;
  /**
   * `minimal` = premium Soft Light shell (soft fill + lift, no heavy chrome);
   * `hero` = large borderless pill with a colourful search badge (dashboard header).
   */
  variant?: "default" | "minimal" | "hero";
  trailing?: React.ReactNode;
};

/**
 * Reusable Soft Light search field — use on any list/screen.
 */
export function SearchField({
  value,
  onValueChange,
  onClear,
  clearLabel = "Clear search",
  className,
  containerClassName,
  placeholder = "Search…",
  variant = "default",
  trailing,
  ...props
}: SearchFieldProps) {
  const minimal = variant === "minimal";
  const hero = variant === "hero";

  return (
    <div
      className={cn(
        "group/search relative flex w-full items-center",
        minimal &&
          "max-w-xl gap-0 rounded-[18px] border border-zinc-900/[0.06] bg-white/90 p-1 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-sm transition-all duration-300 hover:border-zinc-900/[0.1] hover:shadow-[0_12px_36px_-18px_rgba(15,23,42,0.22)] focus-within:border-zinc-900/15 focus-within:shadow-[0_14px_40px_-18px_rgba(15,23,42,0.28)] focus-within:-translate-y-px",
        hero &&
          "gap-1 rounded-full bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-22px_rgba(15,23,42,0.28)] transition-all duration-300 hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_22px_48px_-22px_rgba(15,23,42,0.34)] focus-within:shadow-[0_0_0_4px_rgba(14,165,233,0.12),0_22px_48px_-22px_rgba(14,165,233,0.35)]",
        !minimal && !hero && "max-w-md gap-1",
        containerClassName,
      )}
    >
      <div className="relative flex min-w-0 flex-1 items-center">
        {hero ? (
          <span className="pointer-events-none flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-[0_10px_20px_-10px_rgba(79,70,229,0.7)]">
            <Search className="h-5 w-5" strokeWidth={2.25} />
          </span>
        ) : (
          <Search
            className={cn(
              "pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-colors duration-300",
              minimal && "group-focus-within/search:text-zinc-700",
            )}
            strokeWidth={1.75}
          />
        )}
        <input
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-400",
            minimal && "h-11 rounded-[14px] border-0 pe-10 ps-10 shadow-none",
            hero && "h-11 border-0 pe-10 ps-3.5 text-[15px] font-medium shadow-none placeholder:font-normal",
            !minimal &&
              !hero &&
              "flex h-11 rounded-2xl border border-zinc-200/80 bg-white px-4 py-2 ps-10 pe-10 shadow-sm transition-all focus-visible:border-zinc-300 focus-visible:ring-2 focus-visible:ring-zinc-900/10",
            className,
          )}
          {...props}
        />
        {value.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              onValueChange("");
              onClear?.();
            }}
            aria-label={clearLabel}
            className={cn(
              "absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-zinc-400 transition-all duration-300 hover:bg-zinc-100 hover:text-zinc-700",
              hero ? "rounded-full" : "rounded-xl",
            )}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ) : null}
      </div>
      {trailing ? (
        <div
          className={cn(
            minimal && "me-0.5 flex shrink-0 items-center border-s border-zinc-900/[0.06] ps-0.5",
            hero && "flex shrink-0 items-center",
          )}
        >
          {trailing}
        </div>
      ) : null}
    </div>
  );
}
