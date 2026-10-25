import { pricedRoomTypes } from "@/entities/hotel/lib/monthly";
import { rateFrom, seasonOn } from "@/entities/hotel/lib/pricing";
import type { HotelDetail, RoomType } from "@/entities/hotel/model";
import { minorToInput } from "@/shared/lib/money";
import { emptyService, type BookingDraft } from "./draft";

/** Snapshot of a contracted room chosen in the hotel picker. */
export type HotelPick = {
  hotelId: string;
  name: string;
  roomType: RoomType;
  checkIn: string;
  nights: number;
  sellMinor: number;
  netMinor: number;
  currency: string;
};

export type ApplyHotelOpts = { serviceKey?: string };

export function hotelSummary(pick: HotelPick): string {
  return `${pick.name} · ${pick.roomType} · ${pick.checkIn}`.slice(0, 160);
}

/** Sales prices by room type for the stay month; monthly first, then season. */
export function roomSellsOn(detail: HotelDetail, checkIn: string): { roomType: RoomType; sell: number; net: number }[] {
  const monthly = pricedRoomTypes(detail.hotel.roomTypes, detail.monthlyRates, checkIn);
  if (monthly.length) return monthly;
  const season = seasonOn(detail.seasons, checkIn);
  if (!season) return [];
  return detail.hotel.roomTypes
    .map((roomType) => {
      const rate = season.rates.find((r) => r.roomType === roomType);
      return { roomType, sell: rate ? rateFrom(rate) : 0, net: 0 };
    })
    .filter((row) => row.sell > 0);
}

export function hotelPickFromRoom(
  detail: HotelDetail,
  roomType: RoomType,
  checkIn: string,
  nights: number,
): HotelPick | null {
  const row = roomSellsOn(detail, checkIn).find((r) => r.roomType === roomType);
  if (!row) return null;
  return {
    hotelId: detail.hotel.id,
    name: detail.hotel.name,
    roomType,
    checkIn,
    nights: Math.max(1, nights),
    sellMinor: row.sell,
    netMinor: row.net,
    currency: detail.hotel.currency,
  };
}

/** Writes the chosen room onto the matching hotel line. */
export function applyHotelPick(draft: BookingDraft, pick: HotelPick, opts: ApplyHotelOpts = {}): Partial<BookingDraft> {
  const label = hotelSummary(pick);
  const priced = {
    kind: "hotel" as const,
    label,
    quantity: Math.max(1, pick.nights),
    unitPrice: pick.sellMinor ? minorToInput(pick.sellMinor) : "0",
    unitCost: pick.netMinor ? minorToInput(pick.netMinor) : "0",
  };
  const i = opts.serviceKey
    ? draft.services.findIndex((s) => s.key === opts.serviceKey)
    : draft.services.findIndex((s) => s.kind === "hotel");
  const onlyBlank = draft.services.length === 1 && !draft.services[0].label.trim();
  const services =
    i >= 0
      ? draft.services.map((s, n) => (n === i ? { ...s, ...priced } : s))
      : onlyBlank
        ? [{ ...draft.services[0], ...priced }]
        : [...draft.services, { ...emptyService("hotel"), ...priced }];
  return {
    serviceType: draft.serviceType === "package" || draft.serviceType === "hotel" ? "hotel" : draft.serviceType,
    hotel: pick,
    currency: pick.currency || draft.currency,
    summary: draft.summary.trim() || label,
    services,
  };
}
