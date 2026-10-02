"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Infinity as AnyIcon, Moon, Sun, Sunrise, Sunset, X, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui";

type Period = "morning" | "afternoon" | "evening" | "night";

const PERIODS: readonly { id: Period; from: number; icon: LucideIcon; tint: string }[] = [
  { id: "morning", from: 6, icon: Sunrise, tint: "text-amber-500" },
  { id: "afternoon", from: 12, icon: Sun, tint: "text-sky-500" },
  { id: "evening", from: 18, icon: Sunset, tint: "text-rose-500" },
  { id: "night", from: 0, icon: Moon, tint: "text-indigo-500" },
];

const pad = (n: number) => String(n).padStart(2, "0");

/** The twelve half-hour slots of a six-hour period. */
const slotsOf = (from: number) => Array.from({ length: 12 }, (_, i) => `${pad(from + Math.floor(i / 2))}:${i % 2 ? "30" : "00"}`);

function periodOf(time: string): Period {
  const h = Number(time.slice(0, 2));
  if (h < 6) return "night";
  if (h < 12) return "morning";
  return h < 18 ? "afternoon" : "evening";
}

type TimePickerProps = {
  id: string;
  /** `HH:MM`, or "" for any time. */
  value: string;
  invalid?: boolean;
  onChange: (time: string) => void;
};

/** Optional preferred departure: "any time" or a half-hour slot picked from a period. */
export function TimePicker({ id, value, invalid, onChange }: TimePickerProps) {
  const t = useTranslations("flights.form");
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<Period>(() => (value ? periodOf(value) : "morning"));
  const current = PERIODS.find((p) => p.id === period) ?? PERIODS[0];

  function toggle(next: boolean) {
    if (next && value) setPeriod(periodOf(value));
    setOpen(next);
  }

  function choose(time: string) {
    onChange(time);
    setOpen(false);
  }

  return (
    <div className="relative flex w-full items-center">
      <Popover open={open} onOpenChange={toggle} className="flex w-full">
        <PopoverTrigger
          id={id}
          className="flex h-8 w-full items-center gap-2 text-start text-[15px] font-semibold text-zinc-950 focus:outline-none"
          aria-invalid={invalid ? true : undefined}
          data-testid="flight-time"
        >
          {value ? (
            <span dir="ltr" className="min-w-0 flex-1 truncate tabular-nums rtl:text-end">
              {value}
            </span>
          ) : (
            <span className="min-w-0 flex-1 truncate font-medium text-zinc-400">{t("anyTime")}</span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-zinc-400", value && "invisible")} aria-hidden />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[20rem] rounded-[24px] border-white/80 bg-white/95 p-3 shadow-[0_28px_70px_-30px_rgba(15,23,42,0.5)] ring-1 ring-zinc-200/70 backdrop-blur-xl"
          aria-label={t("time")}
          data-testid="flight-time-panel"
        >
          <button
            type="button"
            onClick={() => choose("")}
            aria-pressed={!value}
            data-testid="time-any"
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
              !value ? "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200" : "text-zinc-700 hover:bg-zinc-50",
            )}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm ring-1 ring-zinc-200/70">
              <AnyIcon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{t("anyTime")}</span>
              <span className="block text-xs text-zinc-500">{t("anyTimeHint")}</span>
            </span>
          </button>

          <div role="tablist" aria-label={t("time")} className="mt-3 grid grid-cols-4 gap-1 rounded-2xl bg-zinc-100/80 p-1">
            {PERIODS.map((p) => {
              const active = p.id === period;
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPeriod(p.id)}
                  data-testid={`time-period-${p.id}`}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
                    active ? "bg-white text-zinc-950 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.35)]" : "text-zinc-500 hover:text-zinc-800",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? p.tint : "text-zinc-400")} aria-hidden />
                  {t(`periods.${p.id}`)}
                </button>
              );
            })}
          </div>

          <p dir="ltr" className="mt-3 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400 rtl:text-end">
            {pad(current.from)}:00 – {pad(current.from + 5)}:59
          </p>
          <div role="tabpanel" className="mt-1.5 grid grid-cols-4 gap-1.5">
            {slotsOf(current.from).map((slot) => {
              const selected = slot === value;
              return (
                <button
                  key={slot}
                  type="button"
                  dir="ltr"
                  onClick={() => choose(slot)}
                  aria-pressed={selected}
                  data-testid="time-slot"
                  data-time={slot}
                  className={cn(
                    "h-10 rounded-xl text-sm font-semibold tabular-nums transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
                    selected
                      ? "bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-[0_10px_20px_-10px_rgba(79,70,229,0.75)]"
                      : "bg-zinc-50 text-zinc-800 ring-1 ring-inset ring-zinc-200/70 hover:bg-sky-50 hover:text-sky-700 hover:ring-sky-200",
                  )}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("clearTime")}
          title={t("clearTime")}
          data-testid="flight-time-clear"
          className="absolute end-0 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-zinc-200/80 text-zinc-600 transition-colors hover:bg-zinc-300 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
