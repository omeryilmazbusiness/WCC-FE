import type { BookingStatus, PaymentStatus } from "../model";

/** Statuses that occupy departure capacity — mirrors domain/booking.ConsumesSeat. */
const SEAT_HOLDING: ReadonlySet<BookingStatus> = new Set([
  "option_hold",
  "confirmed",
  "partially_paid",
  "ready",
  "travelled",
  "completed",
]);

export function consumesSeat(status: BookingStatus): boolean {
  return SEAT_HOLDING.has(status);
}

export function isFullyPaid(paymentStatus: PaymentStatus): boolean {
  return paymentStatus === "paid";
}

/** Seat held and the booking is settled — a reserved, paid customer. */
export function isPaidReserved(b: { status: BookingStatus; paymentStatus: PaymentStatus }): boolean {
  return consumesSeat(b.status) && isFullyPaid(b.paymentStatus);
}
