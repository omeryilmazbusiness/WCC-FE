import {
  CALENDAR_MONTHS,
  applyMarkup,
  type Markup,
  type MonthlyRate,
  type RoomType,
} from "@/entities/hotel";
import { minorToInput, parseMoneyInput } from "@/shared/lib/money";

export type SheetCell = { net: string; sell: string };
export type MonthlySheet = Record<string, SheetCell>;

export function cellKey(room: RoomType, month: number): string {
  return `${room}/${month}`;
}

export function sheetOf(year: number, rooms: RoomType[], rates: readonly MonthlyRate[]): MonthlySheet {
  const out: MonthlySheet = {};
  for (const room of rooms) {
    for (const month of CALENDAR_MONTHS) {
      const cell = rates.find((r) => r.year === year && r.month === month && r.roomType === room);
      out[cellKey(room, month)] = {
        net: cell?.net ? minorToInput(cell.net) : "",
        sell: cell?.sell ? minorToInput(cell.sell) : "",
      };
    }
  }
  return out;
}

/** Selling price that the hotel markup produces from a typed company price. */
export function sellInputFromNet(netInput: string, markup: Markup): string {
  if (!netInput.trim()) return "";
  const net = parseMoneyInput(netInput);
  if (net == null || net <= 0) return "";
  return minorToInput(applyMarkup(net, markup, 1));
}

export function applyNetToCell(netInput: string, markup: Markup): SheetCell {
  const net = netInput.replace(/[^\d.,]/g, "");
  return { net, sell: sellInputFromNet(net, markup) };
}

/** Recompute every month that already has a company price. */
export function applyMarkupToSheet(sheet: MonthlySheet, rooms: RoomType[], markup: Markup): MonthlySheet {
  const next: MonthlySheet = { ...sheet };
  for (const room of rooms) {
    for (const month of CALENDAR_MONTHS) {
      const key = cellKey(room, month);
      const cell = next[key];
      if (!cell?.net.trim()) continue;
      next[key] = applyNetToCell(cell.net, markup);
    }
  }
  return next;
}

export function ratesOf(year: number, rooms: RoomType[], sheet: MonthlySheet): MonthlyRate[] | null {
  const out: MonthlyRate[] = [];
  for (const room of rooms) {
    for (const month of CALENDAR_MONTHS) {
      const cell = sheet[cellKey(room, month)] ?? { net: "", sell: "" };
      const net = cell.net.trim() ? parseMoneyInput(cell.net) : 0;
      const sell = cell.sell.trim() ? parseMoneyInput(cell.sell) : 0;
      if (net == null || sell == null) return null;
      if (net === 0 && sell === 0) continue;
      out.push({ year, month, roomType: room, net, sell });
    }
  }
  return out;
}

export function sheetEqualsYear(year: number, rooms: RoomType[], sheet: MonthlySheet, stored: readonly MonthlyRate[]): boolean {
  const next = ratesOf(year, rooms, sheet);
  if (!next) return false;
  const prev = stored.filter((r) => r.year === year);
  if (next.length !== prev.length) return false;
  const map = new Map(prev.map((r) => [`${r.roomType}/${r.month}`, r]));
  return next.every((r) => {
    const p = map.get(`${r.roomType}/${r.month}`);
    return Boolean(p && p.net === r.net && p.sell === r.sell);
  });
}
