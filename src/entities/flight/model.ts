/** Shapes of `/v1/flights/*`; the backend validates and ranks, these are display rules. */
export const FLIGHTS_NOT_CONFIGURED_CODE = "flights_not_configured";
export const FLIGHTS_UNAVAILABLE_CODE = "flights_unavailable";
/** Shorter terms return nothing from the backend. */
export const PLACE_MIN_TERM = 2;

export type PlaceType = "city" | "airport";

export type Place = {
  code: string;
  type: PlaceType;
  name: string;
  cityCode: string;
  cityName: string;
  countryCode: string;
  countryName: string;
};

export type Passengers = { adults: number; children: number; infants: number };

export type FlightSearchParams = {
  origin: string;
  destination: string;
  /** `YYYY-MM-DD` */
  date: string;
  /** `HH:MM`, wall clock at the origin; "" searches the whole day. */
  time: string;
  passengers: Passengers;
  currency: string;
  direct: boolean;
};

export type FlightOffer = {
  origin: string;
  destination: string;
  originAirport: string;
  destinationAirport: string;
  airline: string;
  airlineName: string;
  flightNumber: string;
  /** RFC 3339 with the origin's offset. */
  departureAt: string;
  /** `YYYY-MM-DDTHH:MM`, wall clock at the origin. */
  localDeparture: string;
  durationMinutes: number;
  transfers: number;
  price: number;
  currency: string;
  /** Signed: negative leaves before the wanted time (whole days for an any-time search). */
  gapMinutes: number;
  closest: boolean;
  cheapest: boolean;
  bookingUrl: string;
};

export type FlightSearchResult = {
  query: FlightSearchParams & { departure: string };
  windowHours: number;
  fetchedAt: string;
  offers: FlightOffer[];
  /** Aviasales search for the whole query (affiliate marker included); "" when unsafe or absent. */
  searchUrl: string;
};

export type OfferSort = "closest" | "cheapest";

type Raw = Record<string, unknown>;

const WALL_CLOCK = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const isRecord = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const int = (v: unknown): number => Math.trunc(num(v));

/** Only absolute https links leave the CRM. */
export function safeBookingUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function mapPlace(raw: unknown): Place | null {
  if (!isRecord(raw)) return null;
  const code = str(raw.code).toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return null;
  return {
    code,
    type: raw.type === "airport" ? "airport" : "city",
    name: str(raw.name) || code,
    cityCode: str(raw.city_code) || code,
    cityName: str(raw.city_name),
    countryCode: str(raw.country_code),
    countryName: str(raw.country_name),
  };
}

export function mapPlaces(raw: unknown): Place[] {
  return Array.isArray(raw) ? raw.map(mapPlace).filter((p): p is Place => p !== null) : [];
}

export function mapOffer(raw: unknown): FlightOffer | null {
  if (!isRecord(raw)) return null;
  const departureAt = str(raw.departure_at);
  const localDeparture = str(raw.local_departure);
  const price = num(raw.price);
  if (!departureAt || !WALL_CLOCK.test(localDeparture) || price <= 0) return null;
  return {
    origin: str(raw.origin),
    destination: str(raw.destination),
    originAirport: str(raw.origin_airport) || str(raw.origin),
    destinationAirport: str(raw.destination_airport) || str(raw.destination),
    airline: str(raw.airline),
    airlineName: str(raw.airline_name) || str(raw.airline),
    flightNumber: str(raw.flight_number),
    departureAt,
    localDeparture,
    durationMinutes: Math.max(0, int(raw.duration_minutes)),
    transfers: Math.max(0, int(raw.transfers)),
    price,
    currency: str(raw.currency),
    gapMinutes: int(raw.gap_minutes),
    closest: raw.closest === true,
    cheapest: raw.cheapest === true,
    bookingUrl: safeBookingUrl(str(raw.booking_url)) ?? "",
  };
}

export function mapSearchResult(raw: unknown): FlightSearchResult {
  const r = isRecord(raw) ? raw : {};
  const q = isRecord(r.query) ? r.query : {};
  const departure = str(q.departure);
  return {
    query: {
      origin: str(q.origin),
      destination: str(q.destination),
      departure,
      date: departure.slice(0, 10),
      time: q.any_time === true ? "" : departure.slice(11, 16),
      passengers: { adults: int(q.adults), children: int(q.children), infants: int(q.infants) },
      currency: str(q.currency),
      direct: q.direct === true,
    },
    windowHours: int(r.window_hours),
    fetchedAt: str(r.fetched_at),
    offers: Array.isArray(r.offers) ? r.offers.map(mapOffer).filter((o): o is FlightOffer => o !== null) : [],
    searchUrl: safeBookingUrl(str(r.search_url)) ?? "",
  };
}

/** Provider search link carried in `error.details.search_url` when fares can't be shown. */
export function errorSearchUrl(details: Record<string, unknown> | undefined): string {
  const raw = details?.search_url;
  return typeof raw === "string" ? (safeBookingUrl(raw) ?? "") : "";
}

export function searchQueryString(p: FlightSearchParams): string {
  const qs = new URLSearchParams({ origin: p.origin, destination: p.destination, date: p.date });
  if (p.time) qs.set("time", p.time);
  qs.set("adults", String(p.passengers.adults));
  qs.set("children", String(p.passengers.children));
  qs.set("infants", String(p.passengers.infants));
  qs.set("currency", p.currency);
  qs.set("direct", String(p.direct));
  return qs.toString();
}

/** The backend already returns closest first; cheapest re-sorts by price, then gap. */
export function sortOffers(offers: readonly FlightOffer[], sort: OfferSort): FlightOffer[] {
  if (sort === "closest") return [...offers];
  return [...offers].sort(
    (a, b) => a.price - b.price || Math.abs(a.gapMinutes) - Math.abs(b.gapMinutes),
  );
}

export type SpanUnit = "d" | "h" | "m";

/** `|total|` minutes as at most two non-zero units, largest first: 1680 → 1d 4h, 480 → 8h. */
export function spanParts(total: number): [SpanUnit, number][] {
  const m = Math.round(Math.abs(total));
  const parts: [SpanUnit, number][] = [
    ["d", Math.floor(m / 1440)],
    ["h", Math.floor((m % 1440) / 60)],
    ["m", m % 60],
  ];
  const first = parts.findIndex(([, n]) => n > 0);
  if (first < 0) return [["m", 0]];
  return parts.slice(first, first + 2).filter(([, n]) => n > 0);
}

/** Within this many minutes the offer counts as "on time". */
export const ON_TIME_MINUTES = 15;

export type GapKind = "onTime" | "earlier" | "later";

export function gapKind(gapMinutes: number): GapKind {
  if (Math.abs(gapMinutes) <= ON_TIME_MINUTES) return "onTime";
  return gapMinutes < 0 ? "earlier" : "later";
}

/**
 * A wall-clock `YYYY-MM-DDTHH:MM` as a Date that formats back to the same digits with
 * `timeZone: "UTC"`, so the viewer's own zone never shifts the origin's local time.
 */
export function wallClockDate(local: string): Date | null {
  if (!WALL_CLOCK.test(local)) return null;
  const d = new Date(`${local}:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function airlineLogoUrl(code: string): string | null {
  return /^[A-Z0-9]{2}$/.test(code) ? `https://pics.avs.io/64/64/${code}.png` : null;
}
