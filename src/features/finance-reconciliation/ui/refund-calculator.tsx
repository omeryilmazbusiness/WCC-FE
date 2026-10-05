"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Calculator, Link2, RotateCcw } from "lucide-react";
import { BookingPicker, createBookingRepository, type Booking } from "@/entities/booking";
import { settleRefund, type FinanceRepository, type RefundQuote, type RefundSettlement } from "@/entities/finance";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/format";
import { parseMoneyInput } from "@/shared/lib/money";
import { Field, IconInput, MoneyInput, SwitchRow, TONES, type Tone } from "@/shared/ui";

/**
 * Offsets a cancellation: what the customer gets back, what the supplier returns, and what the
 * agency keeps. With a booking linked the server fills paid and cost from the ledger.
 */
export function RefundCalculator({ repository }: { repository: FinanceRepository }) {
  const t = useTranslations("financeHub");
  const locale = useLocale();
  const bookings = useMemo(() => createBookingRepository(), []);
  const [linked, setLinked] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [currency, setCurrency] = useState("SAR");
  const [paid, setPaid] = useState("");
  const [cost, setCost] = useState("");
  const [penalty, setPenalty] = useState("");
  const [fee, setFee] = useState("");
  const [quote, setQuote] = useState<RefundQuote | null>(null);
  const search = useCallback((q: string) => bookings.list({ q }), [bookings]);

  const num = (v: string) => (v.trim() ? parseMoneyInput(v) : 0);
  const penaltyMinor = num(penalty);
  const feeMinor = num(fee);
  const paidMinor = num(paid);
  const costMinor = num(cost);

  useEffect(() => {
    if (!linked || !booking || penaltyMinor === null || feeMinor === null) {
      setQuote(null);
      return;
    }
    let live = true;
    const h = window.setTimeout(() => {
      repository
        .quoteRefund({ bookingId: booking.id, supplierPenalty: penaltyMinor, serviceFee: feeMinor })
        .then((q) => live && setQuote(q))
        .catch(() => live && setQuote(null));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(h);
    };
  }, [linked, booking, penaltyMinor, feeMinor, repository]);

  const local: RefundSettlement | null =
    !linked && paidMinor !== null && costMinor !== null && penaltyMinor !== null && feeMinor !== null && paidMinor > 0
      ? settleRefund({ paid: paidMinor, supplierCost: costMinor, supplierPenalty: penaltyMinor, serviceFee: feeMinor })
      : null;
  const s = linked ? (quote?.settlement ?? null) : local;
  const cur = linked ? (quote?.currency ?? booking?.currency ?? currency) : currency;
  const money = (v: number) => formatMoney(v, locale, cur || "SAR");

  return (
    <div className="space-y-4" data-testid="refund-calculator">
      <SwitchRow icon={Link2} tone="indigo" label={t("recon.useBooking")} hint={t("recon.useBookingHint")} checked={linked} onChange={setLinked} />
      {linked ? (
        <BookingPicker
          search={search}
          value={booking}
          onChange={setBooking}
          placeholder={t("bookingSearch")}
          emptyLabel={t("bookingEmpty")}
          formatAmount={(b) => formatMoney(b.collectedAmt, locale, b.currency)}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-[110px_1fr_1fr]">
          <Field label={t("currency")} htmlFor="rf-cur">
            <IconInput id="rf-cur" icon={RotateCcw} dir="ltr" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))} />
          </Field>
          <Field label={t("recon.paid")} htmlFor="rf-paid">
            <MoneyInput id="rf-paid" currency={currency || "—"} value={paid} onChange={setPaid} data-testid="rf-paid" />
          </Field>
          <Field label={t("recon.supplierCost")} htmlFor="rf-cost">
            <MoneyInput id="rf-cost" currency={currency || "—"} value={cost} onChange={setCost} data-testid="rf-cost" />
          </Field>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("recon.penalty")} htmlFor="rf-pen" hint={t("recon.penaltyHint")}>
          <MoneyInput id="rf-pen" currency={cur || "—"} value={penalty} onChange={setPenalty} data-testid="rf-penalty" />
        </Field>
        <Field label={t("recon.serviceFee")} htmlFor="rf-fee" hint={t("recon.serviceFeeHint")}>
          <MoneyInput id="rf-fee" currency={cur || "—"} value={fee} onChange={setFee} data-testid="rf-fee" />
        </Field>
      </div>

      {s ? (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4" data-testid="refund-result">
          <ResultTile tone="emerald" label={t("recon.customerRefund")} value={money(s.customerRefund)} />
          <ResultTile tone="sky" label={t("recon.supplierRefund")} value={money(s.supplierRefund)} />
          <ResultTile tone="violet" label={t("recon.retained")} value={money(s.retained)} />
          <ResultTile tone={s.agencyResult >= 0 ? "emerald" : "rose"} label={t("recon.agencyResult")} value={money(s.agencyResult)} />
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-[20px] bg-zinc-50 p-4 text-[12.5px] text-zinc-500">
          <Calculator className="h-4 w-4" aria-hidden />
          {t("recon.calcEmpty")}
        </div>
      )}
      {s && s.shortfall > 0 ? <p className="text-[12.5px] font-semibold text-rose-700">{t("recon.shortfall", { amount: money(s.shortfall) })}</p> : null}
    </div>
  );
}

function ResultTile({ tone, label, value }: { tone: Tone; label: string; value: string }) {
  return (
    <div className={cn("rounded-[20px] bg-gradient-to-br p-3.5 ring-1 ring-inset ring-zinc-900/[0.04]", TONES[tone].tint)}>
      <div className="text-[11.5px] font-semibold text-zinc-500">{label}</div>
      <div className={cn("mt-1 text-[17px] font-bold tabular-nums", TONES[tone].text)}>{value}</div>
    </div>
  );
}
