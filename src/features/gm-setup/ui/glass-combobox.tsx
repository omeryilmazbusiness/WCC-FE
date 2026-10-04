"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { buildSearchIndex, searchOptions, type GeoOption } from "@/entities/geo";
import { cn } from "@/shared/lib/cn";

/** Rendered rows; typing narrows larger lists, so the DOM stays small. */
const VISIBLE_LIMIT = 100;

type Props = {
  id: string;
  value: string;
  options: readonly GeoOption[];
  onChange: (value: string) => void;
  placeholder: string;
  invalid?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** Shown instead of options (e.g. a load failure); `onRetry` adds a retry action. */
  status?: string;
  onRetry?: () => void;
  retryLabel?: string;
  noMatches: string;
  moreMatches: (count: number) => string;
  /** Options listed before typing (best-ranked first); the rest are found by typing. */
  suggest?: number;
  /** Hint under the suggestions when typing reaches more options (`count` = all options). */
  typeToSearch?: (count: number) => string;
};

type Rect = { left: number; top: number; width: number; maxHeight: number };

/**
 * Searchable single-choice picker (WAI-ARIA combobox) for long lists: only listed
 * options can be chosen. The list is portalled so clipped containers do not cut it.
 */
export function GlassCombobox({
  id,
  value,
  options,
  onChange,
  placeholder,
  invalid,
  disabled,
  loading,
  status,
  onRetry,
  retryLabel,
  noMatches,
  moreMatches,
  suggest = VISIBLE_LIMIT,
  typeToSearch,
}: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const index = useMemo(() => buildSearchIndex(options), [options]);
  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);
  const { options: found, total } = useMemo(
    () => (open ? searchOptions(index, query, VISIBLE_LIMIT, suggest) : { options: [], total: 0 }),
    [open, index, query, suggest],
  );
  const matches = useMemo(
    () => (open && !query && selected && !found.includes(selected) ? [selected, ...found] : found),
    [open, query, selected, found],
  );

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const box = inputRef.current?.getBoundingClientRect();
      if (!box) return;
      const below = window.innerHeight - box.bottom - 12;
      setRect({ left: box.left, top: box.bottom + 6, width: box.width, maxHeight: Math.max(160, Math.min(320, below)) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const at = matches.findIndex((o) => o.value === value);
    setActive(query ? 0 : Math.max(0, at));
  }, [open, query, matches, value]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function choose(option: GeoOption) {
    close();
    if (option.value !== value) onChange(option.value);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      if (!matches.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      if (open && matches[active]) {
        e.preventDefault();
        choose(matches[active]);
      }
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      close();
    } else if (e.key === "Tab" && open) {
      close();
    }
  }

  const expanded = open && !disabled;
  const rows = status ? [] : matches;

  return (
    <div className="relative flex items-center">
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && rows[active] ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        placeholder={selected?.label ?? placeholder}
        value={open ? query : (selected?.label ?? "")}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onBlur={close}
        onKeyDown={onKeyDown}
        className={cn(
          "h-[46px] w-full bg-transparent pe-7 text-[14px] text-white outline-none placeholder:text-white/40 disabled:cursor-not-allowed disabled:opacity-50",
          open && selected && "placeholder:text-white/70",
          invalid && "text-rose-300",
        )}
        data-testid={`${id}-input`}
      />
      {loading ? (
        <Loader2 className="pointer-events-none absolute end-0 h-4 w-4 animate-spin text-white/60" aria-hidden />
      ) : (
        <ChevronDown
          className={cn("pointer-events-none absolute end-0 h-4 w-4 text-white/45 transition-transform", expanded && "rotate-180")}
          aria-hidden
        />
      )}
      {expanded && rect
        ? createPortal(
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              style={{ left: rect.left, top: rect.top, width: rect.width, maxHeight: rect.maxHeight }}
              className="fixed z-[100] overflow-auto rounded-[14px] border border-white/10 bg-zinc-900/95 p-1 text-[14px] text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl"
              onMouseDown={(e) => e.preventDefault()}
              data-testid={`${id}-options`}
            >
              {rows.map((option, i) => (
                <li
                  key={option.value}
                  id={`${listId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => choose(option)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-[10px] px-3 py-2",
                    i === active && "bg-white/10",
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value ? <Check className="h-4 w-4 shrink-0 text-sky-300" aria-hidden /> : null}
                </li>
              ))}
              {status ? (
                <li role="presentation" className="flex items-center justify-between gap-2 px-3 py-2.5 text-white/60">
                  <span>{status}</span>
                  {onRetry && retryLabel ? (
                    <button type="button" className="font-semibold text-sky-300 hover:text-sky-200" onClick={onRetry}>
                      {retryLabel}
                    </button>
                  ) : null}
                </li>
              ) : rows.length === 0 && !loading ? (
                <li role="presentation" className="px-3 py-2.5 text-white/60">
                  {noMatches}
                </li>
              ) : total > rows.length ? (
                <li role="presentation" className="px-3 py-2 text-[12px] text-white/45">
                  {!query && typeToSearch ? typeToSearch(total) : moreMatches(total - rows.length)}
                </li>
              ) : null}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
