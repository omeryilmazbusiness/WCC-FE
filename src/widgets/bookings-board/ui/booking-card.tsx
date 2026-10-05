"use client";

import { useTranslations } from "next-intl";
import { PaymentStatusBadge, ServiceTypeBadge, TicketStatusBadge, type Booking } from "@/entities/booking";
import { cn } from "@/shared/lib/cn";
import { AgentCell, FinanceCell, PartyCell, RefCell, TtlCell } from "./booking-cells";

type Props = { booking: Booking; onOpen: (booking: Booking) => void };

/** Mobile / tablet row: the same facts as the table, stacked. */
export function BookingCard({ booking: b, onOpen }: Props) {
  const t = useTranslations("bookingWorkspace.list");
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${t("open")} ${b.refCode}`}
      onClick={() => onOpen(b)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(b);
        }
      }}
      data-testid="booking-card"
      className={cn(
        "cursor-pointer rounded-[24px] border border-zinc-200/70 bg-white p-4 shadow-[0_14px_40px_-34px_rgba(15,23,42,0.5)] outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-indigo-400",
        b.status === "cancelled" && "opacity-75",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <PartyCell booking={b} />
        <AgentCell booking={b} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <ServiceTypeBadge type={b.serviceType} />
        <TicketStatusBadge status={b.ticketStatus} />
        <PaymentStatusBadge status={b.paymentStatus} />
        <TtlCell booking={b} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3 border-t border-zinc-100 pt-3">
        <RefCell booking={b} />
        <FinanceCell booking={b} />
      </div>
    </div>
  );
}
