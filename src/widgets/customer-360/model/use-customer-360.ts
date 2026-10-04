"use client";

import { useMemo } from "react";
import { createBookingRepository, type Booking } from "@/entities/booking";
import { createCustomerRepository, customerStats, type CustomerRepository } from "@/entities/customer";
import { useCan } from "@/entities/viewer";
import { useApiQuery } from "@/shared/lib/use-api-query";

export const customerRepository: CustomerRepository = createCustomerRepository();
export const bookingRepository = createBookingRepository();

const NO_BOOKINGS: Booking[] = [];

/**
 * Everything the profile shows, loaded in parallel. Revisits render the last copy at
 * once (stale-while-revalidate) and realtime signals refresh the affected parts.
 */
export function useCustomer360(customerId: string) {
  const canBookings = useCan("bookings.read");

  const customer = useApiQuery(() => customerRepository.getById(customerId), [customerId], {
    cacheKey: ["customer", customerId],
    liveTopics: ["customer"],
  });
  const timeline = useApiQuery(() => customerRepository.timeline(customerId), [customerId], {
    cacheKey: ["customer.timeline", customerId],
    liveTopics: ["lead", "booking", "payment", "document", "task"],
  });
  const companions = useApiQuery(() => customerRepository.listCompanions(customerId), [customerId], {
    cacheKey: ["customer.companions", customerId],
    liveTopics: ["customer"],
  });
  const bookings = useApiQuery(
    () => (canBookings ? bookingRepository.list({ customerId }) : Promise.resolve(NO_BOOKINGS)),
    [customerId, canBookings],
    { cacheKey: ["customer.bookings", customerId, canBookings], liveTopics: ["booking", "payment"] },
  );

  const items = useMemo(() => timeline.data ?? [], [timeline.data]);
  const stats = useMemo(() => customerStats(items), [items]);

  async function reloadAll() {
    await Promise.all([customer.refresh(), timeline.refresh(), companions.refresh(), bookings.refresh()]);
  }

  return {
    customer,
    timeline: items,
    timelineLoading: timeline.loading && !timeline.data,
    companions: companions.data ?? [],
    companionsLoading: companions.loading && !companions.data,
    bookings: bookings.data ?? NO_BOOKINGS,
    bookingsLoading: bookings.loading && !bookings.data,
    canBookings,
    stats,
    reloadAll,
    refreshCompanions: companions.refresh,
  };
}

export type Customer360 = ReturnType<typeof useCustomer360>;
