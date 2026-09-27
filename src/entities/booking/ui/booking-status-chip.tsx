"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { BOOKING_STATUS_TONES } from "../lib/status-tone";
import { isBookingStatus } from "../model";

type Props = {
  status: string;
  className?: string;
};

export function BookingStatusChip({ status, className }: Props) {
  const t = useTranslations("bookings.status");
  const known = isBookingStatus(status);
  const tone = known ? BOOKING_STATUS_TONES[status] : BOOKING_STATUS_TONES.draft;
  return (
    <span
      data-testid="booking-status-chip"
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        tone.chip,
        className,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
      {known ? t(status) : status}
    </span>
  );
}
