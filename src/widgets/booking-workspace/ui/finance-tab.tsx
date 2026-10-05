"use client";

import { useLocale, useTranslations } from "next-intl";
import { Banknote, Coins, ListOrdered, PiggyBank, Receipt, TrendingUp, type LucideIcon } from "lucide-react";
import { bookingProfit, type Booking, type BookingLineItem, type BookingRepository } from "@/entities/booking";
import { useCan } from "@/entities/viewer";
import { BookingFinancePanel } from "@/widgets/booking-finance-panel";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/format";
import { TONES, type Tone } from "@/shared/ui";
import { LineItemsEditor } from "./line-items-editor";
import { WorkspaceSection } from "./section";

type Props = {
  booking: Booking;
  lines: BookingLineItem[];
  repository: BookingRepository;
  onBooking: (booking: Booking | null) => void;
};

export function FinanceTab({ booking, lines, repository, onBooking }: Props) {
  const t = useTranslations("bookingWorkspace.finance");
  const locale = useLocale();
  const canWrite = useCan("bookings.write");
  const money = (v: number) => formatMoney(v, locale, booking.currency);
  const p = bookingProfit(booking);

  return (
    <div className="space-y-4" data-testid="booking-tab-finance">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Tile icon={Coins} tone="zinc" label={t("net")} value={money(p.net)} hint={p.net === 0 ? t("noCost") : undefined} />
        <Tile icon={Banknote} tone="indigo" label={t("gross")} value={money(p.gross)} />
        <Tile
          icon={TrendingUp}
          tone={p.profit >= 0 ? "emerald" : "rose"}
          label={t("profit")}
          value={money(p.profit)}
          hint={[p.markupPct !== null ? t("markup", { pct: p.markupPct }) : "", p.marginPct !== null ? t("margin", { pct: p.marginPct }) : ""].filter(Boolean).join(" · ")}
        />
        <Tile
          icon={PiggyBank}
          tone={booking.balanceAmt > 0 ? "amber" : "emerald"}
          label={t("balance")}
          value={money(booking.balanceAmt)}
          hint={booking.info.refundedAmt > 0 ? `${t("refunded")}: ${money(booking.info.refundedAmt)}` : undefined}
        />
      </div>

      <WorkspaceSection icon={ListOrdered} tone="indigo" title={t("lines")}>
        <LineItemsEditor
          booking={booking}
          lines={lines}
          repository={repository}
          editable={canWrite && booking.status === "draft"}
          onSaved={(b) => onBooking(b)}
        />
      </WorkspaceSection>

      <WorkspaceSection icon={Receipt} tone="emerald" title={t("payments")}>
        <BookingFinancePanel booking={booking} bookingRepository={repository} onChanged={() => onBooking(null)} />
      </WorkspaceSection>
    </div>
  );
}

function Tile({ icon: Icon, tone, label, value, hint }: { icon: LucideIcon; tone: Tone; label: string; value: string; hint?: string }) {
  return (
    <div className={cn("rounded-[22px] border border-zinc-200/60 bg-gradient-to-br p-3.5", TONES[tone].tint)}>
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", TONES[tone].solid)} aria-hidden>
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <p className="mt-2.5 truncate text-[12px] font-medium text-zinc-500">{label}</p>
      <p className="truncate text-[18px] font-semibold tabular-nums text-zinc-950">{value}</p>
      {hint ? <p className="mt-0.5 truncate text-[11.5px] font-medium text-zinc-500">{hint}</p> : null}
    </div>
  );
}
