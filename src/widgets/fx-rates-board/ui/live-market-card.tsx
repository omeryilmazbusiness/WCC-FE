"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RadioTower, TriangleAlert } from "lucide-react";
import {
  FX_LIVE_KINDS,
  LiveFxQuoteTable,
  LiveFxSources,
  boardHealth,
  orderQuotes,
  usableMid,
  useLiveFxBoard,
  type FxLiveKind,
  type FxLiveQuote,
} from "@/entities/fx-live";
import { useCan } from "@/entities/viewer";
import { AdoptLiveRateButton } from "@/features/adopt-live-fx-rate";
import { RefreshLiveFxButton } from "@/features/refresh-live-fx";
import { cn } from "@/shared/lib/cn";
import { formatRelativeTime } from "@/shared/lib/format";
import { SegmentedControl, TONES } from "@/shared/ui";

type Props = {
  /** Called after a live quote was saved as an accounting rate. */
  onAdopted: () => void;
  className?: string;
};

/** Indicative live quotes next to the accounting rates; managers can adopt a mid as today's rate. */
export function LiveMarketCard({ onAdopted, className }: Props) {
  const t = useTranslations("fxLive");
  const tf = useTranslations("fx.live");
  const locale = useLocale();
  const titleId = useId();
  const canManage = useCan("fx.manage");
  const [kind, setKind] = useState<FxLiveKind>("market");
  const { board, error, loading, reload, replace } = useLiveFxBoard();

  const { pinned } = orderQuotes(board?.quotes ?? []);
  const health = board ? boardHealth(board) : null;
  const local = board?.localCurrency ?? "SYP";
  const renderAction = canManage
    ? (quote: FxLiveQuote) => (
        <AdoptLiveRateButton currency={quote.currency} kind={kind} disabled={!usableMid(quote, kind)} onAdopted={onAdopted} />
      )
    : undefined;
  const updated = board?.updatedAt
    ? t("updated", { time: formatRelativeTime(board.updatedAt, locale) })
    : loading
      ? t("loading")
      : t("neverUpdated");

  return (
    <section
      aria-labelledby={titleId}
      className={cn("flex flex-col rounded-[28px] border border-zinc-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)}
      data-testid="fx-live-market"
    >
      <header className="flex items-center gap-3">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", TONES.teal.gradient)} aria-hidden>
          <RadioTower className="h-5 w-5" strokeWidth={2.1} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-[16px] font-semibold tracking-tight text-zinc-950">
            {tf("title")}
          </h2>
          <p className="truncate text-[12.5px] text-zinc-500" aria-live="polite">
            {t("location")} · {updated}
          </p>
        </div>
        <RefreshLiveFxButton
          onRefreshed={replace}
          className="h-9 w-9 shrink-0 rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950"
        />
      </header>

      <div className="mt-4 flex items-center justify-between gap-2">
        <SegmentedControl
          value={kind}
          onChange={setKind}
          aria-label={t("kindLabel")}
          options={FX_LIVE_KINDS.map((k) => ({ value: k, label: t(`kind.${k}`) }))}
        />
        <span className="truncate text-[12px] text-zinc-400">{t("perUnit", { base: local })}</span>
      </div>

      <div className="mt-3 flex-1 space-y-3">
        {health?.degraded && pinned.length > 0 ? (
          <p role="status" className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-[12.5px] font-medium text-amber-900">
            <TriangleAlert className="mt-px h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            {t("staleBanner")}
          </p>
        ) : null}

        {error ? (
          <div role="alert" className="flex items-center gap-2 rounded-2xl bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800">
            <p className="min-w-0 flex-1 font-semibold">{board ? t("updateError") : t("loadError")}</p>
            <button
              type="button"
              disabled={loading}
              onClick={() => void reload()}
              className="h-7 shrink-0 rounded-full px-3 font-semibold hover:bg-rose-100 disabled:opacity-50"
            >
              {t("retry")}
            </button>
          </div>
        ) : null}

        {!board && loading ? (
          <div className="space-y-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-3 py-3">
                <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-200/80" />
                <div className="h-3 flex-1 animate-pulse rounded-full bg-zinc-200/80" />
              </div>
            ))}
          </div>
        ) : null}

        {board && pinned.length === 0 ? <p className="py-8 text-center text-[13px] text-zinc-500">{t("empty")}</p> : null}

        {pinned.length > 0 ? (
          <LiveFxQuoteTable quotes={pinned} kind={kind} caption={t("pinned")} renderAction={renderAction} decimals={2} />
        ) : null}

        {canManage && pinned.length > 0 ? <p className="px-1 text-[12px] leading-5 text-zinc-400">{tf("adoptHint")}</p> : null}
      </div>

      <footer className="mt-4 border-t border-zinc-100 pt-3 text-[11.5px] text-zinc-500">
        <LiveFxSources board={board} />
      </footer>
    </section>
  );
}
