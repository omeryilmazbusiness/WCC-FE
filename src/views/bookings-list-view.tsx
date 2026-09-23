"use client";

import { createBookingRepository } from "@/entities/booking";
import { BookingsListBoard } from "@/widgets/bookings-board";

const repo = createBookingRepository();

type Props = {
  customerId?: string;
  departureId?: string;
};

export function BookingsListView({ customerId, departureId }: Props) {
  return (
    <BookingsListBoard
      repository={repo}
      customerId={customerId}
      departureId={departureId}
    />
  );
}
