"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowDownRight, ArrowUpRight, Minus, Plus } from "lucide-react";
import {
  CurrencyPairBadge,
  formatFxRate,
  freshness,
  daysBetween,
  trendValues,
  type FxFreshness,
  type FxPairSnapshot,
} from "@/entities/fx";
import { Can } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";
import { formatPercent } from "@/shared/lib/format";
import { IconButton, Sparkline } from "@/shared/ui";

const FRESHNESS_DOT: Record<FxFreshness, string> = {
  today: "bg-emerald-500",
  recent: "bg-sky-500",
  stale: "bg-amber-500",
};

type Props = {
  snapshot: FxPairSnapshot;
  today: string;
  currencyName: (code: string) => string;
  selected: boolean;
  onSelect: () => void;
  onAddToday: () => void;
};

/** Latest rate for one pair: big figure, change vs. the previous rate, trend and freshness. */
export function PairCard({ snapshot, today, currencyName, selected, onSelect, onAddToday }: Props) {
  const t = useTranslations("fx.pairs");
  const locale = useLocale();
  const { base, quote, latest, changeBps, trend } = snapshot;
  const state = freshness(latest.effectiveDate, today);
  const days = Math.max(0, daysBetween(latest.effectiveDate, today));
  const direction = changeBps === null ? null : changeBps > 0 ? "up" : changeBps < 0 ? "down" : "flat";
  const DirectionIcon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const pair = `${base}/${quote}`;

  return (
    <article
      className={cn(
        "group relative flex min-w-0 flex-col gap-4 rounded-[28px] border bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-26px_rgba(15,23,42,0.45)]",
        selected ? "border-zinc-900 ring-1 ring-zinc-900" : "border-zinc-200/70",
      )}
      data-testid="fx-pair-card"
    >
      <div className="flex items-start gap-3">
        <CurrencyPairBadge base={base} quote={quote} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold tracking-tight text-zinc-950">
            <button
              type="button"
              onClick={onSelect}
              aria-pressed={selected}
              aria-label={t("showHistory", { pair })}
              className="text-start after:absolute after:inset-0 after:rounded-[28px] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[var(--ring)]"
            >
              <bdi dir="ltr">{pair}</bdi>
            </button>
          </h3>
          <p className="truncate text-[12px] text-zinc-500">
            {currencyName(base)} · {currencyName(quote)}
          </p>
        </div>
        {state !== "today" ? (
          <Can perm="fx.manage">
            <IconButton
              label={t("addToday", { pair })}
              title={t("addToday", { pair })}
              variant="ghost"
              onClick={onAddToday}
              className="relative z-10 -me-1 -mt-1 h-9 w-9 rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white"
              data-testid="fx-pair-add-today"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
            </IconButton>
          </Can>
        ) : null}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[28px] font-semibold leading-none tracking-tight tabular-nums text-zinc-950" dir="ltr" title={latest.rate}>
            {formatFxRate(latest.rate)}
          </p>
          <p className="mt-1.5 truncate text-[12px] font-medium text-zinc-400">{t("perUnit", { base, quote })}</p>
        </div>
        <Sparkline
          values={trendValues(trend)}
          width={72}
          height={32}
          className={cn(
            "shrink-0",
            direction === "up" ? "text-emerald-500" : direction === "down" ? "text-rose-500" : "text-zinc-400",
          )}
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="flex min-w-0 items-center gap-1.5 font-medium text-zinc-500">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", FRESHNESS_DOT[state])} aria-hidden />
          <span className="shrink-0">{state === "today" ? t("today") : t("daysAgo", { days })}</span>
          {latest.source ? <span className="min-w-0 truncate text-zinc-400">· {latest.source}</span> : null}
        </span>
        {direction ? (
          <span
            className={cn(
              "flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold tabular-nums",
              direction === "up" && "bg-emerald-50 text-emerald-700",
              direction === "down" && "bg-rose-50 text-rose-700",
              direction === "flat" && "bg-zinc-100 text-zinc-500",
            )}
            title={t("changeHint")}
          >
            <DirectionIcon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
            <span className="sr-only">{t(`direction.${direction}`)}</span>
            <bdi dir="ltr">{formatPercent(Math.abs(changeBps ?? 0) / 100, locale, 2)}</bdi>
          </span>
        ) : (
          <span className="shrink-0 text-zinc-400">{t("firstRate")}</span>
        )}
      </div>
    </article>
  );
}
