/**
 * Package product sheet: header enums, the structured spec and the pure rules around
 * pricing, costs, currency conversion, eligibility and readiness. No framework imports,
 * so `scripts/selftest-packages.ts` can run it under plain Node.
 */

export const PACKAGE_KINDS = ["umrah", "hajj", "other"] as const;
export type PackageKind = (typeof PACKAGE_KINDS)[number];

/** The only tiers offered when creating a package. Stored as `category`. */
export const PACKAGE_TIERS = ["economy", "standard", "luxury"] as const;
export type PackageTier = (typeof PACKAGE_TIERS)[number];

export const PACKAGE_CATEGORIES = {
  umrah: PACKAGE_TIERS,
  hajj: PACKAGE_TIERS,
  other: PACKAGE_TIERS,
} as const satisfies Record<PackageKind, readonly string[]>;
export type PackageCategory = (typeof PACKAGE_CATEGORIES)[PackageKind][number];

/** Older Umrah / Hajj categories still load and save. */
export const LEGACY_CATEGORIES = {
  umrah: ["boutique", "ramadan_first15", "ramadan_last15", "ramadan_full", "semester"],
  hajj: ["short", "long", "special_mujamala", "special_commercial"],
  other: [],
} as const satisfies Record<PackageKind, readonly string[]>;

export function isPilgrimage(kind: string): kind is "umrah" | "hajj" {
  return kind === "umrah" || kind === "hajj";
}

export function isValidCategory(kind: PackageKind, category: string): boolean {
  return (PACKAGE_TIERS as readonly string[]).includes(category) || (LEGACY_CATEGORIES[kind] as readonly string[]).includes(category);
}

/** Tiers plus the current value when editing a legacy package. */
export function categoriesFor(kind: PackageKind, current?: string): string[] {
  const out: string[] = [...PACKAGE_TIERS];
  if (current && !out.includes(current)) out.push(current);
  return out;
}

export const TRANSPORT_MODES = ["flight_scheduled", "flight_charter", "road"] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const BOARD_TYPES = ["bb", "hb", "fb", "tabldot", "buffet"] as const;
export const HOTEL_ACCESS = ["walking", "shuttle"] as const;
export const FLIGHT_ROUTINGS = ["direct", "connecting"] as const;
export const INTERCITY_MODES = ["haramain_train", "bus", "private_car"] as const;
/** Mirrors the Nusuk Masar visa enums. */
export const VISA_TYPES = ["UMRAH_VISA", "TOURIST_VISA", "PERSONAL_VISIT", "HAJJ_VISA", "BUSINESS_VISIT"] as const;
export const KIT_ITEMS = ["ihram", "luggage", "prayer_book", "zamzam"] as const;
export const ZIYARAT = {
  makkah: ["thawr", "arafat", "muzdalifah", "mina", "hira", "jannat_al_mualla"],
  madinah: ["uhud", "qiblatayn", "seven_mosques", "quba", "baqi"],
} as const;
export const ITINERARY_CITIES = ["makkah", "madinah", "jeddah", "transit"] as const;
export const MADINAH_ZONES = ["markaziyya_north", "markaziyya_south", "markaziyya_west", "markaziyya_east", "outside_central"] as const;
export const AIRLINES = ["Turkish Airlines", "Saudia", "flynas", "AJet", "Pegasus", "flyadeal", "Syrian Air", "Cham Wings"] as const;
export const PACKAGE_CURRENCIES = ["SAR", "USD", "EUR", "TRY", "SYP", "AED", "GBP"] as const;
export const DEFAULT_PACKAGE_CURRENCY = "SAR";

export type Hotel = {
  /** Contracted hotel (Hotels module) this stay is priced from; empty when typed freely. */
  hotelId: string;
  name: string;
  stars: number;
  distanceM: number;
  access: "" | (typeof HOTEL_ACCESS)[number];
  shuttleMinutes: number;
  zone: string;
  board: "" | (typeof BOARD_TYPES)[number];
  checkIn: string;
  checkOut: string;
};

export type FlightLeg = { route: string; flightNo: string; date: string };

