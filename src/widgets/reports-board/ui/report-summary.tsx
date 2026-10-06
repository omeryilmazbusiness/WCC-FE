"use client";

import { useLocale, useTranslations } from "next-intl";
import { metricLook, num, summaryCurrency, type ReportResult, type ReportSpec } from "@/entities/report";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { StatTile } from "@/shared/ui";
import { useFormatMetric } from "./metric-value";

type Props = { spec: ReportSpec; result: ReportResult; dimmed?: boolean };

/** Headline figures of the report as big-icon tiles. */
export function ReportSummary({ spec, result, dimmed }: Props) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const format = useFormatMetric();
  const currency = summaryCurrency(result);
  const mixed = spec.summary.some((s) => s.format === "money") && !currency && num(result.summary.currencies) !== null && (num(result.summary.currencies) ?? 0) > 1;

  return (
    <div
      className={cn("grid gap-3.5 sm:grid-cols-2", spec.summary.length >= 4 ? "xl:grid-cols-4" : "xl:grid-cols-3", dimmed && "opacity-60 transition-opacity")}
      data-testid="rp-summary"
    >
      {spec.summary.map((s) => {
        const look = metricLook(s.key);
        const unsummable = s.format === "money" && mixed;
        const caption =
          unsummable
            ? t("mixedCurrencies", { count: num(result.summary.currencies) ?? 0, formatted: formatNumber(num(result.summary.currencies) ?? 0, locale) })
            : s.captionKey && num(result.summary[s.captionKey]) !== null
              ? t(`caption.${s.captionKey}`, { count: num(result.summary[s.captionKey]) ?? 0, formatted: formatNumber(num(result.summary[s.captionKey]) ?? 0, locale) })
              : undefined;
        return (
          <StatTile
            key={s.key}
            icon={look.icon}
            tone={look.tone}
            label={t(`metrics.${s.key}`)}
            value={unsummable ? "—" : (format(result.summary[s.key], s.format, { currency, compact: true }) ?? "—")}
            caption={caption}
            data-testid="rp-stat"
          />
        );
      })}
    </div>
  );
}
