import { emptyService, type BookingDraft, type FlightPick } from "./draft";

/** Maps a fare card onto the booking snapshot — no UI or HTTP types. */
export function flightPickFromOffer(offer: FlightPick): FlightPick {
  return {
    airline: offer.airline,
    airlineName: offer.airlineName,
    flightNumber: offer.flightNumber,
    origin: offer.origin,
    destination: offer.destination,
    originAirport: offer.originAirport,
    destinationAirport: offer.destinationAirport,
    localDeparture: offer.localDeparture,
    price: offer.price,
    currency: offer.currency,
    bookingUrl: offer.bookingUrl,
  };
}

export function flightSummary(pick: FlightPick): string {
  const code = [pick.airline, pick.flightNumber].filter(Boolean).join(" ").trim();
  const route = [pick.originAirport || pick.origin, pick.destinationAirport || pick.destination].filter(Boolean).join("–");
  return [code, route].filter(Boolean).join(" · ").slice(0, 160);
}

/** Writes the chosen fare onto the trip header and a flight line item. */
export function applyFlightPick(draft: BookingDraft, pick: FlightPick): Partial<BookingDraft> {
  const label = flightSummary(pick);
  const qty = Math.max(1, draft.travellers.filter((p) => p.fullName.trim()).length);
  const price = Number.isFinite(pick.price) ? String(pick.price) : "0";
  const line = { ...emptyService("flight"), label, quantity: qty, unitPrice: price, unitCost: "0" };
  const i = draft.services.findIndex((s) => s.kind === "flight");
  const onlyBlank = draft.services.length === 1 && !draft.services[0].label.trim();
  const services =
    i >= 0
      ? draft.services.map((s, n) => (n === i ? { ...s, ...line, key: s.key, travellerKeys: s.travellerKeys } : s))
      : onlyBlank
        ? [{ ...draft.services[0], ...line, key: draft.services[0].key }]
        : [line, ...draft.services];
  return {
    serviceType: "flight",
    flight: pick,
    summary: label,
    currency: pick.currency || draft.currency,
    supplierSource: draft.supplierSource || "other",
    services,
  };
}
