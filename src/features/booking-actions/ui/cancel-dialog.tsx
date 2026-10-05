"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Ban, Loader2 } from "lucide-react";
import type { Booking, BookingRepository, BookingWorkspaceRepository, CancellationQuote } from "@/entities/booking";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/format";
import { Button, Textarea, useMutationFeedback, ActionDialog, Field } from "@/shared/ui";

/** Server minimum for a cancellation reason. */
const REASON_MIN = 10;

type Props = {
  booking: Booking;
  repository: BookingRepository;
  workspace: BookingWorkspaceRepository;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled: (booking: Booking) => void;
};

/** Shows the policy penalty for cancelling today, then cancels with a reason. */
export function CancelBookingDialog({ booking, repository, workspace, open, onOpenChange, onCancelled }: Props) {
  const t = useTranslations("bookingWorkspace");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const [quote, setQuote] = useState<CancellationQuote | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const transition = booking.allowedTransitions.find((tr) => tr.status === "cancelled");
  const money = (v: number) => formatMoney(v, locale, quote?.currency || booking.currency);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setQuote(null);
    let alive = true;
    workspace
      .cancellationQuote(booking.id)
      .then((q) => alive && setQuote(q))
      .catch((err) => alive && feedback.error(err, t("errors.load")));
    return () => {
      alive = false;
    };
  }, [open, booking.id, workspace, feedback, t]);

  async function submit() {
    if (!transition) return;
    setSaving(true);
    try {
      const updated = await repository.changeStatus(booking.id, {
        status: "cancelled",
        reason: reason.trim(),
        override: transition.requiresOverride || undefined,
      });
      feedback.success(t("cancel.done"));
      onCancelled(updated);
      onOpenChange(false);
    } catch (err) {
      feedback.error(err, t("errors.save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={Ban}
      tone="rose"
      title={t("cancel.title")}
      description={t("cancel.hint")}
      testId="booking-cancel-dialog"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button
            className="bg-rose-600 text-white hover:bg-rose-700"
            disabled={!transition || saving || reason.trim().length < REASON_MIN}
            onClick={() => void submit()}
            data-testid="booking-cancel-submit"
          >
            {t("cancel.submit")}
          </Button>
        </>
      }
    >
      {!transition ? <p className="rounded-2xl bg-amber-50 p-3 text-[13px] text-amber-900">{t("cancel.notAllowed")}</p> : null}
      {quote ? (
        <div className="rounded-[22px] bg-gradient-to-br from-rose-50 via-white to-white p-4 ring-1 ring-rose-100" data-testid="booking-cancel-quote">
          <p className="text-[12.5px] font-semibold text-rose-700">{t("cancel.days", { n: quote.daysToDeparture })}</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <QuoteFigure label={t("cancel.penalty", { pct: quote.penaltyPct })} value={money(quote.penaltyAmt)} strong />
            <QuoteFigure label={t("cancel.collected")} value={money(quote.collectedAmt)} />
            <QuoteFigure label={t("cancel.refundable")} value={money(quote.refundableAmt)} />
          </div>
          <div className="mt-4">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-zinc-400">{t("cancel.policy")}</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {quote.policy.map((tier) => (
                <li
                  key={tier.minDays}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11.5px] font-semibold",
                    tier.penaltyPct === quote.penaltyPct && quote.penaltyPct > 0 ? "bg-rose-600 text-white" : "bg-zinc-100 text-zinc-600",
                  )}
                >
                  {t("cancel.tier", { days: tier.minDays, pct: tier.penaltyPct })}
                </li>
              ))}
            </ul>
          </div>
          {quote.refundableAmt > 0 ? <p className="mt-3 text-[12px] text-zinc-500">{t("cancel.refundNote")}</p> : null}
        </div>
      ) : (
        <div className="flex h-28 items-center justify-center rounded-[22px] bg-zinc-50">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" aria-label={tc("loading")} />
        </div>
      )}
      <Field label={t("cancel.reason")} htmlFor="bc-reason">
        <Textarea
          id="bc-reason"
          rows={3}
          maxLength={500}
          value={reason}
          placeholder={t("cancel.reasonPlaceholder")}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
    </ActionDialog>
  );
}

function QuoteFigure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11.5px] font-medium text-zinc-500">{label}</p>
      <p className={cn("mt-0.5 truncate text-[16px] font-semibold tabular-nums", strong ? "text-rose-700" : "text-zinc-950")}>{value}</p>
    </div>
  );
}
