"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, BadgePercent, Clock3, Plane, Target } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { buttonVariants } from "@/shared/ui";
import {
  airlineLogoUrl,
  gapKind,
  spanParts,
  wallClockDate,
  type FlightOffer,
} from "../model";

function AirlineLogo({ code, name }: { code: string; name: string }) {
  const [broken, setBroken] = useState(false);
  const src = airlineLogoUrl(code);
  return (
    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-white shadow-[0_6px_16px_-10px_rgba(15,23,42,0.4)] ring-1 ring-zinc-200/80">
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- third-party airline logo CDN, tiny and cacheable
        <img
          src={src}
          alt={name}
          width={48}
          height={48}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain p-1.5"
          onError={() => setBroken(true)}
        />
      ) : (
        <span
          dir="ltr"
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-100 font-mono text-xs font-bold text-indigo-700"
        >
          {code || "—"}
        </span>
      )}
    </span>
  );
}

/** Formats a span of minutes like "1d 4h" / "4h 15m" / "55m" in the UI locale. */
export function useFlightSpan() {
  const t = useTranslations("flights.offer.units");
  return (minutes: number) => spanParts(minutes).map(([unit, n]) => t(unit, { n })).join(" ");
}

const PILL = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold";

type FlightOfferCardProps = {
  offer: FlightOffer;
  /** The search had no preferred time: gaps are whole days from the chosen date. */
  anyTime?: boolean;
  className?: string;
};

/** One fare as a ticket: when it leaves (origin local time), how far that is from the wanted time, price and hand-off. */
export function FlightOfferCard({ offer, anyTime = false, className }: FlightOfferCardProps) {
  const t = useTranslations("flights.offer");
  const locale = useLocale();
  const span = useFlightSpan();
  const departure = wallClockDate(offer.localDeparture);
  const time = departure
    ? formatDate(departure, locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" })
    : "—";
  const day = departure
    ? formatDate(departure, locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    : "—";
  const kind = gapKind(offer.gapMinutes);
  const gapText =
    kind === "onTime" ? t(anyTime ? "gap.sameDay" : "gap.onTime") : t(`gap.${kind}`, { value: span(offer.gapMinutes) });
  const direct = offer.transfers === 0;

  return (
    <article
      data-testid="flight-offer"
      data-closest={offer.closest || undefined}
      data-cheapest={offer.cheapest || undefined}
      className={cn(
        "group relative grid gap-5 overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.4)] ring-1 ring-zinc-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_-26px_rgba(15,23,42,0.45)] lg:grid-cols-[minmax(0,1fr)_minmax(0,2.1fr)_auto] lg:items-center lg:gap-6 lg:p-6",
        offer.closest && "ring-2 ring-emerald-300/80",
        className,
      )}
    >
      {offer.closest ? (
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400" />
      ) : null}

      <div className="flex min-w-0 items-center gap-3">
        <AirlineLogo code={offer.airline} name={offer.airlineName} />
        <div className="min-w-0 space-y-1">
          <p className="truncate text-[15px] font-semibold tracking-tight text-zinc-950" title={offer.airlineName}>
            {offer.airlineName || offer.airline}
          </p>
          <p dir="ltr" className="inline-flex rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-zinc-600">
            {offer.airline}
            {offer.flightNumber ? ` ${offer.flightNumber}` : ""}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        <div className="shrink-0">
          <p dir="ltr" className="text-[28px] font-bold leading-none tabular-nums tracking-tight text-zinc-950 rtl:text-end" data-testid="flight-offer-time">
            {time}
          </p>
          <p className="mt-1.5 text-xs font-medium text-zinc-500">
            {day} · <bdi className="font-mono font-semibold text-zinc-700">{offer.originAirport}</bdi>
          </p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 px-1">
          <span className="text-xs font-semibold text-zinc-500">{offer.durationMinutes > 0 ? span(offer.durationMinutes) : "—"}</span>
          <span className="relative flex w-full items-center">
            <span className="h-[2px] flex-1 rounded-full bg-gradient-to-r from-zinc-200 to-sky-300 rtl:bg-gradient-to-l" />
            <span className="mx-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-50 text-sky-600 ring-1 ring-sky-100">
              <Plane className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
            </span>
            <span className="h-[2px] flex-1 rounded-full bg-gradient-to-r from-sky-300 to-zinc-200 rtl:bg-gradient-to-l" />
          </span>
          <span className={cn(PILL, "py-0.5", direct ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
            <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", direct ? "bg-emerald-500" : "bg-amber-500")} />
            {direct ? t("direct") : t("stops", { count: offer.transfers })}
          </span>
        </div>
        <div className="shrink-0 text-end">
          <p dir="ltr" className="font-mono text-[22px] font-bold leading-none text-zinc-950 rtl:text-start">
            {offer.destinationAirport}
          </p>
          <p className="mt-1.5 text-xs font-medium text-zinc-500">{t("arrival")}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-zinc-200 pt-4 lg:min-w-[13rem] lg:flex-col lg:items-end lg:border-s lg:border-t-0 lg:ps-6 lg:pt-0">
        <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
          {offer.closest ? (
            <span className={cn(PILL, "bg-emerald-50 text-emerald-700")} data-testid="badge-closest">
              <Target className="h-3 w-3" aria-hidden />
              {t("closest")}
            </span>
          ) : null}
          {offer.cheapest ? (
            <span className={cn(PILL, "bg-sky-50 text-sky-700")} data-testid="badge-cheapest">
              <BadgePercent className="h-3 w-3" aria-hidden />
              {t("cheapest")}
            </span>
          ) : null}
          <span className={cn(PILL, kind === "onTime" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600")}>
            <Clock3 className="h-3 w-3" aria-hidden />
            {gapText}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-end">
            <p className="text-2xl font-bold leading-none tabular-nums tracking-tight text-zinc-950" data-testid="flight-offer-price">
              {formatCurrency(offer.price, locale, offer.currency || "USD", { maximumFractionDigits: 0 })}
            </p>
            <p className="mt-1 text-[11px] font-medium text-zinc-400">{t("perAdult")}</p>
          </div>
          {offer.bookingUrl ? (
            <a
              href={offer.bookingUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              data-testid="flight-offer-book"
              className={buttonVariants({
                className:
                  "h-11 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 px-5 text-white shadow-[0_12px_26px_-12px_rgba(79,70,229,0.7)] hover:bg-transparent hover:from-sky-400 hover:to-indigo-500",
              })}
            >
              {t("book")}
              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
              <span className="sr-only">{t("opensInNewTab")}</span>
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
