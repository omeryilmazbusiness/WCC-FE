"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useHydrated } from "@/shared/lib/use-hydrated";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui";
import { addDays, localDay } from "../model/search-form";

const toDate = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function addMonths(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const last = new Date(y, m - 1 + n + 1, 0).getDate();
  return localDay(new Date(y, m - 1 + n, Math.min(d, last)));
}

const clamp = (day: string, min: string, max: string) => (day < min ? min : day > max ? max : day);
const monthKey = (day: string) => day.slice(0, 7);

/** Weeks of the month as `YYYY-MM-DD`, padded with nulls so each day lands on its weekday column. */
function monthWeeks(month: string, weekStart: number): (string | null)[][] {
  const first = toDate(`${month}-01`);
  const offset = (first.getDay() - weekStart + 7) % 7;
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

type DatePickerProps = {
  id: string;
  value: string;
  min: string;
  max: string;
  locale: string;
  invalid?: boolean;
  onChange: (day: string) => void;
};

/** Calendar popover (WAI-ARIA grid): arrows move by day/week, PageUp/PageDown by month, Home/End to the week's edges. */
export function DatePicker({ id, value, min, max, locale, invalid, onChange }: DatePickerProps) {
  const t = useTranslations("flights.form.calendar");
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(() => clamp(value || min, min, max));
  const gridRef = useRef<HTMLDivElement>(null);
  const hydrated = useHydrated();
  const rtl = locale === "ar";
  const weekStart = rtl ? 6 : 1;
  const today = localDay(new Date());

  const fmt = useMemo(
    () => ({
      trigger: new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
      month: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }),
      weekday: new Intl.DateTimeFormat(locale, { weekday: "short" }),
      day: new Intl.DateTimeFormat(locale, { day: "numeric" }),
      full: new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    }),
    [locale],
  );

  const weekdays = useMemo(() => {
    // 2024-01-01 is a Monday.
    const base = new Date(2024, 0, 1 + ((weekStart - 1 + 7) % 7));
    return Array.from({ length: 7 }, (_, i) => fmt.weekday.format(new Date(base.getFullYear(), 0, base.getDate() + i)));
  }, [fmt, weekStart]);

  const month = monthKey(focus);
  const weeks = useMemo(() => monthWeeks(month, weekStart), [month, weekStart]);

  function toggle(next: boolean) {
    if (next) setFocus(clamp(value || min, min, max));
    setOpen(next);
  }

  useEffect(() => {
    if (!open) return;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus({ preventScroll: true });
  }, [open, focus]);

  function choose(day: string) {
    onChange(day);
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step: Record<string, () => string> = {
      ArrowLeft: () => addDays(focus, rtl ? 1 : -1),
      ArrowRight: () => addDays(focus, rtl ? -1 : 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      PageUp: () => addMonths(focus, -1),
      PageDown: () => addMonths(focus, 1),
      Home: () => addDays(focus, -((toDate(focus).getDay() - weekStart + 7) % 7)),
      End: () => addDays(focus, 6 - ((toDate(focus).getDay() - weekStart + 7) % 7)),
    };
    const next = step[e.key];
    if (!next) return;
    e.preventDefault();
    setFocus(clamp(next(), min, max));
  }

  const canPrev = monthKey(min) < month;
  const canNext = monthKey(max) > month;
  const quick = [
    { label: t("today"), day: today },
    { label: t("tomorrow"), day: addDays(today, 1) },
    { label: t("nextWeek"), day: addDays(today, 7) },
  ].filter((q) => q.day >= min && q.day <= max);

  const Prev = rtl ? ChevronRight : ChevronLeft;
  const Next = rtl ? ChevronLeft : ChevronRight;
  const navButton =
    "inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:pointer-events-none disabled:opacity-30";

  return (
    <Popover open={open} onOpenChange={toggle} className="flex w-full">
      <PopoverTrigger
        id={id}
        className="flex h-8 w-full items-center gap-2 text-start text-[15px] font-semibold text-zinc-950 focus:outline-none"
        aria-invalid={invalid ? true : undefined}
        aria-label={hydrated && value ? fmt.full.format(toDate(value)) : undefined}
        data-testid="flight-date"
      >
        {hydrated ? (
          <span className="min-w-0 flex-1 truncate">{value ? fmt.trigger.format(toDate(value)) : "—"}</span>
        ) : (
          <span className="h-3.5 flex-1 animate-pulse rounded-full bg-zinc-200/80" aria-hidden />
        )}
        <ChevronDown className="h-4 w-4 text-zinc-400" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[19.5rem] rounded-[24px] border-white/80 bg-white/95 p-3 shadow-[0_28px_70px_-30px_rgba(15,23,42,0.5)] ring-1 ring-zinc-200/70 backdrop-blur-xl"
        aria-label={t("choose")}
        data-testid="flight-calendar"
      >
        <div className="flex items-center justify-between px-1 pb-2">
          <button type="button" className={navButton} disabled={!canPrev} onClick={() => setFocus(clamp(addMonths(focus, -1), min, max))} aria-label={t("prevMonth")}>
            <Prev className="h-4 w-4" aria-hidden />
          </button>
          <p className="text-[15px] font-semibold tracking-tight text-zinc-950" aria-live="polite">
            {fmt.month.format(toDate(`${month}-01`))}
          </p>
          <button type="button" className={navButton} disabled={!canNext} onClick={() => setFocus(clamp(addMonths(focus, 1), min, max))} aria-label={t("nextMonth")}>
            <Next className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div role="grid" aria-label={fmt.month.format(toDate(`${month}-01`))} ref={gridRef} onKeyDown={onKeyDown}>
          <div role="row" className="grid grid-cols-7 pb-1">
            {weekdays.map((w) => (
              <span key={w} role="columnheader" className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                {w}
              </span>
            ))}
          </div>
          <div className="space-y-1">
            {weeks.map((week, w) => (
              <div key={w} role="row" className="grid grid-cols-7">
                {week.map((day, i) => {
                  if (!day) return <span key={`pad-${i}`} role="gridcell" />;
                  const disabled = day < min || day > max;
                  const selected = day === value;
                  const isToday = day === today;
                  return (
                    <span key={day} role="gridcell" aria-selected={selected} className="flex justify-center">
                      <button
                        type="button"
                        data-day={day}
                        data-testid="calendar-day"
                        tabIndex={day === focus ? 0 : -1}
                        disabled={disabled}
                        aria-label={fmt.full.format(toDate(day))}
                        aria-current={isToday ? "date" : undefined}
                        onClick={() => choose(day)}
                        onFocus={() => setFocus(day)}
                        className={cn(
                          "relative inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium tabular-nums transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
                          selected
                            ? "bg-gradient-to-br from-sky-500 to-indigo-600 font-semibold text-white shadow-[0_10px_20px_-10px_rgba(79,70,229,0.75)]"
                            : "text-zinc-800 hover:bg-sky-50 hover:text-sky-700",
                          isToday && !selected && "font-bold text-sky-600 ring-1 ring-inset ring-sky-200",
                          disabled && "cursor-not-allowed text-zinc-300 hover:bg-transparent hover:text-zinc-300",
                        )}
                      >
                        {fmt.day.format(toDate(day))}
                      </button>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {quick.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-zinc-100 pt-3">
            {quick.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => choose(q.day)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
                  q.day === value ? "bg-sky-500 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-sky-50 hover:text-sky-700",
                )}
              >
                {q.label}
              </button>
            ))}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
