"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, covers, type Allotment, type StopSale } from "@/entities/hotel";
import { cn } from "@/shared/lib/cn";
import { toIntlLocale } from "@/shared/lib/format";

type Props = {
  today: string;
  stopSales: readonly StopSale[];
  allotments: readonly Allotment[];
  /** Day click (write access only). */
  onPick?: (day: string) => void;
};

function monthStart(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 10);
}

/** Month grid: red days are closed for sale, green underline means an open room block. */
export function StopSaleCalendar({ today, stopSales, allotments, onPick }: Props) {
  const t = useTranslations("hotels.stopSale");
  const locale = useLocale();
  const [month, setMonth] = useState(() => monthStart(today));
  const weekStart = locale === "ar" ? 0 : 1;

  const { days, title, weekdays, dayLabel } = useMemo(() => {
    const first = new Date(`${month}T00:00:00Z`);
    const lead = (first.getUTCDay() - weekStart + 7) % 7;
    const next = shiftMonth(month, 1);
    const cells: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = month; d < next; d = addDays(d, 1)) cells.push(d);
    const fmt = new Intl.DateTimeFormat(toIntlLocale(locale), { month: "long", year: "numeric", timeZone: "UTC" });
    const wd = new Intl.DateTimeFormat(toIntlLocale(locale), { weekday: "narrow", timeZone: "UTC" });
    const names = Array.from({ length: 7 }, (_, i) => wd.format(new Date(Date.UTC(2024, 0, 7 + ((weekStart + i) % 7)))));
    const full = new Intl.DateTimeFormat(toIntlLocale(locale), { dateStyle: "full", timeZone: "UTC" });
    return { days: cells, title: fmt.format(first), weekdays: names, dayLabel: (d: string) => full.format(new Date(`${d}T00:00:00Z`)) };
  }, [month, locale, weekStart]);

  const closed = (day: string) => stopSales.filter((s) => covers(s.startDate, s.endDate, day));
  const blocked = (day: string) => allotments.some((a) => a.status !== "expired" && covers(a.startDate, a.endDate, day));

  return (
    <div data-testid="stop-sale-calendar">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => setMonth((m) => shiftMonth(m, -1))} className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200" aria-label={t("prevMonth")}>
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        </button>
        <p className="text-[14px] font-semibold capitalize text-zinc-900">{title}</p>
        <button type="button" onClick={() => setMonth((m) => shiftMonth(m, 1))} className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200" aria-label={t("nextMonth")}>
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-zinc-400">
        {weekdays.map((w, i) => (
          <span key={i} className="py-1">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <span key={`pad-${i}`} />;
          const stops = closed(day);
          const all = stops.some((s) => s.roomType === "");
          const some = stops.length > 0 && !all;
          const isToday = day === today;
          const past = day < today;
          const label = stops.length ? `${dayLabel(day)} · ${t("closedDay")}` : dayLabel(day);
          return (
            <button
              key={day}
              type="button"
              disabled={!onPick || past}
              onClick={() => onPick?.(day)}
              aria-label={label}
              title={stops.map((s) => s.reason).filter(Boolean).join(" · ") || undefined}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-xl text-[13px] font-semibold tabular-nums transition",
                all ? "bg-rose-500 text-white" : some ? "bg-rose-100 text-rose-800" : "bg-zinc-50 text-zinc-700",
                past && "opacity-45",
                onPick && !past && !all && "hover:bg-zinc-100",
                isToday && "ring-2 ring-zinc-950 ring-offset-1",
              )}
              data-day={day}
            >
              {Number(day.slice(8))}
              {blocked(day) ? <span className={cn("absolute bottom-1 h-1 w-4 rounded-full", all ? "bg-white/80" : "bg-emerald-500")} aria-hidden /> : null}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11.5px] font-medium text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-rose-500" aria-hidden />
          {t("legendAll")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-rose-100" aria-hidden />
          {t("legendSome")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1 w-4 rounded-full bg-emerald-500" aria-hidden />
          {t("legendBlock")}
        </span>
      </div>
    </div>
  );
}
