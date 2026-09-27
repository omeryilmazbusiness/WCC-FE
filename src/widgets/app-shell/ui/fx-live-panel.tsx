"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, ChevronsUpDown, Info, TriangleAlert } from "lucide-react";
import {
  FX_LIVE_KINDS,
  LiveFxQuoteTable,
  baseCurrencyOptions,
  boardHealth,
  divideDecimal,
  footerSources,
  orderQuotes,
  rebaseQuotes,
  useCurrencyName,
  usableMid,
  type FxLiveKind,
  type FxLiveQuote,
  type LiveFxBoardState,
} from "@/entities/fx-live";
import { useCan } from "@/entities/viewer";
import { AdoptLiveRateButton } from "@/features/adopt-live-fx-rate";
import { LiveFxConverter } from "@/features/convert-currency";
import { RefreshLiveFxButton } from "@/features/refresh-live-fx";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { formatRelativeTime } from "@/shared/lib/format";
import { useDescribeError } from "@/shared/ui";

type Props = {
  state: LiveFxBoardState;
  kind: FxLiveKind;
  onKindChange: (kind: FxLiveKind) => void;
  /** Viewer's reference currency; `null` = the board's local currency. */
  base: string | null;
  onBaseChange: (code: string | null) => void;
  titleId: string;
  onNavigate: () => void;
};

function KindSwitch({
  value,
  onChange,
  label,
  optionLabel,
}: {
  value: FxLiveKind;
  onChange: (kind: FxLiveKind) => void;
  label: string;
  optionLabel: (kind: FxLiveKind) => string;
}) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 rounded-full bg-zinc-900/[0.06] p-[3px]">
      {FX_LIVE_KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          aria-pressed={value === kind}
          onClick={() => onChange(kind)}
          className={cn(
            "h-7 truncate rounded-full px-3 text-[13px] font-semibold transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
            value === kind
              ? "bg-white text-zinc-950 shadow-[0_1px_3px_rgba(15,23,42,0.12),0_0_0_0.5px_rgba(15,23,42,0.05)]"
              : "text-zinc-500 hover:text-zinc-900",
          )}
        >
          {optionLabel(kind)}
        </button>
      ))}
    </div>
  );
}

function SectionHeader({ title, trailing }: { title: string; trailing?: string }) {
  return (
    <div className="flex items-baseline justify-between px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
      <span>{title}</span>
      {trailing ? <span className="normal-case tracking-normal text-zinc-400">{trailing}</span> : null}
    </div>
  );
}

