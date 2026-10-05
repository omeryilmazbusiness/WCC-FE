import type {
  Allotment,
  CancellationPolicy,
  ChildPolicy,
  ChildRule,
  Hotel,
  HotelInput,
  Markup,
  MealPlan,
  Occupancy,
  Rate,
  RoomType,
  Season,
  StopSale,
} from "../model";
import { MEAL_PLANS, ROOM_TYPES } from "../model";

export const DEFAULT_MARKUP: Markup = { kind: "percent", value: 1500 };

export const DEFAULT_CHILD_POLICY: ChildPolicy = {
  infantMaxAge: 2,
  child1MaxAge: 6,
  child2MaxAge: 12,
  infant: { mode: "free", value: 0 },
  child1: { mode: "free", value: 0 },
  child2WithBed: { mode: "percent", value: 75 },
  child2NoBed: { mode: "percent", value: 50 },
  extraBedAdult: 0,
};

export const DEFAULT_CANCELLATION: CancellationPolicy = {
  freeDays: 14,
  tiers: [
    { minDays: 7, kind: "nights", value: 1 },
    { minDays: 0, kind: "percent", value: 100 },
  ],
  noShowPct: 100,
};

const OCCUPANCY_GUESTS: Record<Occupancy, number> = { single: 1, double: 2, triple: 3, quad: 4 };

/** Half-away-from-zero integer division, same as the server. */
function roundDiv(a: number, b: number): number {
  return Math.floor((a + Math.floor(b / 2)) / b);
}

/** Net → gross for `payingGuests` guests, mirroring the server's `Markup.Apply`. */
export function applyMarkup(net: number, markup: Markup, payingGuests = 1): number {
  if (net <= 0) return net;
  if (markup.kind === "fixed") return net + markup.value * payingGuests;
  return net + roundDiv(net * markup.value, 10_000);
}

/** Effective markup of a season: its own override or the hotel's. */
export function markupFor(hotel: Pick<Hotel, "markup">, season?: Pick<Season, "markup"> | null): Markup {
  return season?.markup ?? hotel.markup;
}

/** Gross for one matrix cell: single is per room (1 guest), the rest per person. */
export function grossCell(net: number, markup: Markup): number {
  return applyMarkup(net, markup, 1);
}

export function occupancyGuests(occupancy: Occupancy): number {
  return OCCUPANCY_GUESTS[occupancy];
}

/** Nightly room net for `adults` adults sharing (0 when the occupancy is not contracted). */
export function roomNet(rate: Rate, adults: number): number {
  const pp = adults === 1 ? rate.single : adults === 2 ? rate.double : adults === 3 ? rate.triple : adults === 4 ? rate.quad : 0;
  return pp > 0 ? pp * adults : 0;
}

/** Lowest per-person net of a row ("from" price), preferring double occupancy. */
export function rateFrom(rate: Rate): number {
  return rate.double > 0 ? rate.double : rate.single;
}

export function seasonFrom(season: Pick<Season, "rates">): number {
  const prices = season.rates.map(rateFrom).filter((v) => v > 0);
  return prices.length ? Math.min(...prices) : 0;
}

/** Bps ↔ "15" / "12.5" input. */
export function bpsToPercentInput(bps: number): string {
  if (!Number.isFinite(bps)) return "";
  const whole = Math.trunc(bps / 100);
  const frac = Math.abs(bps % 100);
  return frac ? `${whole}.${String(frac).padStart(2, "0").replace(/0$/, "")}` : String(whole);
}

export function parsePercentInput(input: string): number | null {
  const m = /^(\d{1,3})(?:[.,](\d{0,2}))?$/.exec(input.trim());
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

/** Calendar-day arithmetic on YYYY-MM-DD strings, timezone free. */
export function dayNumber(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / 86_400_000);
}

export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

export function addDays(day: string, n: number): string {
  return new Date((dayNumber(day) + n) * 86_400_000).toISOString().slice(0, 10);
}

export function covers(start: string, end: string, day: string): boolean {
  return start <= day && day <= end;
}

export function rangesOverlap(a: { startDate: string; endDate: string }, b: { startDate: string; endDate: string }): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

export function seasonOn(seasons: readonly Season[], day: string): Season | null {
  return seasons.find((s) => covers(s.startDate, s.endDate, day)) ?? null;
}

/** First season (of `others`) overlapping the draft, ignoring the draft's own id. */
export function overlappingSeason(
  draft: { id?: string; startDate: string; endDate: string },
  others: readonly Season[],
): Season | null {
  return others.find((s) => s.id !== draft.id && rangesOverlap(s, draft)) ?? null;
}

export function stopSaleOn(stops: readonly StopSale[], day: string, roomType?: RoomType): StopSale | null {
  return (
    stops.find((s) => covers(s.startDate, s.endDate, day) && (s.roomType === "" || !roomType || s.roomType === roomType)) ??
    null
  );
}

