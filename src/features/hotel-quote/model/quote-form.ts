import {
  MEAL_PLANS,
  ROOM_TYPES,
  addDays,
  daysBetween,
  pricedRates,
  seasonOn,
  type Hotel,
  type QuoteRequest,
  type Rate,
  type Season,
} from "@/entities/hotel";

export const MAX_QUOTE_NIGHTS = 60;
export const MAX_QUOTE_ROOMS = 50;
export const MAX_ROOM_ADULTS = 4;
export const MAX_ROOM_CHILDREN = 4;
export const MAX_CHILD_AGE = 17;

export type QuoteFormError = "dates" | "tooLong" | "occupancy";

const rateOrder = (r: Rate) => ROOM_TYPES.indexOf(r.roomType) * MEAL_PLANS.length + MEAL_PLANS.indexOf(r.mealPlan);

/**
 * A sensible first quote: two adults, five nights from a month after the business day (or
 * from the next priced season when that day has none), on the first room and board the
 * season actually prices.
 */
export function defaultQuoteRequest(hotel: Hotel, today: string, seasons: readonly Season[] = []): QuoteRequest {
  const sellable = seasons
    .filter((s) => s.endDate >= today && pricedRates(s.rates).some((r) => hotel.roomTypes.includes(r.roomType) && hotel.mealPlans.includes(r.mealPlan)))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  let checkIn = addDays(today, 30);
  let season = seasonOn(sellable, checkIn);
  if (!season && sellable.length) {
    season = sellable.find((s) => s.startDate > checkIn) ?? sellable[sellable.length - 1];
    checkIn = season.startDate > today ? season.startDate : today;
  }
  const rate = pricedRates(season?.rates ?? [])
    .filter((r) => hotel.roomTypes.includes(r.roomType) && hotel.mealPlans.includes(r.mealPlan))
    .sort((a, b) => rateOrder(a) - rateOrder(b))[0];
  return {
    checkIn,
    checkOut: addDays(checkIn, 5),
    roomType: rate?.roomType ?? ROOM_TYPES.find((r) => hotel.roomTypes.includes(r)) ?? "standard",
    mealPlan: rate?.mealPlan ?? MEAL_PLANS.find((m) => hotel.mealPlans.includes(m)) ?? "ro",
    rooms: 1,
    adults: 2,
    children: [],
    extraBed: false,
  };
}

/** Children at or above the child-2 limit are priced (and counted) as adults by the server. */
export function payingAdults(req: QuoteRequest, hotel: Hotel): number {
  return req.adults + req.children.filter((c) => c.age >= hotel.childPolicy.child2MaxAge).length;
}

export function quoteFormError(req: QuoteRequest, hotel: Hotel): QuoteFormError | null {
  if (!req.checkIn || !req.checkOut || req.checkOut <= req.checkIn) return "dates";
  if (daysBetween(req.checkIn, req.checkOut) > MAX_QUOTE_NIGHTS) return "tooLong";
  const adults = payingAdults(req, hotel);
  if (adults < 1 || adults > MAX_ROOM_ADULTS || req.children.length > MAX_ROOM_CHILDREN) return "occupancy";
  return null;
}