export type PackageSpec = {
  nights: { makkah: number; madinah: number };
  makkah: Hotel;
  madinah: Hotel;
  flights: {
    airline: string;
    routing: "" | (typeof FLIGHT_ROUTINGS)[number];
    outbound: FlightLeg;
    inbound: FlightLeg;
    pnr: string;
    blockSeats: number;
  };
  transfers: { intercity: "" | (typeof INTERCITY_MODES)[number]; busClass: string; airportMeet: boolean; hotelTransfers: boolean };
  destination: Destination;
  stays: Stay[];
  bus: Bus;
  services: Activity[];
  activities: Activity[];
  guidance: { leaderName: string; femaleGuide: boolean };
  visa: { type: "" | (typeof VISA_TYPES)[number]; healthInsurance: boolean };
  kit: string[];
  ziyarat: { makkah: string[]; madinah: string[] };
  itinerary: ItineraryDay[];
  requirements: Requirements;
  costs: Costs;
  included: string[];
  excluded: string[];
};

export type Destination = { country: string; districts: string[] };
export type Stay = { city: string; nights: number; hotel: Hotel };
export type Bus = { company: string; seats: number; price: number; details: string };
export type Activity = { title: string; details: string };
export type ItineraryDay = { day: number; city: string; title: string; details: string };

export function emptyDestination(): Destination {
  return { country: "", districts: [] };
}

export function emptyBus(): Bus {
  return { company: "", seats: 0, price: 0, details: "" };
}

export function emptyStay(city = ""): Stay {
  return { city, nights: 0, hotel: emptyHotel() };
}

export function emptyActivity(): Activity {
  return { title: "", details: "" };
}

/** Keep typed hotel nights when districts change; drop empty leftover cities. */
export function syncStaysWithDistricts(stays: readonly Stay[], districts: readonly string[]): Stay[] {
  const byCity = new Map(stays.map((s) => [s.city.trim().toLowerCase(), s]));
  const used = new Set<string>();
  const out: Stay[] = [];
  for (const d of districts) {
    const key = d.trim().toLowerCase();
    if (!key) continue;
    const existing = byCity.get(key);
    out.push(existing ? { ...existing, city: existing.city || d } : emptyStay(d));
    used.add(key);
  }
  for (const s of stays) {
    const key = s.city.trim().toLowerCase();
    if (key && !used.has(key) && (s.hotel.name || s.nights > 0)) out.push(s);
  }
  return out;
}

export type Requirements = {
  passportMonths: number;
  meningitis: boolean;
  biometricPhoto: boolean;
  mahram: boolean;
  /** Women younger than this travel with a mahram (0 = every age). */
  mahramMaxAge: number;
};

/** Per-person net cost in minor units of `currency`. */
export type Costs = {
  currency: string;
  flight: number;
  hotel: number;
  visa: number;
  transfer: number;
  guidance: number;
  gifts: number;
  markupPct: number;
};

export const COST_LINES = ["flight", "hotel", "visa", "transfer", "guidance", "gifts"] as const;
export type CostLine = (typeof COST_LINES)[number];

export const DEFAULT_REQUIREMENTS: Requirements = {
  passportMonths: 6,
  meningitis: true,
  biometricPhoto: true,
  mahram: true,
  mahramMaxAge: 45,
};

export function emptyHotel(): Hotel {
  return { hotelId: "", name: "", stars: 0, distanceM: 0, access: "", shuttleMinutes: 0, zone: "", board: "", checkIn: "", checkOut: "" };
}

export function emptySpec(currency: string = DEFAULT_PACKAGE_CURRENCY): PackageSpec {
  return {
    nights: { makkah: 0, madinah: 0 },
    makkah: emptyHotel(),
    madinah: emptyHotel(),
    flights: {
      airline: "",
      routing: "",
      outbound: { route: "", flightNo: "", date: "" },
      inbound: { route: "", flightNo: "", date: "" },
      pnr: "",
      blockSeats: 0,
    },
    transfers: { intercity: "", busClass: "", airportMeet: false, hotelTransfers: false },
    destination: emptyDestination(),
    stays: [],
    bus: emptyBus(),
    services: [],
    activities: [],
    guidance: { leaderName: "", femaleGuide: false },
    visa: { type: "", healthInsurance: false },
    kit: [],
    ziyarat: { makkah: [], madinah: [] },
    itinerary: [],
    requirements: { ...DEFAULT_REQUIREMENTS },
    costs: { currency, flight: 0, hotel: 0, visa: 0, transfer: 0, guidance: 0, gifts: 0, markupPct: 0 },
    included: [],
    excluded: [],
  };
}

