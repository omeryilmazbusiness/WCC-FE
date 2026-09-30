"use client";

import { useTranslations } from "next-intl";
import {
  ArrowDownUp,
  CalendarDays,
  CalendarRange,
  History,
  Infinity as InfinityIcon,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { LEAD_SORTS, isLeadSort, type LeadPeriod, type LeadSort } from "@/entities/lead";
import { cn } from "@/shared/lib/cn";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, TONES, type Tone } from "@/shared/ui";

const PERIODS: { value: LeadPeriod; icon: LucideIcon; tone: Tone }[] = [
  { value: "all", icon: InfinityIcon, tone: "indigo" },
  { value: "week", icon: CalendarDays, tone: "sky" },
  { value: "month", icon: CalendarRange, tone: "violet" },
  { value: "quarter", icon: History, tone: "amber" },
];

type Props = {
  period: LeadPeriod;
  onPeriodChange: (period: LeadPeriod) => void;
  sort: LeadSort;
  onSortChange: (sort: LeadSort) => void;
  /** Leads matching every filter; null before the first load. */
  total: number | null;
  locale: string;
  busy: boolean;
};

/** Created-in tabs, the match count and the ordering, right above the board or table. */
export function PipelinePeriodBar({ period, onPeriodChange, sort, onSortChange, total, locale, busy }: Props) {
  const t = useTranslations("pipeline");

  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="pipeline-period-bar">
      <div
        role="tablist"
        aria-label={t("period.label")}
        className="inline-flex rounded-[18px] border border-zinc-200/70 bg-white/80 p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      >
        {PERIODS.map(({ value, icon: Icon, tone }) => {
          const active = value === period;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onPeriodChange(value)}
              data-testid={`pipeline-period-${value}`}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-[14px] pe-3.5 ps-1.5 text-[13px] font-semibold transition-all duration-200",
                active
                  ? "bg-zinc-950 text-white shadow-[0_8px_18px_-10px_rgba(15,23,42,0.7)]"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-[9px]",
                  active ? TONES[tone].gradient : TONES[tone].soft,
                )}
                aria-hidden
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
              </span>
              {t(`period.${value}`)}
            </button>
          );
        })}
      </div>

      <div className="ms-auto flex items-center gap-3">
        <p className="flex items-center gap-2 text-[13px] font-medium text-zinc-500" aria-live="polite" data-testid="pipeline-total">
          {busy ? <Loader2 className="h-4 w-4 animate-spin text-zinc-400" aria-hidden /> : null}
          {total == null ? null : t("period.total", { count: total, formatted: total.toLocaleString(locale) })}
        </p>
        <Select value={sort} onValueChange={(v) => isLeadSort(v) && onSortChange(v)}>
          <SelectTrigger
            className="h-10 w-auto min-w-[11.5rem] gap-2 rounded-[16px] border-zinc-200/70 bg-white/80 text-[13px] font-semibold"
            aria-label={t("sort.label")}
            data-testid="pipeline-sort"
          >
            <span className="flex items-center gap-2">
              <ArrowDownUp className="h-4 w-4 text-zinc-400" aria-hidden />
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent align="end">
            {LEAD_SORTS.map((s) => (
              <SelectItem key={s} value={s} className="text-[13px]">
                {t(`sort.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