export function FxLivePanel({ state, kind, onKindChange, base, onBaseChange, titleId, onNavigate }: Props) {
  const t = useTranslations("fxLive");
  const locale = useLocale();
  const describe = useDescribeError();
  const currencyName = useCurrencyName();
  const canManage = useCan("fx.manage");
  const canReadRates = useCan("payments.read");
  const othersId = useId();
  const disclaimerId = useId();
  const baseId = useId();
  const [showOthers, setShowOthers] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const { board, error, loading, reload, replace } = state;

  const local = board?.localCurrency ?? "SYP";
  const baseOptions = baseCurrencyOptions(board?.quotes ?? [], local);
  const activeBase = base && baseOptions.includes(base) ? base : local;
  const isLocalBase = activeBase === local;
  const quotes = rebaseQuotes(board?.quotes ?? [], local, activeBase, divideDecimal);
  const { pinned, others } = orderQuotes(quotes, isLocalBase ? undefined : local);
  const hasQuotes = quotes.length > 0;
  const health = board ? boardHealth(board) : null;
  const perUnit = t("perUnit", { base: activeBase });
  const decimals = isLocalBase ? 2 : 4;

  const renderAction =
    canManage && isLocalBase
      ? (quote: FxLiveQuote) => (
          <AdoptLiveRateButton currency={quote.currency} kind={kind} disabled={!usableMid(quote, kind)} />
        )
      : undefined;

  const updated = board?.updatedAt
    ? t("updated", { time: formatRelativeTime(board.updatedAt, locale) })
    : loading
      ? t("loading")
      : t("neverUpdated");

  return (
    <>
      <header className="flex items-center gap-2 px-4 pb-3 pt-4">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-[17px] font-semibold tracking-tight text-zinc-950">
            {t("title")}
          </h2>
          <p className="mt-0.5 truncate text-xs text-zinc-500" aria-live="polite">
            {t("location")} · {updated}
          </p>
        </div>
        {baseOptions.length > 1 ? (
          <div className="relative">
            <label htmlFor={baseId} className="sr-only">
              {t("base")}
            </label>
            <span
              aria-hidden
              dir="ltr"
              className="pointer-events-none flex h-8 items-center gap-1 rounded-full bg-zinc-900/[0.06] ps-3 pe-2 text-[13px] font-semibold text-zinc-900"
            >
              {activeBase}
              <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-500" strokeWidth={2} />
            </span>
            <select
              id={baseId}
              value={activeBase}
              onChange={(e) => onBaseChange(e.target.value === local ? null : e.target.value)}
              title={t("base")}
              className="absolute inset-0 cursor-pointer appearance-none rounded-full opacity-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              data-testid="fx-live-base"
            >
              {baseOptions.map((code) => (
                <option key={code} value={code}>
                  {code} — {currencyName(code)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <RefreshLiveFxButton
          onRefreshed={replace}
          className="h-8 w-8 rounded-full bg-zinc-900/[0.06] text-zinc-700 hover:bg-zinc-900/10 hover:text-zinc-950"
        />
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-3">
        <div className="px-1">
          <KindSwitch
            value={kind}
            onChange={onKindChange}
            label={t("kindLabel")}
            optionLabel={(k) => t(`kind.${k}`)}
          />
        </div>

        {health?.degraded && hasQuotes ? (
          <p
            role="status"
            className="mx-1 flex items-start gap-2 rounded-2xl bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-900"
            data-testid="fx-live-stale-banner"
          >
            <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {t("staleBanner")}
          </p>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="mx-1 flex items-center gap-2 rounded-2xl bg-rose-500/10 px-3 py-2 text-xs text-rose-800"
            data-testid="fx-live-error"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{board ? t("updateError") : t("loadError")}</p>
              {!board ? <p className="mt-0.5">{describe(error).description}</p> : null}
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => void reload()}
              className="h-7 shrink-0 rounded-full px-3 font-semibold text-rose-800 hover:bg-rose-500/10 disabled:opacity-50"
            >
              {t("retry")}
            </button>
          </div>
        ) : null}

        {!board && loading ? (
          <div className="liquid-glass-group space-y-px overflow-hidden rounded-2xl" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-200/70" />
                <div className="h-3 flex-1 animate-pulse rounded-full bg-zinc-200/70" />
              </div>
            ))}
          </div>
        ) : null}

        {board && !hasQuotes ? (
          <p className="py-6 text-center text-xs text-zinc-500">{t("empty")}</p>
        ) : null}

        {pinned.length > 0 ? (
          <section>
            <SectionHeader title={t("pinned")} trailing={perUnit} />
            <LiveFxQuoteTable
              quotes={pinned}
              kind={kind}
              caption={t("pinned")}
              renderAction={renderAction}
              decimals={decimals}
            />
            {!isLocalBase ? (
              <p className="px-1 pt-1.5 text-[11px] leading-4 text-zinc-500">{t("crossNote", { local })}</p>
            ) : null}
          </section>
        ) : null}

        {others.length > 0 ? (
          <section>
            <button
              type="button"
              aria-expanded={showOthers}
              aria-controls={othersId}
              onClick={() => setShowOthers((v) => !v)}
              className="liquid-glass-group flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-[14px] font-medium text-zinc-900 transition-colors hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              {t("others", { count: others.length })}
              {showOthers ? (
                <ChevronDown className="h-4 w-4 text-zinc-400" strokeWidth={2} />
              ) : (
                <ChevronRight className="h-4 w-4 text-zinc-400 rtl:-scale-x-100" strokeWidth={2} />
              )}
            </button>
            <div id={othersId} hidden={!showOthers} className="pt-2">
              <LiveFxQuoteTable
                quotes={others}
                kind={kind}
                caption={t("others", { count: others.length })}
                renderAction={renderAction}
                decimals={decimals}
              />
            </div>
          </section>
        ) : null}

        {board && hasQuotes ? (
          <section>
            <SectionHeader title={t("converter.title")} />
            <LiveFxConverter quotes={[...pinned, ...others]} kind={kind} localCurrency={activeBase} />
          </section>
        ) : null}
      </div>

      <footer className="space-y-1.5 border-t border-zinc-900/[0.06] px-4 py-3 text-[11px] text-zinc-500">
        {canReadRates ? (
          <Link
            href={routes.financeFx}
            onClick={onNavigate}
            className="flex items-center justify-between text-[13px] font-medium text-zinc-900 hover:text-zinc-950"
          >
            {t("manage")}
            <ChevronRight className="h-4 w-4 text-zinc-400 rtl:-scale-x-100" strokeWidth={2} />
          </Link>
        ) : null}
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 leading-5" data-testid="fx-live-sources">
            <span className="font-medium text-zinc-600">{t("sources")}: </span>
            {footerSources(board?.sources ?? []).map((source, i) => (
              <span key={source.id || source.name}>
                {i > 0 ? " · " : null}
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-700 underline-offset-2 hover:text-zinc-950 hover:underline"
                  >
                    {source.attribution || source.name}
                  </a>
                ) : (
                  source.attribution || source.name
                )}
                {!source.ok ? (
                  <span className="text-amber-700" title={source.error || undefined}>
                    {" "}
                    ({t("sourceUnavailable")})
                  </span>
                ) : null}
              </span>
            ))}
          </p>
          <button
            type="button"
            aria-expanded={showDisclaimer}
            aria-controls={disclaimerId}
            aria-label={t("disclaimer")}
            title={t("disclaimer")}
            onClick={() => setShowDisclaimer((v) => !v)}
            className="rounded-full p-0.5 text-zinc-400 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
        <p id={disclaimerId} hidden={!showDisclaimer} className="leading-5">
          {board?.disclaimer || t("disclaimerFallback")}
        </p>
      </footer>
    </>
  );
}
