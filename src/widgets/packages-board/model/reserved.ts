import { isPaidReserved } from "@/entities/booking/lib/lifecycle";
import type { Booking } from "@/entities/booking/model";

export type ReservedSummary = {
  reservations: number;
  customers: number;
  pax: number;
};

/** Paid bookings that still occupy a seat on this package. */
export function reservedBookings<T extends { status: Booking["status"]; paymentStatus: Booking["paymentStatus"] }>(
  rows: readonly T[],
): T[] {
  return rows.filter(isPaidReserved);
}

export function summarizeReserved(
  rows: readonly Pick<Booking, "status" | "paymentStatus" | "paxCount" | "customerId">[],
): ReservedSummary {
  const reserved = reservedBookings(rows);
  return {
    reservations: reserved.length,
    customers: new Set(reserved.map((r) => r.customerId).filter(Boolean)).size,
    pax: reserved.reduce((n, r) => n + (r.paxCount || 0), 0),
  };
}

/** Newest departure first, then the most recently updated booking. */
export function orderReserved<T extends { updatedAt: string; info: { departDate: string | null } }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    const da = a.info.departDate ?? "";
    const db = b.info.departDate ?? "";
    if (da !== db) return db.localeCompare(da);
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}
