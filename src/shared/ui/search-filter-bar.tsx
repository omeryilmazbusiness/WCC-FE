"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, X } from "lucide-react";
import { activeFilters, defaultOf, type ActiveFilter } from "@/shared/lib/filters";
import { cn } from "@/shared/lib/cn";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { SearchField, type SearchFieldProps } from "@/shared/ui/search-field";

/** Minimalist custom “edit filters” glyph */
export function FilterEditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("h-4 w-4", className)}>
      <path d="M4 7.5h10.5M4 12h7M4 16.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
  /** Value that means "not filtered"; defaults to the first option. */
  defaultValue?: T;
};

type InputProps = Omit<SearchFieldProps, "value" | "onValueChange" | "trailing" | "variant"> & {
  "data-testid"?: string;
};

type SearchFilterBarProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  clearLabel?: string;
  filterLabel?: string;
  resetLabel?: string;
  /** Defaults to putting every section back to its default value. */
  onReset?: () => void;
  /** Defaults to "any section differs from its default". */
  isFiltered?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sections: FilterSection<any>[];
  /** Removable chips for active filters under the field (default on). */
  showActiveChips?: boolean;
  loading?: boolean;
  /** Extra attributes for the input (role, aria-*, key handlers, test ids). */
  inputProps?: InputProps;
  className?: string;
};

/**
 * The search bar for every screen: query field, filter menu and removable chips for
 * whatever is filtered. Works with plain useState or useFilterState.
 */
export function SearchFilterBar({
  value,
  onValueChange,
  placeholder,
  clearLabel,
  filterLabel,
  resetLabel,
  onReset,
  isFiltered,
  sections,
  showActiveChips = true,
  loading = false,
  inputProps,
  className,
}: SearchFilterBarProps) {
  const tc = useTranslations("common");
  const active = activeFilters(sections);
  const filtered = isFiltered ?? active.length > 0;
  const labels = {
    filter: filterLabel ?? tc("filter"),
    reset: resetLabel ?? tc("resetFilters"),
    clear: clearLabel ?? tc("clearSearch"),
  };

  const sectionById = (id: string) => sections.find((s) => s.id === id);
  const clearOne = (f: ActiveFilter) => sectionById(f.sectionId)?.onChange(f.defaultValue);
  const resetAll = onReset ?? (() => sections.forEach((s) => s.value !== defaultOf(s) && s.onChange(defaultOf(s))));

  return (
    <div className={cn("flex w-full flex-col gap-2", className)} data-testid="search-filter-bar">
      <SearchField
        {...inputProps}
        variant="minimal"
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        clearLabel={labels.clear}
        containerClassName={cn("max-w-none", inputProps?.containerClassName)}
        trailing={
          <>
            {loading ? (
              <Loader2 className="me-1 h-4 w-4 shrink-0 animate-spin text-zinc-400" aria-hidden data-testid="search-loading" />
            ) : null}
            {sections.length ? (
              <FilterMenuButton
                sections={sections}
                activeCount={active.length}
                filtered={filtered}
                labels={labels}
                onReset={resetAll}
              />
            ) : null}
          </>
        }
      />
      {showActiveChips && active.length ? (
        <ActiveFilterChips filters={active} onClear={clearOne} onReset={resetAll} resetLabel={labels.reset} />
      ) : null}
    </div>
  );
}

type FilterMenuButtonProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sections: FilterSection<any>[];
  activeCount: number;
  filtered: boolean;
  labels: { filter: string; reset: string };
  onReset: () => void;
};

function FilterMenuButton({ sections, activeCount, filtered, labels, onReset }: FilterMenuButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={labels.filter}
          data-testid="search-filter-trigger"
          className={cn(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-zinc-400 transition-all duration-300 hover:bg-zinc-100 hover:text-zinc-950",
            activeCount > 0 && "bg-zinc-950 text-white hover:bg-zinc-800 hover:text-white",
          )}
        >
          <FilterEditIcon />
          {activeCount > 0 ? (
            <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-[min(100vw-2rem,20rem)] rounded-[22px] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-[13px] font-semibold text-zinc-950">{labels.filter}</p>
          {filtered ? (
            <button
              type="button"
              onClick={onReset}
              className="text-[12px] font-semibold text-zinc-400 transition-colors hover:text-zinc-950"
            >
              {labels.reset}
            </button>
          ) : null}
        </div>
        <div className="h-px bg-zinc-100" />
        <div className="max-h-[22rem] space-y-4 overflow-y-auto px-2 py-3">
          {sections.map((section) => (
            <div key={section.id} className="space-y-1" role="group" aria-label={section.label}>
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{section.label}</p>
              <ul className="space-y-0.5">
                {section.options.map((option) => {
                  const selected = option.value === section.value;
                  return (
                    <li key={option.value}>
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={selected}
                        onClick={() => section.onChange(option.value)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-sm font-medium transition-colors",
                          selected ? "bg-zinc-950 text-white" : "text-zinc-700 hover:bg-zinc-50",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Check className={cn("h-3.5 w-3.5", selected ? "opacity-100" : "opacity-0")} strokeWidth={2} />
                          {option.label}
                        </span>
                        {typeof option.count === "number" ? (
                          <span className={cn("text-[11px] tabular-nums", selected ? "text-white/60" : "text-zinc-400")}>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ActiveFilterChipsProps = {
  filters: ActiveFilter[];
  onClear: (filter: ActiveFilter) => void;
  onReset?: () => void;
  resetLabel?: string;
  className?: string;
};

/** Removable "Label: value" chips; usable on its own next to any filter UI. */
export function ActiveFilterChips({ filters, onClear, onReset, resetLabel, className }: ActiveFilterChipsProps) {
  const tc = useTranslations("common");
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} data-testid="active-filters">
      {filters.map((f) => (
        <span
          key={f.sectionId}
          className="inline-flex h-7 items-center gap-1 rounded-full bg-zinc-950 ps-3 pe-1 text-xs font-semibold text-white"
        >
          <span className="text-white/60">{f.sectionLabel}:</span>
          {f.valueLabel}
          <button
            type="button"
            onClick={() => onClear(f)}
            aria-label={tc("removeFilter", { filter: `${f.sectionLabel}: ${f.valueLabel}` })}
            className="ms-0.5 flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/15"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </span>
      ))}
      {onReset && filters.length > 1 ? (
        <button
          type="button"
          onClick={onReset}
          className="h-7 rounded-full px-2.5 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
        >
          {resetLabel ?? tc("resetFilters")}
        </button>
      ) : null}
    </div>
  );
}
