"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Booking,
  BookingChecklistItem,
  BookingLineItem,
  BookingParticipant,
  BookingReadiness,
  BookingRepository,
} from "@/entities/booking";
import type { CustomerRepository } from "@/entities/customer";
import type { TourPackage, TourPackageRepository } from "@/entities/tourpackage";

export type WorkspaceContact = { name: string; phone: string; email: string };

export type BookingWorkspaceState = {
  booking: Booking | null;
  participants: BookingParticipant[];
  lines: BookingLineItem[];
  checklist: BookingChecklistItem[];
  readiness: BookingReadiness | null;
  contact: WorkspaceContact;
  pkg: TourPackage | null;
  error: unknown;
  loading: boolean;
  refresh: () => Promise<void>;
  /** Applies a booking returned by a mutation, then reloads the rest in the background. */
  apply: (booking: Booking | null) => void;
};

type Deps = {
  bookings: BookingRepository;
  customers: CustomerRepository;
  packages: TourPackageRepository;
};

const EMPTY_CONTACT: WorkspaceContact = { name: "", phone: "", email: "" };

/**
 * Loads everything the booking workspace shows. Secondary reads (customer contact,
 * package spec) never fail the screen: a missing customer or package just hides details.
 */
export function useBookingWorkspace(bookingId: string, { bookings, customers, packages }: Deps): BookingWorkspaceState {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [participants, setParticipants] = useState<BookingParticipant[]>([]);
  const [lines, setLines] = useState<BookingLineItem[]>([]);
  const [checklist, setChecklist] = useState<BookingChecklistItem[]>([]);
  const [readiness, setReadiness] = useState<BookingReadiness | null>(null);
  const [contact, setContact] = useState<WorkspaceContact>(EMPTY_CONTACT);
  const [pkg, setPkg] = useState<TourPackage | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const gen = ++generation.current;
    setLoading(true);
    try {
      const [b, p, l, c, r] = await Promise.all([
        bookings.getById(bookingId),
        bookings.listParticipants(bookingId),
        bookings.listLineItems(bookingId),
        bookings.listChecklist(bookingId),
        bookings.readiness(bookingId).catch(() => null),
      ]);
      if (gen !== generation.current) return;
      setBooking(b);
      setParticipants(p);
      setLines(l);
      setChecklist(c);
      setReadiness(r);
      setError(null);

      const [customer, pack] = await Promise.all([
        b.customerId ? customers.getById(b.customerId).catch(() => null) : Promise.resolve(null),
        b.info.packageId ? packages.getPackage(b.info.packageId).catch(() => null) : Promise.resolve(null),
      ]);
      if (gen !== generation.current) return;
      setContact(
        customer
          ? { name: customer.fullName || customer.fullNameAr, phone: customer.phone, email: customer.email }
          : { ...EMPTY_CONTACT, name: b.info.customerName },
      );
      setPkg(pack);
    } catch (err) {
      if (gen === generation.current) setError(err);
    } finally {
      if (gen === generation.current) setLoading(false);
    }
  }, [bookingId, bookings, customers, packages]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const apply = useCallback(
    (updated: Booking | null) => {
      if (updated) setBooking(updated);
      void refresh();
    },
    [refresh],
  );

  return { booking, participants, lines, checklist, readiness, contact, pkg, error, loading, refresh, apply };
}
