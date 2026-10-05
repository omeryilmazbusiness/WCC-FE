"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { Booking, BookingReadiness, BookingRepository } from "@/entities/booking";
import { useCan } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, useMutationFeedback } from "@/shared/ui";

type Props = { booking: Booking; readiness: BookingReadiness; repository: BookingRepository; onChanged: () => void };

/** Confirm-readiness verdict with blockers, warnings and the manager override. */
export function ReadinessCard({ booking, readiness: r, repository, onChanged }: Props) {
  const t = useTranslations("bookings");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const canWrite = useCan("bookings.write");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const ok = r.can_confirm;

  async function submit() {
    try {
      await repository.overrideReadiness(booking.id, reason.trim());
      setOpen(false);
      setReason("");
      feedback.success(t("overrideReady"));
      onChanged();
    } catch (err) {
      feedback.error(err, t("saveError"));
    }
  }

  return (
    <section
      className={cn("rounded-[24px] border p-4", ok ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50")}
      data-testid="booking-readiness"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl text-white", ok ? "bg-emerald-500" : "bg-amber-500")} aria-hidden>
          {ok ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-zinc-950">{t("readiness")}</p>
          <p className="text-[12.5px] text-zinc-600">{ok ? t("readyToConfirm") : t("notReady")}</p>
        </div>
        {r.overrideActive ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11.5px] font-semibold text-amber-900">{t("overrideActive")}</span> : null}
        {canWrite && booking.status === "draft" && !r.overrideActive && !ok ? (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            {t("overrideReady")}
          </Button>
        ) : null}
      </div>
      {r.missingDocs.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {r.missingDocs.map((d) => (
            <li key={d} className="rounded-full bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-amber-800 ring-1 ring-amber-200">
              {d}
            </li>
          ))}
        </ul>
      ) : null}
      {[...r.blocking, ...r.warnings].length > 0 ? (
        <ul className="mt-2 list-disc space-y-0.5 ps-5 text-[12.5px]">
          {r.blocking.map((b) => (
            <li key={b} className="text-rose-700">
              {b}
            </li>
          ))}
          {r.warnings.map((w) => (
            <li key={w} className="text-amber-800">
              {w}
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("overrideReady")}</DialogTitle>
            <DialogDescription>{t("overrideReasonHint")}</DialogDescription>
          </DialogHeader>
          <Input placeholder={t("overrideReason")} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button disabled={!reason.trim()} onClick={() => void submit()}>
              {t("overrideReady")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