// ---------------------------------------------------------------- wire mapping

type Raw = Record<string, unknown>;

const rec = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const bool = (v: unknown) => v === true;
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const oneOf = <T extends string>(list: readonly T[], v: unknown): "" | T => (list.includes(v as T) ? (v as T) : "");

function mapHotel(raw: unknown): Hotel {
  const h = rec(raw);
  return {
    hotelId: str(h.hotel_id),
    name: str(h.name),
    stars: num(h.stars),
    distanceM: num(h.distance_m),
    access: oneOf(HOTEL_ACCESS, h.access),
    shuttleMinutes: num(h.shuttle_minutes),
    zone: str(h.zone),
    board: oneOf(BOARD_TYPES, h.board),
    checkIn: str(h.check_in),
    checkOut: str(h.check_out),
  };
}

function mapLeg(raw: unknown): FlightLeg {
  const l = rec(raw);
  return { route: str(l.route), flightNo: str(l.flight_no), date: str(l.date) };
}

function mapDestination(raw: unknown): Destination {
  const d = rec(raw);
  return { country: str(d.country), districts: strs(d.districts) };
}

function mapStays(raw: unknown): Stay[] {
  return (Array.isArray(raw) ? raw : []).map((row) => {
    const s = rec(row);
    return { city: str(s.city), nights: num(s.nights), hotel: mapHotel(s.hotel) };
  });
}

function mapBus(raw: unknown): Bus {
  const b = rec(raw);
  return { company: str(b.company), seats: num(b.seats), price: num(b.price), details: str(b.details) };
}

function mapActivities(raw: unknown): Activity[] {
  return (Array.isArray(raw) ? raw : []).map((row) => {
    const a = rec(row);
    return { title: str(a.title), details: str(a.details) };
  });
}

/** API `spec` (snake_case) → model. Missing parts fall back to empty values. */
export function mapSpec(raw: unknown, currency: string = DEFAULT_PACKAGE_CURRENCY): PackageSpec {
  const s = rec(raw);
  const base = emptySpec(currency);
  const nights = rec(s.nights);
  const flights = rec(s.flights);
  const transfers = rec(s.transfers);
  const guidance = rec(s.guidance);
  const visa = rec(s.visa);
  const ziyarat = rec(s.ziyarat);
  const req = rec(s.requirements);
  const costs = rec(s.costs);
  const hasReq = Object.keys(req).length > 0;
  return {
    nights: { makkah: num(nights.makkah), madinah: num(nights.madinah) },
    makkah: mapHotel(s.makkah),
    madinah: mapHotel(s.madinah),
    flights: {
      airline: str(flights.airline),
      routing: oneOf(FLIGHT_ROUTINGS, flights.routing),
      outbound: mapLeg(flights.outbound),
      inbound: mapLeg(flights.inbound),
      pnr: str(flights.pnr),
      blockSeats: num(flights.block_seats),
    },
    transfers: {
      intercity: oneOf(INTERCITY_MODES, transfers.intercity),
      busClass: str(transfers.bus_class),
      airportMeet: bool(transfers.airport_meet),
      hotelTransfers: bool(transfers.hotel_transfers),
    },
    destination: mapDestination(s.destination),
    stays: mapStays(s.stays),
    bus: mapBus(s.bus),
    services: mapActivities(s.services),
    activities: mapActivities(s.activities),
    guidance: { leaderName: str(guidance.leader_name), femaleGuide: bool(guidance.female_guide) },
    visa: { type: oneOf(VISA_TYPES, visa.type), healthInsurance: bool(visa.health_insurance) },
    kit: strs(s.kit),
    ziyarat: { makkah: strs(ziyarat.makkah), madinah: strs(ziyarat.madinah) },
    itinerary: (Array.isArray(s.itinerary) ? s.itinerary : []).map((d) => {
      const day = rec(d);
      return { day: num(day.day), city: str(day.city), title: str(day.title), details: str(day.details) };
    }),
    requirements: hasReq
      ? {
          passportMonths: num(req.passport_months),
          meningitis: bool(req.meningitis),
          biometricPhoto: bool(req.biometric_photo),
          mahram: bool(req.mahram),
          mahramMaxAge: num(req.mahram_max_age),
        }
      : base.requirements,
    costs: {
      currency: str(costs.currency) || currency,
      flight: num(costs.flight),
      hotel: num(costs.hotel),
      visa: num(costs.visa),
      transfer: num(costs.transfer),
      guidance: num(costs.guidance),
      gifts: num(costs.gifts),
      markupPct: num(costs.markup_pct),
    },
    included: strs(s.included),
    excluded: strs(s.excluded),
  };
}

