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
  /** `minimal` = premium Soft Light shell (soft fill + lift, no heavy chrome) */
  variant?: "default" | "minimal";
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

  return (
    <div
      className={cn(
        "group/search relative flex w-full items-center",
        minimal
          ? "max-w-xl gap-0 rounded-[18px] border border-zinc-900/[0.06] bg-white/90 p-1 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-sm transition-all duration-300 hover:border-zinc-900/[0.1] hover:shadow-[0_12px_36px_-18px_rgba(15,23,42,0.22)] focus-within:border-zinc-900/15 focus-within:shadow-[0_14px_40px_-18px_rgba(15,23,42,0.28)] focus-within:-translate-y-px"
          : "max-w-md gap-1",
        containerClassName,
      )}
    >
      <div className="relative min-w-0 flex-1">
        <Search
          className={cn(
            "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-300",
            minimal
              ? "start-3.5 text-zinc-400 group-focus-within/search:text-zinc-700"
              : "start-3.5 text-zinc-400",
          )}
          strokeWidth={1.75}
        />
        <input
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-400",
            minimal
              ? "h-11 rounded-[14px] border-0 pe-10 ps-10 shadow-none"
              : "flex h-11 rounded-2xl border border-zinc-200/80 bg-white px-4 py-2 ps-10 pe-10 shadow-sm transition-all focus-visible:border-zinc-300 focus-visible:ring-2 focus-visible:ring-zinc-900/10",
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
              "absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-zinc-400 transition-all duration-300 hover:bg-zinc-100 hover:text-zinc-700",
            )}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ) : null}
      </div>
      {trailing ? (
        <div
          className={cn(
            minimal &&
              "me-0.5 flex shrink-0 items-center border-s border-zinc-900/[0.06] ps-0.5",
          )}
        >
          {trailing}
        </div>
      ) : null}
    </div>
  );
}
