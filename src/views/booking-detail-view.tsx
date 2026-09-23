"use client";

import { createBookingRepository } from "@/entities/booking";
import { BookingDetailBoard } from "@/widgets/bookings-board";

const repo = createBookingRepository();

type Props = { bookingId: string };

export function BookingDetailView({ bookingId }: Props) {
  return <BookingDetailBoard bookingId={bookingId} repository={repo} />;
}
