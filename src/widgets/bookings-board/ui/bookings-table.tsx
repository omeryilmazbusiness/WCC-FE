"use client";

import type { KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { PaymentStatusBadge, ServiceTypeBadge, TicketStatusBadge, type Booking } from "@/entities/booking";
import { cn } from "@/shared/lib/cn";
import { AgentCell, FinanceCell, PartyCell, RefCell, SupplierCell, TtlCell } from "./booking-cells";

type Props = { rows: Booking[]; onOpen: (booking: Booking) => void; activeId: string | null };

const openOnKey = (e: KeyboardEvent, fn: () => void) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
};

/** Desktop smart table; the whole row opens the booking workspace. */
export function BookingsTable({ rows, onOpen, activeId }: Props) {
  const t = useTranslations("bookingWorkspace.list");
  const th = "px-3 py-3 text-start text-[11.5px] font-semibold uppercase tracking-wide text-zinc-400";
  return (
    <div className="hidden overflow-hidden rounded-[26px] border border-zinc-200/70 bg-white shadow-[0_18px_50px_-40px_rgba(15,23,42,0.5)] lg:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-separate border-spacing-0" data-testid="bookings-table">
          <thead className="bg-zinc-50/80">
            <tr>
              <th className={cn(th, "ps-5")}>{t("columns.booking")}</th>
              <th className={th}>{t("columns.customer")}</th>
              <th className={th}>{t("columns.service")}</th>
              <th className={th}>{t("columns.supplier")}</th>
              <th className={th}>{t("columns.ticket")}</th>
              <th className={th}>{t("columns.payment")}</th>
              <th className={th}>{t("columns.ttl")}</th>
              <th className={cn(th, "text-end")}>{t("columns.finance")}</th>
              <th className={cn(th, "pe-5 text-center")}>{t("columns.agent")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr
                key={b.id}
                tabIndex={0}
                role="button"
                aria-label={`${t("open")} ${b.refCode}`}
                onClick={() => onOpen(b)}
                onKeyDown={(e) => openOnKey(e, () => onOpen(b))}
                data-testid="booking-row"
                className={cn(
                  "group cursor-pointer outline-none transition-colors hover:bg-indigo-50/40 focus-visible:bg-indigo-50/60",
                  activeId === b.id && "bg-indigo-50/60",
                  b.status === "cancelled" && "opacity-70",
                )}
              >
                <td className="border-t border-zinc-100 py-3 pe-3 ps-5 align-middle">
                  <RefCell booking={b} />
                </td>
                <td className="max-w-[280px] border-t border-zinc-100 px-3 py-3 align-middle">
                  <PartyCell booking={b} />
                </td>
                <td className="border-t border-zinc-100 px-3 py-3 align-middle">
                  <ServiceTypeBadge type={b.serviceType} />
                </td>
                <td className="border-t border-zinc-100 px-3 py-3 align-middle">
                  <SupplierCell booking={b} />
                </td>
                <td className="border-t border-zinc-100 px-3 py-3 align-middle">
                  <TicketStatusBadge status={b.ticketStatus} />
                </td>
                <td className="border-t border-zinc-100 px-3 py-3 align-middle">
                  <PaymentStatusBadge status={b.paymentStatus} />
                </td>
                <td className="border-t border-zinc-100 px-3 py-3 align-middle">
                  <TtlCell booking={b} />
                </td>
                <td className="border-t border-zinc-100 px-3 py-3 align-middle">
                  <FinanceCell booking={b} />
                </td>
                <td className="border-t border-zinc-100 py-3 pe-5 ps-3 text-center align-middle">
                  <span className="inline-flex items-center gap-1">
                    <AgentCell booking={b} />
                    <ChevronRight className="h-4 w-4 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-500 rtl:rotate-180" aria-hidden />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
