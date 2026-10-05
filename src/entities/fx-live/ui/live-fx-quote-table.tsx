"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDate, toIntlLocale } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";
import { currencySymbol } from "@/shared/lib/money";
import { formatRate } from "../lib/decimal";
import { quoteBadges, type FxLiveKind, type FxLiveQuote } from "../model";

type Props = {
  quotes: readonly FxLiveQuote[];
  kind: FxLiveKind;
  /** Accessible list name. */
  caption: string;
  renderAction?: (quote: FxLiveQuote) => React.ReactNode;
  /** Decimal places for rates ≥ 1. */
  decimals?: number;
  className?: string;
};

export function useCurrencyName(): (code: string) => string {
  const locale = useLocale();
  return useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames(toIntlLocale(locale), { type: "currency" });
    } catch {
      names = null;
    }
    return (code: string) => {
      try {
        return names?.of(code) ?? code;
      } catch {
        return code;
      }
    };
  }, [locale]);
}

export function CurrencyGlyph({ code, className }: { code: string; className?: string }) {
  const symbol = currencySymbol(code);
  return (
    <span
      aria-hidden
      dir="ltr"
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-white to-zinc-100 font-semibold text-zinc-800 shadow-[inset_0_0_0_0.5px_rgba(15,23,42,0.1),0_1px_2px_rgba(15,23,42,0.06)]",
        symbol.length === 3 ? "text-[10px] tracking-tight" : "text-[15px]",
        className,
      )}
    >
      {symbol}
    </span>
  );
}

function Tag({ tone, label, hint }: { tone: "sky" | "amber"; label: string; hint: string }) {
  return (
    <span
      title={hint}
      className={cn(
        "inline-flex items-center rounded-full px-1.5 text-[10px] font-semibold leading-4",
        tone === "sky" ? "bg-sky-500/10 text-sky-700" : "bg-amber-500/15 text-amber-800",
      )}
    >
      {label}
      <span className="sr-only">: {hint}</span>
    </span>
  );
}

/** Inset-grouped rows for one rate kind: mid prominent, buy / sell beneath. */
export function LiveFxQuoteTable({ quotes, kind, caption, renderAction, decimals = 2, className }: Props) {
  const t = useTranslations("fxLive");
  const locale = useLocale();
  const intl = toIntlLocale(locale);
  const currencyName = useCurrencyName();
  const rate = (value: string) => (value ? formatRate(value, intl, decimals) : "—");

  return (
    <ul aria-label={caption} className={cn("liquid-glass-group overflow-hidden rounded-2xl", className)}>
      {quotes.map((quote) => {
        const side = quote[kind];
        const badges = quoteBadges(quote, kind);
        return (
          <li
            key={quote.currency}
            className="relative flex items-center gap-3 px-3 py-2.5 [&:not(:first-child)]:before:absolute [&:not(:first-child)]:before:end-0 [&:not(:first-child)]:before:start-[3.75rem] [&:not(:first-child)]:before:top-0 [&:not(:first-child)]:before:h-px [&:not(:first-child)]:before:bg-zinc-900/[0.07]"
            data-testid={`fx-live-row-${quote.currency}`}
          >
            <CurrencyGlyph code={quote.currency} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1">
                <span dir="ltr" className="text-[15px] font-semibold tracking-tight text-zinc-950">
                  {quote.currency}
                </span>
                {badges.derived ? <Tag tone="sky" label={t("derived")} hint={t("derivedHint")} /> : null}
                {badges.stale ? (
                  <Tag
                    tone="amber"
                    label={t("stale")}
                    hint={t("staleHint", {
                      date: badges.observedAt ? formatDate(badges.observedAt, locale) : "—",
                    })}
                  />
                ) : null}
              </div>
              <p className="truncate text-xs text-zinc-500">{currencyName(quote.currency)}</p>
            </div>
            {side ? (
              <div className="shrink-0 text-end">
                <p className="text-[16px] font-semibold tabular-nums tracking-tight text-zinc-950">
                  <span className="sr-only">{t("columns.mid")} </span>
                  <bdi>{rate(side.mid)}</bdi>
                </p>
                {side.buy || side.sell ? (
                  <p className="text-[11px] tabular-nums text-zinc-500" title={`${t("columns.buy")} / ${t("columns.sell")}`}>
                    <span className="sr-only">{t("columns.buy")} </span>
                    <bdi>{rate(side.buy)}</bdi>
                    <span aria-hidden className="px-1 text-zinc-300">/</span>
                    <span className="sr-only">{t("columns.sell")} </span>
                    <bdi>{rate(side.sell)}</bdi>
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="shrink-0 text-sm text-zinc-400" title={t("notAvailable")}>
                <span aria-hidden>—</span>
                <span className="sr-only">{t("notAvailable")}</span>
              </p>
            )}
            {renderAction ? <div className="-me-1 shrink-0">{renderAction(quote)}</div> : null}
          </li>
        );
      })}
    </ul>
  );
}
