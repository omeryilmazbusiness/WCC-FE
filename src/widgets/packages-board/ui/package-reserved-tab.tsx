"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, CalendarClock, Lock, UserCheck, Users, Wallet } from "lucide-react";
import { BookingStatusChip, PaymentStatusBadge, bookingPartyName, type Booking } from "@/entities/booking";
import type { Departure } from "@/entities/tourpackage";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { initials } from "@/shared/lib/avatar";
import { cn } from "@/shared/lib/cn";
import { formatDay, formatMoney } from "@/shared/lib/format";
import { EmptyState, StatTile, TONES } from "@/shared/ui";
import { orderReserved, reservedBookings, summarizeReserved } from "../model/reserved";
import type { PackageLinks } from "../model/use-package-links";

type Props = {
  departures: Departure[];
  links: PackageLinks;
};

/** Customers who paid in full and still occupy a seat on this package. */
export function PackageReservedTab({ departures, links }: Props) {
  const t = useTranslations("packages.reserved");
  const locale = useLocale();
  const rows = useMemo(() => orderReserved(reservedBookings(links.bookings)), [links.bookings]);
  const summary = useMemo(() => summarizeReserved(links.bookings), [links.bookings]);
  const depById = useMemo(() => new Map(departures.map((d) => [d.id, d])), [departures]);

  return (
    <div className="space-y-4" data-testid="package-reserved">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile icon={UserCheck} tone="violet" label={t("customers")} value={summary.customers} data-testid="package-reserved-stat-customers" />
        <StatTile icon={Wallet} tone="emerald" label={t("reservations")} value={summary.reservations} data-testid="package-reserved-stat-bookings" />
        <StatTile icon={Users} tone="sky" label={t("pax")} value={summary.pax} data-testid="package-reserved-stat-pax" />
      </div>

      {!links.can.bookings ? (
        <p className="flex items-center gap-2 rounded-[26px] bg-zinc-50 px-4 py-5 text-[13px] text-zinc-500" data-testid="package-reserved-locked">
          <Lock className="h-4 w-4" aria-hidden /> {t("locked")}
        </p>
      ) : links.loading.bookings && links.bookings.length === 0 ? (
        <div className="space-y-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[26px] bg-zinc-100/80" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={UserCheck} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {rows.map((booking) => (
            <ReservedRow key={booking.id} booking={booking} departure={depById.get(booking.departureId)} locale={locale} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReservedRow({ booking, departure, locale }: { booking: Booking; departure?: Departure; locale: string }) {
  const t = useTranslations("packages.reserved");
  const name = bookingPartyName(booking, locale) || t("unnamed");
  const depart = departure?.departDate ?? booking.info.departDate;
  const code = departure?.code || booking.info.departureCode || booking.refCode || booking.id.slice(0, 8);
  return (
    <li
      className="flex flex-col gap-3.5 rounded-[26px] border border-zinc-200/60 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      data-testid={`package-reserved-${booking.id}`}
    >
      <div className="flex items-center gap-3">
        {booking.customerId ? (
          <Link
            href={routes.customer(booking.customerId)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-start transition-colors hover:bg-zinc-50"
            data-testid={`package-reserved-customer-${booking.customerId}`}
          >
            <span
              className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold", TONES.violet.soft)}
              aria-hidden
            >
              {initials(name)}
            </span>
            <span className="min-w-0">
              <span dir="auto" className="block truncate text-[15px] font-semibold tracking-tight text-zinc-950">
                {name}
              </span>
              <span className="text-[12px] font-medium text-violet-700">{t("openCustomer")}</span>
            </span>
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span
              className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold", TONES.violet.soft)}
              aria-hidden
            >
              {initials(name)}
            </span>
            <span dir="auto" className="truncate text-[15px] font-semibold tracking-tight text-zinc-950">
              {name}
            </span>
          </div>
        )}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <PaymentStatusBadge status={booking.paymentStatus} />
          <BookingStatusChip status={booking.status} />
        </div>
      </div>

      <Link
        href={routes.booking(booking.id)}
        className="group flex flex-col gap-3 rounded-2xl bg-zinc-50/80 p-3 ring-1 ring-inset ring-zinc-900/[0.04] transition hover:bg-white hover:shadow-[0_12px_28px_-22px_rgba(15,23,42,0.5)]"
        data-testid={`package-reserved-booking-${booking.id}`}
      >
        <p className="flex flex-wrap items-center gap-x-2 text-[12.5px] font-medium text-zinc-600">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 text-violet-500" aria-hidden />
            <span dir="ltr" className="font-mono text-[12px] font-semibold text-zinc-900">
              {code}
            </span>
            {depart ? <span>· {formatDay(depart, locale)}</span> : null}
          </span>
          <span>· {t("travellers", { n: booking.paxCount })}</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Figure label={t("paid")} value={formatMoney(booking.collectedAmt, locale, booking.currency)} tone="emerald" />
          <Figure label={t("total")} value={formatMoney(booking.totalAmount, locale, booking.currency)} />
        </div>
        <span className="inline-flex items-center justify-end gap-1 text-[12px] font-semibold text-zinc-400 group-hover:text-zinc-700">
          {t("openBooking")}
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
        </span>
      </Link>
    </li>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: "emerald" }) {
  return (
    <div className="min-w-0 rounded-2xl bg-zinc-50/90 px-3 py-2">
      <p className="truncate text-[11px] font-medium text-zinc-400">{label}</p>
      <p className={cn("truncate text-[14px] font-semibold tabular-nums", tone ? TONES[tone].text : "text-zinc-900")}>{value}</p>
    </div>
  );
}