const hotelPayload = (h: Hotel) => ({
  hotel_id: h.hotelId || undefined,
  name: h.name,
  stars: h.stars,
  distance_m: h.distanceM,
  access: h.access,
  shuttle_minutes: h.shuttleMinutes,
  zone: h.zone,
  board: h.board,
  check_in: h.checkIn,
  check_out: h.checkOut,
});

const legPayload = (l: FlightLeg) => ({ route: l.route, flight_no: l.flightNo, date: l.date });

/** Model → API body (snake_case). */
export function specPayload(s: PackageSpec): Raw {
  return {
    nights: s.nights,
    makkah: hotelPayload(s.makkah),
    madinah: hotelPayload(s.madinah),
    flights: {
      airline: s.flights.airline,
      routing: s.flights.routing,
      outbound: legPayload(s.flights.outbound),
      inbound: legPayload(s.flights.inbound),
      pnr: s.flights.pnr,
      block_seats: s.flights.blockSeats,
    },
    transfers: {
      intercity: s.transfers.intercity,
      bus_class: s.transfers.busClass,
      airport_meet: s.transfers.airportMeet,
      hotel_transfers: s.transfers.hotelTransfers,
    },
    destination: s.destination,
    stays: s.stays.map((stay) => ({ city: stay.city, nights: stay.nights, hotel: hotelPayload(stay.hotel) })),
    bus: s.bus,
    services: s.services,
    activities: s.activities,
    guidance: { leader_name: s.guidance.leaderName, female_guide: s.guidance.femaleGuide },
    visa: { type: s.visa.type, health_insurance: s.visa.healthInsurance },
    kit: s.kit,
    ziyarat: s.ziyarat,
    itinerary: s.itinerary,
    requirements: {
      passport_months: s.requirements.passportMonths,
      meningitis: s.requirements.meningitis,
      biometric_photo: s.requirements.biometricPhoto,
      mahram: s.requirements.mahram,
      mahram_max_age: s.requirements.mahramMaxAge,
    },
    costs: {
      currency: s.costs.currency,
      flight: s.costs.flight,
      hotel: s.costs.hotel,
      visa: s.costs.visa,
      transfer: s.costs.transfer,
      guidance: s.costs.guidance,
      gifts: s.costs.gifts,
      markup_pct: s.costs.markupPct,
    },
    included: s.included,
    excluded: s.excluded,
  };
}

/** Other tours keep free-text services; pilgrimage keeps visa / kit / ziyarat. */
export function applyKindOffer(s: PackageSpec, kind: string): void {
  if (kind === "other") {
    s.visa = { type: "", healthInsurance: false };
    s.kit = [];
    s.ziyarat = { makkah: [], madinah: [] };
    s.guidance = { ...s.guidance, femaleGuide: false };
    s.included = [];
    s.services = namedItems(s.services);
    s.activities = namedItems(s.activities);
    return;
  }
  s.services = [];
  s.activities = [];
}

