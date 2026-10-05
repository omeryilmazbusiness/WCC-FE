"use client";

import { useLocale, useTranslations } from "next-intl";
import { BedDouble, Bus, CalendarRange, ListChecks, Plane, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { bookingSummary, stayNights, type Booking, type BookingLineItem } from "@/entities/booking";
import type { Hotel, TourPackage } from "@/entities/tourpackage";
import { formatDay, formatMoney } from "@/shared/lib/format";
import { Fact, WorkspaceSection } from "./section";

type Props = { booking: Booking; pkg: TourPackage | null; lines: BookingLineItem[] };

export function ItineraryTab({ booking: b, pkg, lines }: Props) {
  const t = useTranslations("bookingWorkspace.itinerary");
  const tl = useTranslations("bookingWorkspace.list");
  const tLine = useTranslations("bookings.lineTypes");
  const locale = useLocale();
  const day = (d: string | null | undefined) => (d ? formatDay(d, locale) : "");
  const nights = stayNights(b.info.departDate, b.info.returnDate);
  const spec = pkg?.spec;
  const flights = spec?.flights;
  const hasFlights = Boolean(flights && (flights.airline || flights.outbound.route || flights.inbound.route));

  return (
    <div className="space-y-4" data-testid="booking-tab-itinerary">
      <WorkspaceSection icon={CalendarRange} tone="indigo" title={t("trip")}>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Fact label={t("summary")} value={bookingSummary(b, locale)} />
          <Fact label={t("departure")} value={day(b.info.departDate)} />
          <Fact label={t("return")} value={day(b.info.returnDate)} />
          <Fact label={t("stay")} value={nights ? tl("nights", { n: nights }) : ""} />
        </dl>
        {b.info.packageName ? (
          <p className="mt-3 text-[13px] text-zinc-500">
            {t("package")}: <span className="font-semibold text-zinc-800">{(locale === "ar" && b.info.packageNameAr) || b.info.packageName}</span>
            {b.info.departureCode ? <span dir="ltr"> · {b.info.departureCode}</span> : null}
          </p>
        ) : null}
      </WorkspaceSection>

      {hasFlights && flights ? (
        <WorkspaceSection icon={Plane} tone="sky" title={t("flights")} aside={flights.pnr ? <span className="font-mono text-[12px] font-semibold text-zinc-500" dir="ltr">{t("groupPnr")} {flights.pnr}</span> : null}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Leg icon={PlaneTakeoff} label={t("outbound")} airline={flights.airline} leg={flights.outbound} day={day} />
            <Leg icon={PlaneLanding} label={t("inbound")} airline={flights.airline} leg={flights.inbound} day={day} />
          </div>
          <p className="mt-2 text-[12px] text-zinc-400">{t("baggageNote")}</p>
        </WorkspaceSection>
      ) : null}

      {spec && (spec.makkah.name || spec.madinah.name) ? (
        <WorkspaceSection icon={BedDouble} tone="violet" title={t("hotels")}>
          <div className="grid gap-2 sm:grid-cols-2">
            <HotelCard city={t("makkah")} hotel={spec.makkah} nights={spec.nights.makkah} day={day} />
            <HotelCard city={t("madinah")} hotel={spec.madinah} nights={spec.nights.madinah} day={day} />
          </div>
        </WorkspaceSection>
      ) : !pkg && (b.info.makkahHotel || b.info.madinahHotel) ? (
        <WorkspaceSection icon={BedDouble} tone="violet" title={t("hotels")}>
          <dl className="grid grid-cols-2 gap-2">
            <Fact label={t("makkah")} value={b.info.makkahHotel} />
            <Fact label={t("madinah")} value={b.info.madinahHotel} />
          </dl>
        </WorkspaceSection>
      ) : null}

      {spec && (spec.transfers.busClass || spec.transfers.intercity || spec.guidance.leaderName) ? (
        <WorkspaceSection icon={Bus} tone="amber" title={t("transfers")}>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Fact label={t("bus")} value={spec.transfers.busClass} />
            <Fact label={t("intercity")} value={spec.transfers.intercity.replace(/_/g, " ")} />
            <Fact label={t("guide")} value={spec.guidance.leaderName} />
          </dl>
          {spec.transfers.airportMeet ? <p className="mt-2 text-[12.5px] font-medium text-emerald-700">✓ {t("airportMeet")}</p> : null}
        </WorkspaceSection>
      ) : null}

      {!pkg && !b.info.packageId ? (
        <p className="rounded-2xl bg-zinc-50 p-3 text-[12.5px] text-zinc-500">
          <span className="font-semibold text-zinc-700">{t("noPackage")}.</span> {t("noPackageHint")}
        </p>
      ) : null}

      <WorkspaceSection icon={ListChecks} tone="emerald" title={t("lines")}>
        {lines.length === 0 ? (
          <p className="text-[13px] text-zinc-500">—</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2 text-[13.5px]">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-zinc-900">{l.label}</span>
                  <span className="text-[12px] text-zinc-500">
                    {tLine(l.category ?? l.kind)} · ×{l.quantity}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{formatMoney(l.lineTotal, locale, b.currency)}</span>
              </li>
            ))}
          </ul>
        )}
      </WorkspaceSection>
    </div>
  );
}

function Leg({
  icon: Icon,
  label,
  airline,
  leg,
  day,
}: {
  icon: typeof Plane;
  label: string;
  airline: string;
  leg: { route: string; flightNo: string; date: string };
  day: (d: string) => string;
}) {
  if (!leg.route && !leg.flightNo) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-sky-50/60 p-3">
      <Icon className="h-5 w-5 shrink-0 text-sky-600" aria-hidden />
      <div className="min-w-0">
        <p className="text-[11.5px] font-medium text-zinc-500">{label}</p>
        <p className="truncate text-[15px] font-semibold text-zinc-950" dir="ltr">
          {leg.route || "—"}
        </p>
        <p className="truncate text-[12px] text-zinc-500" dir="ltr">
          {[airline, leg.flightNo, leg.date ? day(leg.date) : ""].filter(Boolean).join(" · ")}
        </p>
      </div>
    </div>
  );
}

function HotelCard({ city, hotel, nights, day }: { city: string; hotel: Hotel; nights: number; day: (d: string) => string }) {
  const t = useTranslations("bookingWorkspace.itinerary");
  const tl = useTranslations("bookingWorkspace.list");
  if (!hotel.name) return null;
  return (
    <div className="rounded-2xl bg-violet-50/50 p-3">
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-violet-700">{city}</p>
      <p className="mt-0.5 truncate text-[15px] font-semibold text-zinc-950">
        {hotel.name} {hotel.stars > 0 ? <span className="text-amber-500">{"★".repeat(hotel.stars)}</span> : null}
      </p>
      <p className="mt-1 text-[12.5px] text-zinc-500">
        {[
          nights ? tl("nights", { n: nights }) : "",
          hotel.board ? `${t("board")}: ${hotel.board.toUpperCase()}` : "",
          hotel.distanceM ? t("distance", { m: hotel.distanceM }) : "",
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {hotel.checkIn || hotel.checkOut ? (
        <p className="mt-0.5 text-[12px] text-zinc-400">
          {t("checkIn")} {hotel.checkIn ? day(hotel.checkIn) : "—"} → {t("checkOut")} {hotel.checkOut ? day(hotel.checkOut) : "—"}
        </p>
      ) : null}
    </div>
  );
}
