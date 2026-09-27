"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";
import {
  SYSTEM_DRIVEN_STATUSES,
  type Booking,
  type BookingRepository,
  type BookingStatus,
} from "@/entities/booking";
import { useCan } from "@/entities/viewer";
import { Button } from "@/shared/ui";
import { StatusTransitionDialog } from "./status-transition-dialog";

type Props = {
  booking: Booking;
  repository: BookingRepository;
  /** Receives the updated booking, or `null` when it must be reloaded (stale transition). */
  onChanged: (booking: Booking | null) => void;
};

/** One button per server-provided `allowed_transitions` entry — no client-side state machine. */
export function BookingStatusActions({ booking, repository, onChanged }: Props) {
  const t = useTranslations("bookingStatus");
  const canWrite = useCan("bookings.write");
  const [target, setTarget] = useState<BookingStatus | null>(null);
  const [guardsByStatus, setGuardsByStatus] = useState<Partial<Record<BookingStatus, string[]>>>({});

  if (!canWrite || booking.allowedTransitions.length === 0) return null;
  const transition = booking.allowedTransitions.find((tr) => tr.status === target) ?? null;

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="booking-status-actions">
      {booking.allowedTransitions.map((tr) => (
        <Button
          key={tr.status}
          type="button"
          size="sm"
          variant={
            tr.status === "cancelled"
              ? "ghost"
              : SYSTEM_DRIVEN_STATUSES.includes(tr.status) || tr.requiresOverride
                ? "outline"
                : "default"
          }
          className={tr.status === "cancelled" ? "text-rose-700 hover:text-rose-800" : undefined}
          onClick={() => setTarget(tr.status)}
          title={SYSTEM_DRIVEN_STATUSES.includes(tr.status) ? t("systemDrivenHint") : undefined}
          data-testid={`status-action-${tr.status}`}
        >
          {tr.requiresOverride ? <ShieldAlert aria-hidden className="h-3.5 w-3.5" /> : null}
          {t(`actions.${tr.status}`)}
        </Button>
      ))}
      {transition ? (
        <StatusTransitionDialog
          key={`${booking.id}-${transition.status}`}
          booking={booking}
          transition={transition}
          repository={repository}
          knownGuards={guardsByStatus[transition.status] ?? []}
          onGuards={(guards) =>
            setGuardsByStatus((prev) => ({ ...prev, [transition.status]: guards }))
          }
          onOpenChange={(open) => !open && setTarget(null)}
          onChanged={(updated) => {
            setGuardsByStatus({});
            onChanged(updated);
          }}
        />
      ) : null}
    </div>
  );
}
