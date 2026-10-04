"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, Plane, UsersRound } from "lucide-react";
import { BookingStatusChip, type Booking } from "@/entities/booking";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { formatDate, formatMoney } from "@/shared/lib/format";
import { EmptyState, TONES } from "@/shared/ui";

type Props = {
  bookings: Booking[];
  /** "New booking" trigger, when the viewer may create bookings. */
  action?: ReactNode;
};

export function BookingsTab({ bookings, action }: Props) {
  const t = useTranslations("customers.profile.bookings");
  const locale = useLocale();

  if (bookings.length === 0) {
    return (
      <div className="space-y-3" data-testid="customer-bookings">
        <EmptyState icon={Plane} title={t("empty")} description={t("emptyHint")} />
        {action ? <div className="flex justify-center">{action}</div> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="customer-bookings">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-zinc-500">{t("count", { count: bookings.length })}</p>
        {action}
      </div>
      <ul className="grid gap-3 lg:grid-cols-2">
        {bookings.map((b) => {
          const paidPct = b.totalAmount > 0 ? Math.min(100, Math.round((b.collectedAmt / b.totalAmount) * 100)) : 0;
          const settled = b.balanceAmt <= 0 && b.totalAmount > 0;
          return (
            <li key={b.id}>
              <Link
                href={routes.booking(b.id)}
                className="group flex flex-col gap-4 rounded-[26px] border border-zinc-200/60 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-26px_rgba(15,23,42,0.45)]"
                data-testid="customer-booking"
              >
                <div className="flex items-center gap-3">
                  <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]", TONES.sky.gradient)} aria-hidden>
                    <Plane className="h-6 w-6" strokeWidth={2.1} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[14px] font-semibold tracking-wide text-zinc-950">#{b.id.slice(0, 8).toUpperCase()}</p>
                    <p className="flex items-center gap-1.5 truncate text-[12px] font-medium text-zinc-500">
                      <UsersRound className="h-3.5 w-3.5" aria-hidden />
                      {t("pax", { count: b.paxCount })}
                      <span aria-hidden>·</span>
                      {formatDate(b.createdAt, locale)}
                    </p>
                  </div>
                  <BookingStatusChip status={b.status} />
                  <ChevronRight className="h-4 w-4 text-zinc-300 transition group-hover:text-zinc-500 rtl:rotate-180" aria-hidden />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Figure label={t("total")} value={formatMoney(b.totalAmount, locale, b.currency)} />
                  <Figure label={t("paid")} value={formatMoney(b.collectedAmt, locale, b.currency)} tone="emerald" />
                  <Figure
                    label={t("balance")}
                    value={settled ? t("settled") : formatMoney(b.balanceAmt, locale, b.currency)}
                    tone={settled ? "emerald" : b.balanceAmt > 0 ? "amber" : undefined}
                  />
                </div>

                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100" role="progressbar" aria-valuenow={paidPct} aria-valuemin={0} aria-valuemax={100} aria-label={t("paid")}>
                    <div
                      className={cn("h-full rounded-full transition-all", settled ? "bg-emerald-500" : "bg-gradient-to-r from-sky-400 to-indigo-500")}
                      style={{ width: `${paidPct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11.5px] font-medium tabular-nums text-zinc-400">{t("paidPct", { pct: paidPct })}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "amber" }) {
  return (
    <div className="min-w-0 rounded-2xl bg-zinc-50/90 px-3 py-2">
      <p className="truncate text-[11px] font-medium text-zinc-400">{label}</p>
      <p className={cn("truncate text-[14px] font-semibold tabular-nums", tone ? TONES[tone].text : "text-zinc-900")}>{value}</p>
    </div>
  );
}
