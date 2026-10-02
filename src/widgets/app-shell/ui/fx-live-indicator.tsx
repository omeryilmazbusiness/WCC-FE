"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChartNoAxesColumnIncreasing } from "lucide-react";
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
          "group/fx relative inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-full ps-1 pe-1 text-zinc-600 transition-[background-color,color] duration-200 hover:bg-zinc-950/[0.05] hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20 sm:pe-3",
          open && "bg-zinc-950 text-white hover:bg-zinc-950 hover:text-white",
        )}
      >
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors",
            open ? "bg-white/15" : "bg-zinc-950/[0.05] group-hover/fx:bg-white group-hover/fx:shadow-[0_1px_2px_rgba(0,0,0,0.08)]",
          )}
        >
          <ChartNoAxesColumnIncreasing className="h-3.5 w-3.5" strokeWidth={2.1} />
        </span>
        {rate ? (
          <span
            aria-hidden
            className={cn("hidden text-[12.5px] font-semibold tabular-nums tracking-tight sm:inline", open ? "text-white" : "text-zinc-900")}
          >
            <bdi dir="ltr">$ {rate}</bdi>
          </span>
        ) : null}
        {top.stale ? (
          <span
            aria-hidden
            className="absolute end-0.5 top-0.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white"
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
