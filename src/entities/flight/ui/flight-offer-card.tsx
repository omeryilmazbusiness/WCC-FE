"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Clock3, Plane } from "lucide-react";
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
    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200/80 bg-white">
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- third-party airline logo CDN, tiny and cacheable
        <img
          src={src}
          alt={name}
          width={44}
          height={44}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain p-1"
          onError={() => setBroken(true)}
        />
      ) : (
        <span dir="ltr" className="font-mono text-xs font-bold text-zinc-500">
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

type FlightOfferCardProps = {
  offer: FlightOffer;
  className?: string;
};

/** One fare: when it leaves (origin local time), how far that is from the wanted time, price and hand-off. */
export function FlightOfferCard({ offer, className }: FlightOfferCardProps) {
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
  const gapText = kind === "onTime" ? t("gap.onTime") : t(`gap.${kind}`, { value: span(offer.gapMinutes) });

  return (
    <article
      data-testid="flight-offer"
      data-closest={offer.closest || undefined}
      data-cheapest={offer.cheapest || undefined}
      className={cn(
        "grid gap-4 rounded-[24px] border border-zinc-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0_12px_36px_rgba(0,0,0,0.06)] sm:p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_auto] lg:items-center",
        offer.closest && "border-emerald-300/80 ring-1 ring-emerald-200/70",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <AirlineLogo code={offer.airline} name={offer.airlineName} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-950" title={offer.airlineName}>
            {offer.airlineName || offer.airline}
          </p>
          <p dir="ltr" className="font-mono text-xs text-zinc-500 rtl:text-end">
            {offer.airline}
            {offer.flightNumber ? ` ${offer.flightNumber}` : ""}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div className="shrink-0">
          <p dir="ltr" className="text-2xl font-bold tabular-nums tracking-tight text-zinc-950 rtl:text-end" data-testid="flight-offer-time">
            {time}
          </p>
          <p className="text-xs font-medium text-zinc-500">
            {day} · <bdi className="font-mono">{offer.originAirport}</bdi>
          </p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1">
          <span className="text-xs font-medium text-zinc-500">{offer.durationMinutes > 0 ? span(offer.durationMinutes) : "—"}</span>
          <span className="relative flex w-full items-center">
            <span className="h-px flex-1 bg-zinc-200" />
            <Plane className="mx-1.5 h-3.5 w-3.5 text-zinc-400 rtl:-scale-x-100" aria-hidden />
            <span className="h-px flex-1 bg-zinc-200" />
          </span>
          <span
            className={cn(
              "text-xs font-semibold",
              offer.transfers === 0 ? "text-emerald-600" : "text-amber-600",
            )}
          >
            {offer.transfers === 0 ? t("direct") : t("stops", { count: offer.transfers })}
          </span>
        </div>
        <div className="shrink-0 text-end">
          <p dir="ltr" className="font-mono text-lg font-semibold text-zinc-950 rtl:text-start">
            {offer.destinationAirport}
          </p>
          <p className="text-xs font-medium text-zinc-500">{t("arrival")}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3 lg:flex-col lg:items-end lg:border-0 lg:pt-0">
        <div className="flex flex-wrap items-center gap-1.5">
          {offer.closest ? (
            <span className="rounded-xl bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700" data-testid="badge-closest">
              {t("closest")}
            </span>
          ) : null}
          {offer.cheapest ? (
            <span className="rounded-xl bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700" data-testid="badge-cheapest">
              {t("cheapest")}
            </span>
          ) : null}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-[11px] font-semibold",
              kind === "onTime" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600",
            )}
          >
            <Clock3 className="h-3 w-3" aria-hidden />
            {gapText}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xl font-bold tabular-nums text-zinc-950" data-testid="flight-offer-price">
            {formatCurrency(offer.price, locale, offer.currency || "USD", { maximumFractionDigits: 0 })}
          </p>
          {offer.bookingUrl ? (
            <a
              href={offer.bookingUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              data-testid="flight-offer-book"
              className={buttonVariants({ size: "sm", className: "h-10 px-4 text-sm" })}
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
