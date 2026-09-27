"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Coins } from "lucide-react";
import {
  FX_LIVE_OPEN_MAX_AGE_MS,
  formatRate,
  headline,
  useBaseCurrency,
  useCurrencyName,
  useLiveFxBoard,
  type FxLiveKind,
} from "@/entities/fx-live";
import { toIntlLocale } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui";
import { FxLivePanel } from "./fx-live-panel";

/** Header trigger with the USD market mid; opens the live rates board. */
export function FxLiveIndicator() {
  const t = useTranslations("fxLive");
  const locale = useLocale();
  const state = useLiveFxBoard();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FxLiveKind>("market");
  const [base, setBase] = useBaseCurrency();
  const top = headline(state.board);
  const rate = top.mid ? formatRate(top.mid, toIntlLocale(locale)) : null;
  const currencyName = useCurrencyName();
  const currency = currencyName(state.board?.localCurrency ?? "SYP");

  const label = rate
    ? t(top.stale ? "triggerLabelStale" : "triggerLabel", { rate, currency })
    : t("trigger");

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) void state.ensureFresh(FX_LIVE_OPEN_MAX_AGE_MS);
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        aria-label={label}
        title={t("trigger")}
        data-testid="fx-live-trigger"
        className={cn(
          "relative inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full px-2.5 text-zinc-500 transition-[background-color,color,box-shadow] duration-200 hover:bg-zinc-900/[0.05] hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          open &&
            "bg-white text-zinc-950 shadow-[0_1px_3px_rgba(15,23,42,0.1),0_0_0_0.5px_rgba(15,23,42,0.08)]",
        )}
      >
        <Coins className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        {rate ? (
          <span
            aria-hidden
            className="hidden text-[13px] font-semibold tabular-nums text-zinc-700 sm:inline"
          >
            <bdi dir="ltr">$ {rate}</bdi>
          </span>
        ) : null}
        {top.stale ? (
          <span
            aria-hidden
            className="absolute end-1 top-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white"
            data-testid="fx-live-stale-dot"
          />
        ) : null}
      </PopoverTrigger>
      <PopoverContent
        aria-labelledby={titleId}
        className="liquid-glass animate-glass-pop mt-2.5 flex max-h-[min(42rem,calc(100vh-5rem))] w-[min(23rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[28px] border-0 bg-transparent shadow-none"
        data-testid="fx-live-popover"
      >
        <FxLivePanel
          state={state}
          kind={kind}
          onKindChange={setKind}
          base={base}
          onBaseChange={setBase}
          titleId={titleId}
          onNavigate={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
