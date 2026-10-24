import type { MonthlyRate, RoomType } from "../model";

export const CALENDAR_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export function monthlyFromSell(rates: readonly MonthlyRate[], year: number, month: number): number {
  const sells = rates.filter((r) => r.year === year && r.month === month && r.sell > 0).map((r) => r.sell);
  return sells.length ? Math.min(...sells) : 0;
}

export function monthlyFromNet(rates: readonly MonthlyRate[], year: number, month: number): number {
  const nets = rates.filter((r) => r.year === year && r.month === month && r.net > 0).map((r) => r.net);
  return nets.length ? Math.min(...nets) : 0;
}

export function monthlyCell(rates: readonly MonthlyRate[], year: number, month: number, roomType: RoomType): MonthlyRate {
  return rates.find((r) => r.year === year && r.month === month && r.roomType === roomType) ?? {
    year,
    month,
    roomType,
    net: 0,
    sell: 0,
  };
}

export function monthlyPricedCount(rates: readonly MonthlyRate[], year: number, roomType: RoomType): number {
  return CALENDAR_MONTHS.filter((month) => {
    const cell = monthlyCell(rates, year, month, roomType);
    return cell.sell > 0 || cell.net > 0;
  }).length;
}

/** Replace one room type inside a year sheet. Other rooms for that year stay. */
export function replaceRoomInYear(
  existing: readonly MonthlyRate[],
  year: number,
  roomType: RoomType,
  next: readonly MonthlyRate[],
): MonthlyRate[] {
  return [
    ...existing.filter((r) => r.year === year && r.roomType !== roomType),
    ...next.filter((r) => r.year === year && r.roomType === roomType && (r.net > 0 || r.sell > 0)),
  ];
}
