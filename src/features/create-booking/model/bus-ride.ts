import { emptyService, newKey, type BookingDraft, type BusRide } from "./draft";
export { BUS_CLASSES, type BusClass, type BusRide } from "./draft";

export function emptyBusRide(seats = 1): BusRide {
  return {
    key: newKey("bus"),
    company: "",
    companyPhone: "",
    origin: "",
    destination: "",
    pickup: "",
    dropoff: "",
    departDate: "",
    departTime: "",
    arriveDate: "",
    arriveTime: "",
    vehicleClass: "standard",
    plateNo: "",
    seats: Math.max(1, seats),
    seatNumbers: "",
    driverName: "",
    driverPhone: "",
    confirmation: "",
    unitPrice: "0",
    unitCost: "0",
    notes: "",
  };
}

export function busRideLabel(ride: BusRide): string {
  const company = ride.company.trim();
  const route = [ride.origin.trim(), ride.destination.trim()].filter(Boolean).join("–");
  const when = [ride.departDate, ride.departTime].filter(Boolean).join(" ");
  return [company, route, when].filter(Boolean).join(" · ").slice(0, 160);
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

export function busRideIssues(ride: BusRide): string[] {
  const out: string[] = [];
  if (ride.company.trim().length < 2) out.push("company");
  if (!ride.origin.trim()) out.push("origin");
  if (!ride.destination.trim()) out.push("destination");
  if (!DAY.test(ride.departDate)) out.push("departDate");
  if (ride.departTime && !CLOCK.test(ride.departTime)) out.push("departTime");
  if (ride.arriveDate && !DAY.test(ride.arriveDate)) out.push("arriveDate");
  if (ride.arriveTime && !CLOCK.test(ride.arriveTime)) out.push("arriveTime");
  if (ride.arriveDate && DAY.test(ride.departDate) && ride.arriveDate < ride.departDate) out.push("arriveDate");
  if (!Number.isInteger(ride.seats) || ride.seats < 1 || ride.seats > 80) out.push("seats");
  if (ride.confirmation && !/^[A-Za-z0-9][A-Za-z0-9-]{0,31}$/.test(ride.confirmation.trim())) out.push("confirmation");
  return out;
}

function clean(ride: BusRide): BusRide {
  return {
    ...ride,
    company: ride.company.trim(),
    companyPhone: ride.companyPhone.trim(),
    origin: ride.origin.trim(),
    destination: ride.destination.trim(),
    pickup: ride.pickup.trim(),
    dropoff: ride.dropoff.trim(),
    plateNo: ride.plateNo.trim().toUpperCase(),
    seatNumbers: ride.seatNumbers.trim(),
    driverName: ride.driverName.trim(),
    driverPhone: ride.driverPhone.trim(),
    confirmation: ride.confirmation.trim().toUpperCase(),
    notes: ride.notes.trim(),
    unitPrice: ride.unitPrice.trim() || "0",
    unitCost: ride.unitCost.trim() || "0",
  };
}

function upsertBusLine(draft: BookingDraft, ride: BusRide) {
  const label = busRideLabel(ride);
  const line = {
    ...emptyService("bus"),
    key: ride.key,
    label,
    quantity: Math.max(1, ride.seats),
    unitPrice: ride.unitPrice,
    unitCost: ride.unitCost,
  };
  const i = draft.services.findIndex((s) => s.key === ride.key);
  if (i >= 0) return draft.services.map((s, n) => (n === i ? { ...s, ...line, key: s.key, travellerKeys: s.travellerKeys } : s));
  const onlyBlank = draft.services.length === 1 && !draft.services[0].label.trim();
  if (onlyBlank) return [{ ...draft.services[0], ...line, key: ride.key }];
  return [...draft.services, line];
}

/** Writes a coach onto the trip header and a transport line item. */
export function applyBusRide(draft: BookingDraft, raw: BusRide): Partial<BookingDraft> {
  const ride = clean(raw);
  const buses = draft.buses.some((b) => b.key === ride.key)
    ? draft.buses.map((b) => (b.key === ride.key ? ride : b))
    : [...draft.buses, ride];
  return {
    serviceType: "bus",
    buses,
    summary: buses.map(busRideLabel).filter(Boolean).join(" · ").slice(0, 160),
    supplierSource: draft.supplierSource || "other",
    services: upsertBusLine({ ...draft, buses }, ride),
  };
}

export function removeBusRide(draft: BookingDraft, key: string): Partial<BookingDraft> {
  const buses = draft.buses.filter((b) => b.key !== key);
  const leftover = draft.services.filter((s) => s.key !== key);
  const services = leftover.length ? leftover : [emptyService(buses.length ? "bus" : "package")];
  return {
    buses,
    services,
    summary: buses.map(busRideLabel).filter(Boolean).join(" · ").slice(0, 160),
  };
}
