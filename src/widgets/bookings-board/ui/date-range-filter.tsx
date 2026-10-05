"use client";

import { useLocale, useTranslations } from "next-intl";
import { CalendarRange, X } from "lucide-react";
import { BOOKING_DATE_FIELDS, type BookingDateField } from "@/entities/booking";
import { cn } from "@/shared/lib/cn";
import { formatDay } from "@/shared/lib/format";
import { Input, Popover, PopoverContent, PopoverTrigger, SegmentedControl } from "@/shared/ui";

type Props = {
  field: BookingDateField;
  from: string;
  to: string;
  onChange: (next: { field: BookingDateField; from: string; to: string }) => void;
};

/** Created / departure / return date range in a popover next to the search bar. */
export function DateRangeFilter({ field, from, to, onChange }: Props) {
  const t = useTranslations("bookingWorkspace");
  const locale = useLocale();
  const active = Boolean(from || to);
  const label = active
    ? `${t(`dateField.${field}`)}: ${from ? formatDay(from, locale) : "…"} – ${to ? formatDay(to, locale) : "…"}`
    : t("list.dateRange");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="booking-date-filter"
          className={cn(
            "inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl border px-4 text-[13.5px] font-semibold transition",
            active ? "border-zinc-900 bg-zinc-950 text-white" : "border-zinc-200/80 bg-white text-zinc-700 hover:bg-zinc-50",
          )}
        >
          <CalendarRange className="h-[18px] w-[18px]" aria-hidden />
          <span className="max-w-[220px] truncate">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] space-y-3 p-4">
        <SegmentedControl<BookingDateField>
          value={field}
          onChange={(f) => onChange({ field: f, from, to })}
          aria-label={t("dateField.label")}
          options={BOOKING_DATE_FIELDS.map((f) => ({ value: f, label: t(`dateField.${f}`) }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-[12px] font-semibold text-zinc-500">
            {t("list.from")}
            <Input type="date" value={from} max={to || undefined} onChange={(e) => onChange({ field, from: e.target.value, to })} />
          </label>
          <label className="space-y-1 text-[12px] font-semibold text-zinc-500">
            {t("list.to")}
            <Input type="date" value={to} min={from || undefined} onChange={(e) => onChange({ field, from, to: e.target.value })} />
          </label>
        </div>
        {active ? (
          <button
            type="button"
            onClick={() => onChange({ field, from: "", to: "" })}
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-rose-600 hover:underline"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            {t("list.clearDates")}
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
