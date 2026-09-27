"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import type { Booking, BookingRepository } from "@/entities/booking";
import { useCan } from "@/entities/viewer";
import { formatMoney } from "@/shared/lib/format";
import { minorToInput, parseMoneyInput } from "@/shared/lib/money";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  useMutationFeedback,
} from "@/shared/ui";

type Props = {
  booking: Booking;
  repository: BookingRepository;
  onSaved: (booking: Booking) => void;
};

/** Discount changes need `bookings.discount` (the backend audits them as `booking.discount_changed`). */
export function EditDiscountDialog({ booking, repository, onSaved }: Props) {
  const t = useTranslations("bookings.discount");
  const locale = useLocale();
  const allowed = useCan("bookings.discount");
  const feedback = useMutationFeedback();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(() => minorToInput(booking.discountAmt));
  const [busy, setBusy] = useState(false);

  if (!allowed) return null;

  const minor = parseMoneyInput(value);
  const ready = !busy && minor !== null && minor !== booking.discountAmt;

  function change(next: boolean) {
    if (busy) return;
    if (next) setValue(minorToInput(booking.discountAmt));
    setOpen(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || minor === null) return;
    setBusy(true);
    try {
      const updated = await repository.update(booking.id, {
        paxCount: booking.paxCount,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        discountAmt: minor,
      });
      feedback.success(t("saved"));
      setBusy(false);
      setOpen(false);
      onSaved(updated);
    } catch (err) {
      setBusy(false);
      feedback.error(err, t("saveError"));
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2"
        onClick={() => change(true)}
        aria-label={t("edit")}
        data-testid="discount-edit"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={change}>
        <DialogContent className="sm:max-w-sm" data-testid="discount-dialog">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>
              {t("description", { current: formatMoney(booking.discountAmt, locale, booking.currency) })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="discount-amount">{t("amountIn", { currency: booking.currency })}</Label>
              <Input
                id="discount-amount"
                dir="ltr"
                inputMode="decimal"
                value={value}
                disabled={busy}
                onChange={(e) => setValue(e.target.value)}
                aria-invalid={minor === null}
              />
              {minor === null ? <p className="text-xs text-red-600">{t("invalid")}</p> : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" disabled={busy} onClick={() => change(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={!ready}>
                {t("save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