export function fillPct(sold: number, rooms: number): number {
  if (rooms <= 0) return 0;
  return Math.min(100, Math.round((sold / rooms) * 100));
}

/** Days until an allotment's unsold rooms go back to the hotel (negative once passed). */
export function releaseIn(allotment: Pick<Allotment, "releaseDate">, today: string): number {
  return daysBetween(today, allotment.releaseDate);
}

/** Allotments whose release falls within `withinDays` and still hold unsold rooms. */
export function releasingSoon(allotments: readonly Allotment[], today: string, withinDays = 7): Allotment[] {
  return allotments.filter((a) => {
    if (a.kind !== "guaranteed" || a.status !== "open" || a.available <= 0) return false;
    const d = releaseIn(a, today);
    return d >= 0 && d <= withinDays;
  });
}

export function emptyRate(roomType: RoomType, mealPlan: MealPlan): Rate {
  return { roomType, mealPlan, single: 0, double: 0, triple: 0, quad: 0 };
}

export function isEmptyRate(rate: Rate): boolean {
  return rate.single === 0 && rate.double === 0 && rate.triple === 0 && rate.quad === 0;
}

/** Full room × meal grid for an editor, prefilled from `existing`, in canonical order. */
export function rateGrid(hotel: Pick<Hotel, "roomTypes" | "mealPlans">, existing: readonly Rate[] = []): Rate[] {
  const byKey = new Map(existing.map((r) => [`${r.roomType}/${r.mealPlan}`, r]));
  const rooms = ROOM_TYPES.filter((r) => hotel.roomTypes.includes(r));
  const meals = MEAL_PLANS.filter((m) => hotel.mealPlans.includes(m));
  return rooms.flatMap((roomType) =>
    meals.map((mealPlan) => ({ ...(byKey.get(`${roomType}/${mealPlan}`) ?? emptyRate(roomType, mealPlan)) })),
  );
}

/** Rows worth saving: anything with at least one price. */
export function pricedRates(rates: readonly Rate[]): Rate[] {
  return rates.filter((r) => !isEmptyRate(r));
}

export function childRuleCharge(rule: ChildRule, adultPerPerson: number): number {
  if (rule.mode === "percent") return roundDiv(adultPerPerson * rule.value, 100);
  if (rule.mode === "fixed") return rule.value;
  return 0;
}

export type CancellationStep =
  | { kind: "free"; fromDays: number }
  | { kind: "nights" | "percent"; fromDays: number; toDays: number; value: number }
  | { kind: "no_show"; value: number };

/**
 * The policy as a ladder from far to near: free window, each penalty tier with its day
 * range, and the no-show rule. Inside the penalty window with no tier, 100% applies.
 */
export function cancellationLadder(policy: CancellationPolicy): CancellationStep[] {
  const out: CancellationStep[] = [{ kind: "free", fromDays: policy.freeDays }];
  const tiers = [...policy.tiers].sort((a, b) => b.minDays - a.minDays);
  let upper = policy.freeDays - 1;
  for (const t of tiers) {
    if (t.minDays > upper) continue;
    out.push({ kind: t.kind, fromDays: t.minDays, toDays: upper, value: t.value });
    upper = t.minDays - 1;
  }
  if (upper >= 0) out.push({ kind: "percent", fromDays: 0, toDays: upper, value: 100 });
  out.push({ kind: "no_show", value: policy.noShowPct });
  return out;
}

export function emptyHotelInput(): HotelInput {
  return {
    name: "",
    nameAr: "",
    stars: 5,
    location: { city: "", country: "SA", district: "", latitude: null, longitude: null, landmark: "haram", distanceM: 0 },
    contact: { salesName: "", salesPhone: "", salesEmail: "", reservationsEmail: "" },
    roomTypes: ["standard", "deluxe", "triple", "quad"],
    mealPlans: ["ro", "bb"],
    currency: "SAR",
    markup: { ...DEFAULT_MARKUP },
    notes: "",
    isActive: true,
  };
}

export function hotelToInput(h: Hotel): HotelInput {
  return {
    name: h.name,
    nameAr: h.nameAr,
    stars: h.stars,
    location: { ...h.location },
    contact: { ...h.contact },
    roomTypes: [...h.roomTypes],
    mealPlans: [...h.mealPlans],
    currency: h.currency,
    markup: { ...h.markup },
    childPolicy: h.childPolicy,
    cancellation: h.cancellation,
    notes: h.notes,
    isActive: h.isActive,
  };
}

/** Google Maps link: exact coordinates when known, otherwise a name + city search. */
export function mapsUrl(hotel: Pick<Hotel, "name" | "location">): string {
  const { latitude, longitude, city, country } = hotel.location;
  const q =
    latitude != null && longitude != null ? `${latitude},${longitude}` : [hotel.name, city, country].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function mailtoUrl(to: string, subject: string, body: string): string {
  return `mailto:${encodeURI(to.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
