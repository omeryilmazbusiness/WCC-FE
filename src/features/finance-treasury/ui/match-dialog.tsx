"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Ban, Link2 } from "lucide-react";
import { BookingPicker, createBookingRepository, type Booking } from "@/entities/booking";
import { extractRefs, refCode, type FinanceRepository, type Movement } from "@/entities/finance";
import { formatMoney } from "@/shared/lib/format";
import { ActionDialog, Button, useMutationFeedback } from "@/shared/ui";

type Props = {
  repository: FinanceRepository;
  movement: Movement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
};

/** Closes an open account: links an unmatched bank credit to a booking, which records the payment. */
export function MatchDialog({ repository, movement, open, onOpenChange, onDone }: Props) {
  const t = useTranslations("financeHub");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const bookings = useMemo(() => createBookingRepository(), []);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState<"match" | "ignore" | null>(null);

  useEffect(() => {
    if (open) setBooking(null);
  }, [open]);

  const hint = useMemo(() => {
    const refs = extractRefs(`${movement.reference} ${movement.counterparty} ${movement.note}`);
    if (refs.refNos[0]) return refCode(refs.refNos[0]);
    return refs.pnrs[0] ?? "";
  }, [movement]);
  const search = useCallback((q: string) => bookings.list({ q }), [bookings]);
  const mismatch = booking !== null && booking.currency !== movement.currency;

  async function run(kind: "match" | "ignore") {
    if (busy) return;
    setBusy(kind);
    try {
      if (kind === "match" && booking) await repository.matchMovement(movement.id, booking.id);
      else await repository.ignoreMovement(movement.id);
      feedback.success(kind === "match" ? t("treasury.matched") : t("treasury.ignored"));
      onDone();
      onOpenChange(false);
    } catch (e) {
      feedback.error(e, t("saveError"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Link2}
      tone="emerald"
      size="lg"
      title={t("treasury.matchTitle")}
      description={t("treasury.matchHint")}
      testId="finance-match-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button variant="secondary" disabled={busy !== null} onClick={() => void run("ignore")} data-testid="finance-ignore">
            <Ban className="h-4 w-4" aria-hidden />
            {t("treasury.ignore")}
          </Button>
          <Button disabled={!booking || mismatch || busy !== null} onClick={() => void run("match")} data-testid="finance-match-submit">
            {busy === "match" ? t("saving") : t("treasury.match")}
          </Button>
        </>
      }
    >
      <div className="rounded-[22px] bg-gradient-to-br from-emerald-50 via-white to-white p-4 ring-1 ring-inset ring-emerald-100">
        <p className="text-[24px] font-semibold tabular-nums text-emerald-700">+{formatMoney(movement.amount, locale, movement.currency)}</p>
        <p className="mt-1 truncate text-[13px] text-zinc-600">
          {movement.occurredOn} · {movement.counterparty || "—"} · {movement.reference || movement.note || "—"}
        </p>
      </div>
      <BookingPicker
        search={search}
        value={booking}
        onChange={setBooking}
        initialQuery={hint}
        placeholder={t("bookingSearch")}
        emptyLabel={t("bookingEmpty")}
        formatAmount={(b) => formatMoney(b.balanceAmt, locale, b.currency)}
        testId="match-picker"
      />
      {mismatch ? <p className="text-[12.5px] font-semibold text-rose-700">{t("treasury.currencyMismatch")}</p> : null}
    </ActionDialog>
  );
}