function namedItems(items: readonly Activity[]): Activity[] {
  return items.filter((a) => a.title.trim()).map((a) => ({ title: a.title.trim(), details: a.details.trim() }));
}

// ---------------------------------------------------------------- pricing matrix

export type TierKind = "room" | "age";

/** Default pricing matrix rows. Codes are stable; new room types are just new rows. */
export const ROOM_TIERS = [
  { code: "QUAD", occupancy: 4 },
  { code: "TRIPLE", occupancy: 3 },
  { code: "DOUBLE", occupancy: 2 },
  { code: "SINGLE", occupancy: 1 },
] as const;

export const AGE_TIERS = [
  { code: "INFANT", ages: "0-2" },
  { code: "CHILD_2_6", ages: "2-6" },
  { code: "CHILD_6_11_BED", ages: "6-11" },
  { code: "CHILD_6_11_NOBED", ages: "6-11" },
] as const;

export type MatrixRow = { code: string; kind: TierKind; amount: number; active: boolean };

/** Cheapest active room price, or null when the matrix has no room prices. */
export function fromPrice(rows: readonly MatrixRow[]): number | null {
  const prices = rows.filter((r) => r.kind === "room" && r.active && r.amount > 0).map((r) => r.amount);
  return prices.length ? Math.min(...prices) : null;
}

/** Larger rooms should be cheaper per person; returns codes that break that order. */
export function roomOrderWarnings(rows: readonly MatrixRow[]): string[] {
  const priced = ROOM_TIERS.map((t) => rows.find((r) => r.code === t.code && r.active && r.amount > 0)).filter(
    (r): r is MatrixRow => Boolean(r),
  );
  const out: string[] = [];
  for (let i = 1; i < priced.length; i++) {
    if (priced[i].amount < priced[i - 1].amount) out.push(priced[i].code);
  }
  return out;
}

// ---------------------------------------------------------------- costs

export function costTotal(c: Costs): number {
  return COST_LINES.reduce((sum, line) => sum + (c[line] || 0), 0);
}

/** Net cost plus markup, rounded to whole major units (matches the backend). */
export function suggestedPrice(c: Costs): number {
  const raw = Math.trunc((costTotal(c) * (100 + c.markupPct)) / 100);
  return Math.trunc((raw + 50) / 100) * 100;
}

/** Margin of a sale price over net cost as a percentage of the price, or null without data. */
export function marginPct(price: number, cost: number): number | null {
  if (price <= 0 || cost <= 0) return null;
  return Math.round(((price - cost) / price) * 1000) / 10;
}

// ---------------------------------------------------------------- currency

/**
 * Converts minor units between currencies through USD crosses (units per 1 USD, e.g.
 * SAR 3.75). Returns null when either side has no cross.
 */
export function convertViaUsd(
  minor: number,
  from: string,
  to: string,
  crosses: Readonly<Record<string, string | number | null | undefined>>,
): number | null {
  if (from === to) return minor;
  const cross = (c: string) => (c === "USD" ? 1 : Number(crosses[c]));
  const a = cross(from);
  const b = cross(to);
  if (!(a > 0) || !(b > 0)) return null;
  return Math.round((minor / a) * b);
}

// ---------------------------------------------------------------- dates & duration

export function dayDiff(from: string, to: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return null;
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Number.isFinite(ms) ? Math.round(ms / 86_400_000) : null;
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function addMonths(day: string, months: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, lastDay))).toISOString().slice(0, 10);
}

/** Nights of one hotel stay from its dates, or null when dates are incomplete/invalid. */
export function stayNights(h: Pick<Hotel, "checkIn" | "checkOut">): number | null {
  const n = dayDiff(h.checkIn, h.checkOut);
  return n !== null && n > 0 ? n : null;
}

export function totalNights(s: Pick<PackageSpec, "nights">): number {
  return s.nights.makkah + s.nights.madinah;
}

export function stayPlanNights(s: Pick<PackageSpec, "stays">): number {
  return s.stays.reduce((sum, stay) => sum + (stay.nights || 0), 0);
}

/** Known catalogue label, or the operator's own text for a custom item. */
export function catalogLabel(known: readonly string[], key: string, label: (id: string) => string): string {
  return known.includes(key) ? label(key) : key;
}

