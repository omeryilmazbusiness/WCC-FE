"use client";

import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, ExternalLink, UserRound } from "lucide-react";
import {
  BookingStatusChip,
  ChannelBadge,
  HoldCountdownBadge,
  PaymentStatusBadge,
  ServiceIconTile,
  TicketStatusBadge,
  bookingPartyName,
  bookingSummary,
  collectedPct,
  extraPax,
  type Booking,
} from "@/entities/booking";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { formatDay, formatMoney } from "@/shared/lib/format";
import { CopyButton, InitialsAvatar } from "@/shared/ui";


type Props = { booking: Booking; variant: "drawer" | "page" };

export function WorkspaceHeader({ booking: b, variant }: Props) {
  const t = useTranslations("bookingWorkspace");
  const locale = useLocale();
  const money = (v: number) => formatMoney(v, locale, b.currency);
  const pct = collectedPct(b);
  const extra = extraPax(b.paxCount);

  return (
    <section
      className="relative overflow-hidden rounded-[28px] border border-zinc-200/70 bg-gradient-to-br from-white via-white to-indigo-50/60 p-5 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.45)]"
      data-testid="booking-workspace-header"
    >
      <div className="flex flex-wrap items-start gap-4">
        <ServiceIconTile type={b.serviceType} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="truncate text-[22px] font-semibold tracking-tight text-zinc-950">
              <bdi>{bookingPartyName(b, locale) || "—"}</bdi>
            </h2>
            {extra > 0 ? <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[12px] font-semibold text-zinc-600">{t("list.pax", { n: extra })}</span> : null}
          </div>
          <p className="mt-0.5 truncate text-[13.5px] text-zinc-500">{bookingSummary(b, locale) || t(`service.${b.serviceType}`)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
            <span className="inline-flex items-center gap-0.5 font-semibold text-zinc-800" dir="ltr">
              {b.refCode || b.id.slice(0, 8)}
              <CopyButton value={b.refCode || b.id} label={t("list.copyRef")} />
            </span>
            {b.pnr ? (
              <span className="inline-flex items-center gap-0.5 rounded-lg bg-zinc-950 px-2 py-0.5 font-mono text-[12px] font-semibold tracking-wider text-white" dir="ltr">
                {b.pnr}
                <CopyButton value={b.pnr} label={t("list.copyPnr")} className="h-5 w-5 text-zinc-400 hover:bg-zinc-800 hover:text-white" />
              </span>
            ) : null}
            {b.info.departDate ? (
              <span className="inline-flex items-center gap-1 text-zinc-500">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {t("header.departs", { date: formatDay(b.info.departDate, locale) })}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {b.info.ownerName ? <InitialsAvatar id={b.ownerId} name={b.info.ownerName} size="md" /> : null}
          {variant === "drawer" ? (
            <Link
              href={routes.booking(b.id)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-[12.5px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
              data-testid="booking-open-full"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              {t("header.openFull")}
            </Link>
          ) : null}
          {b.customerId ? (
            <Link
              href={routes.customer(b.customerId)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-[12.5px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              <UserRound className="h-3.5 w-3.5" aria-hidden />
              {t("header.openCustomer")}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <BookingStatusChip status={b.status} />
        <TicketStatusBadge status={b.ticketStatus} />
        <PaymentStatusBadge status={b.paymentStatus} />
        <ChannelBadge channel={b.channel} />
        {b.status === "option_hold" && b.holdExpiresAt ? <HoldCountdownBadge expiresAt={b.holdExpiresAt} /> : null}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 rounded-[22px] bg-white/80 p-3.5 ring-1 ring-zinc-100">
        <Figure label={t("finance.gross")} value={money(b.totalAmount)} />
        <Figure label={t("finance.collected")} value={money(b.collectedAmt)} tone="text-emerald-700" />
        <Figure label={t("finance.balance")} value={money(b.balanceAmt)} tone={b.balanceAmt > 0 ? "text-rose-700" : "text-zinc-950"} />
        <div className="col-span-3">
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-[11.5px] font-medium text-zinc-500">{t("finance.progress", { pct })}</p>
        </div>
      </div>
    </section>
  );
}

function Figure({ label, value, tone = "text-zinc-950" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11.5px] font-medium text-zinc-500">{label}</p>
      <p className={`mt-0.5 truncate text-[17px] font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}
