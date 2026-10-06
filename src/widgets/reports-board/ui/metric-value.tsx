"use client";

import { Check, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { bpsToPercent, num, statusTone, type ColumnSpec, type MetricFormat } from "@/entities/report";
import { cn } from "@/shared/lib/cn";
import { formatDateTime, formatMoney, formatMoneyShort, formatNumber } from "@/shared/lib/format";
import { TONES } from "@/shared/ui";

/** Plain-text rendering shared by tiles and cells; null when the value is missing. */
export function useFormatMetric() {
  const locale = useLocale();
  const tReports = useTranslations("reports");
  const tBooking = useTranslations("bookings.status");

  return function format(value: unknown, fmt: MetricFormat, opts: { currency?: string | null; compact?: boolean } = {}): string | null {
    if (value == null || value === "") return null;
    const n = num(value);
    switch (fmt) {
      case "int":
        return n === null ? null : formatNumber(n, locale);
      case "money":
        if (n === null) return null;
        if (opts.currency) return opts.compact ? formatMoneyShort(n, locale, opts.currency) : formatMoney(n, locale, opts.currency);
        return formatNumber(n / 100, locale, { maximumFractionDigits: opts.compact ? 0 : 2 });
      case "amount":
        return n === null ? null : formatNumber(n / 100, locale, { maximumFractionDigits: opts.compact ? 0 : 2 });
      case "bps":
        return n === null ? null : formatNumber(bpsToPercent(n) / 100, locale, { style: "percent", maximumFractionDigits: 1 });
      case "hours":
        return n === null ? null : tReports("hours", { formatted: formatNumber(n, locale, { maximumFractionDigits: 1 }) });
      case "bool":
        return value === true || value === "true" ? tReports("yes") : tReports("no");
      case "datetime":
        return formatDateTime(String(value), locale);
      case "status": {
        const s = String(value);
        return tReports.has(`statusValue.${s}`) ? tReports(`statusValue.${s}`) : s.replace(/_/g, " ");
      }
      case "bookingStatus": {
        const s = String(value);
        return tBooking.has(s) ? tBooking(s) : s.replace(/_/g, " ");
      }
      case "text": {
        const s = String(value);
        return tReports.has(`textValue.${s}`) ? tReports(`textValue.${s}`) : s.replace(/_/g, " ");
      }
      default:
        return String(value);
    }
  };
}

type CellProps = { column: ColumnSpec; value: unknown; currency?: string | null; dashZero?: boolean };

/** Table cell with the column's visual treatment (bar, pill, icon, warning tint). */
export function MetricCell({ column, value, currency, dashZero }: CellProps) {
  const format = useFormatMetric();
  const n = num(value);

  if (dashZero && (n === 0 || value == null)) return <Dash />;
  const text = format(value, column.format, { currency });
  if (text === null) return <Dash />;

  switch (column.format) {
    case "bps": {
      const pct = Math.max(0, Math.min(100, bpsToPercent(n ?? 0)));
      const tone = column.inverse ? (pct >= 20 ? "rose" : pct >= 5 ? "amber" : "emerald") : pct >= 66 ? "emerald" : pct >= 33 ? "sky" : "amber";
      return (
        <span className="flex min-w-[112px] items-center gap-2.5">
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100" aria-hidden>
            <span className={cn("block h-full rounded-full", TONES[tone].dot)} style={{ width: `${pct}%` }} />
          </span>
          <span className="font-semibold tabular-nums text-zinc-900">{text}</span>
        </span>
      );
    }
    case "bool": {
      const yes = value === true || value === "true";
      return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold", yes ? TONES.emerald.soft : TONES.rose.soft)}>
          {yes ? <Check className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden /> : <X className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden />}
          {text}
        </span>
      );
    }
    case "status":
      return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold", TONES[statusTone(String(value))].soft)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", TONES[statusTone(String(value))].dot)} aria-hidden />
          {text}
        </span>
      );
    case "bookingStatus":
      return <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-[12px] font-semibold text-zinc-700">{text}</span>;
    case "code":
      return (
        <bdi dir="ltr" className="font-mono text-[12px] text-zinc-500">
          {text}
        </bdi>
      );
    default: {
      const warn = column.warnAbove !== undefined && n !== null && n > column.warnAbove;
      const negative = column.format === "money" && n !== null && n < 0;
      return (
        <span className={cn("tabular-nums", warn ? "font-semibold text-amber-700" : negative ? "font-semibold text-rose-600" : "text-zinc-700")}>
          {text}
        </span>
      );
    }
  }
}

function Dash() {
  return <span className="text-zinc-300">—</span>;
}