// ---------------------------------------------------------------- itinerary

export type ItineraryLabels = {
  arrival: string;
  arrivalDetails: string;
  makkahDay: string;
  makkahZiyarat: string;
  transfer: (mode: string) => string;
  madinahDay: string;
  madinahZiyarat: string;
  farewell: string;
  farewellDetails: string;
};

/**
 * Starter day-by-day programme from the stay plan: arrival + first Umrah, Makkah days
 * (one ziyarat day), the intercity transfer, Madinah days (one ziyarat day) and departure.
 */
export function itineraryTemplate(
  plan: { durationDays: number; makkahNights: number; madinahNights: number; intercity: string },
  labels: ItineraryLabels,
): ItineraryDay[] {
  const days = Math.max(0, Math.min(60, plan.durationDays));
  if (days === 0) return [];
  const out: ItineraryDay[] = [{ day: 1, city: "makkah", title: labels.arrival, details: labels.arrivalDetails }];
  const makkahEnd = Math.min(days - 1, Math.max(1, plan.makkahNights));
  for (let d = 2; d <= makkahEnd; d++) {
    out.push({ day: d, city: "makkah", title: d === 3 ? labels.makkahZiyarat : labels.makkahDay, details: "" });
  }
  let next = makkahEnd + 1;
  if (plan.madinahNights > 0 && next < days) {
    out.push({ day: next, city: "madinah", title: labels.transfer(plan.intercity), details: "" });
    next++;
    const madinahEnd = Math.min(days - 1, makkahEnd + plan.madinahNights);
    for (let d = next; d <= madinahEnd; d++) {
      out.push({ day: d, city: "madinah", title: d === next ? labels.madinahZiyarat : labels.madinahDay, details: "" });
    }
    next = madinahEnd + 1;
  }
  for (let d = next; d < days; d++) out.push({ day: d, city: "", title: labels.makkahDay, details: "" });
  if (days > 1) out.push({ day: days, city: "", title: labels.farewell, details: labels.farewellDetails });
  return out;
}

export type CustomItineraryLabels = {
  arrival: (place: string) => string;
  arrivalDetails: string;
  cityDay: (city: string) => string;
  activity: (title: string) => string;
  farewell: string;
  farewellDetails: string;
};

/** Starter programme for a custom tour: arrival, one day per district / activity, farewell. */
export function customItineraryTemplate(
  plan: { durationDays: number; country: string; districts: readonly string[]; activities: readonly Activity[] },
  labels: CustomItineraryLabels,
): ItineraryDay[] {
  const days = Math.max(0, Math.min(60, plan.durationDays));
  if (days === 0) return [];
  const place = plan.districts[0] || plan.country;
  const out: ItineraryDay[] = [{ day: 1, city: place, title: labels.arrival(place), details: labels.arrivalDetails }];
  let next = 2;
  for (const city of plan.districts.slice(place === plan.districts[0] ? 1 : 0)) {
    if (next >= days) break;
    out.push({ day: next, city, title: labels.cityDay(city), details: "" });
    next++;
  }
  for (const activity of plan.activities) {
    if (next >= days || !activity.title.trim()) continue;
    out.push({ day: next, city: out.at(-1)?.city ?? place, title: labels.activity(activity.title), details: activity.details });
    next++;
  }
  while (next < days) {
    out.push({ day: next, city: out.at(-1)?.city ?? "", title: labels.cityDay(out.at(-1)?.city || plan.country), details: "" });
    next++;
  }
  if (days > 1) out.push({ day: days, city: "", title: labels.farewell, details: labels.farewellDetails });
  return out;
}

// ---------------------------------------------------------------- eligibility

export type Traveller = {
  passportExpiresAt?: string | null;
  dateOfBirth?: string | null;
  gender?: "male" | "female" | null;
};

export type EligibilityIssue = {
  code: "passport_missing" | "passport_short" | "mahram" | "meningitis" | "photo";
  level: "block" | "warn" | "info";
  /** For passport_short: the date the passport must be valid until. */
  until?: string;
};

function ageOn(dob: string, day: string): number | null {
  const birth = dob.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return null;
  const [by, bm, bd] = birth.split("-").map(Number);
  const [ty, tm, td] = day.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

/**
 * What a traveller still needs for this package on `departDate` (YYYY-MM-DD). Passport
 * problems block the booking; vaccination and photo are checklist reminders.
 */
export function eligibilityIssues(req: Requirements, t: Traveller, departDate: string): EligibilityIssue[] {
  const issues: EligibilityIssue[] = [];
  const expiry = t.passportExpiresAt?.slice(0, 10);
  if (!expiry) {
    issues.push({ code: "passport_missing", level: "block" });
  } else {
    const until = req.passportMonths > 0 ? addMonths(departDate, req.passportMonths) : departDate;
    if (expiry < until) issues.push({ code: "passport_short", level: "block", until });
  }
  if (req.mahram && t.gender !== "male") {
    const age = t.dateOfBirth ? ageOn(t.dateOfBirth, departDate) : null;
    const applies = req.mahramMaxAge === 0 || age === null || age < req.mahramMaxAge;
    if (applies) issues.push({ code: "mahram", level: t.gender === "female" ? "warn" : "info" });
  }
  if (req.meningitis) issues.push({ code: "meningitis", level: "info" });
  if (req.biometricPhoto) issues.push({ code: "photo", level: "info" });
  return issues;
}

// ---------------------------------------------------------------- codes

const CATEGORY_CODES: Record<string, string> = {
  economy: "ECO",
  standard: "STD",
  luxury: "LUX",
  boutique: "BTQ",
  ramadan_first15: "RAM",
  ramadan_last15: "RAM",
  ramadan_full: "RAM",
  semester: "SEM",
  short: "SHT",
  long: "LNG",
  special_mujamala: "MJM",
  special_commercial: "COM",
};

/** `UMR-2026-RAM-01` style code; the sequence skips codes already taken. */
export function suggestPackageCode(kind: PackageKind, category: string, year: number, taken: readonly string[] = []): string {
  const head = kind === "hajj" ? "HAJ" : kind === "other" ? "CUS" : "UMR";
  const prefix = `${head}-${year}-${CATEGORY_CODES[category] ?? "PKG"}-`;
  const used = new Set(taken.map((c) => c.toUpperCase()));
  for (let n = 1; n < 100; n++) {
    const code = `${prefix}${String(n).padStart(2, "0")}`;
    if (!used.has(code)) return code;
  }
  return `${prefix}${Date.now() % 1000}`;
}

// ---------------------------------------------------------------- readiness

export const READINESS_CHECKS = ["makkahHotel", "madinahHotel", "flights", "visa", "pricing", "itinerary", "costs"] as const;
export type ReadinessCheck = (typeof READINESS_CHECKS)[number];

/** Which parts of the product sheet are filled in; drives the "ready to sell" ring. */
export function readinessChecks(
  pkg: { kind?: string; transportMode: string; spec: PackageSpec },
  hasRoomPrice: boolean,
): Record<ReadinessCheck, boolean> {
  const s = pkg.spec;
  const other = pkg.kind === "other";
  const stayReady = s.stays.some((stay) => Boolean(stay.hotel.name && stay.hotel.stars));
  return {
    makkahHotel: other ? stayReady || Boolean(s.destination.country) : Boolean(s.makkah.name && s.makkah.stars),
    madinahHotel: other ? true : s.nights.madinah === 0 || Boolean(s.madinah.name && s.madinah.stars),
    flights: pkg.transportMode === "road" || Boolean(s.flights.airline && s.flights.outbound.route) || Boolean(s.bus.company),
    visa: other ? true : Boolean(s.visa.type),
    pricing: hasRoomPrice,
    itinerary: s.itinerary.length > 0,
    costs: true,
  };
}

export function readinessPct(checks: Record<ReadinessCheck, boolean>): number {
  const done = READINESS_CHECKS.filter((k) => checks[k]).length;
  return Math.round((done / READINESS_CHECKS.length) * 100);
}
