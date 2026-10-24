import {
  CALENDAR_MONTHS,
  bpsToPercentInput,
  type Markup,
  type MarkupKind,
  type MonthlyRate,
  type RoomType,
} from "@/entities/hotel";
import { minorToInput, parseMoneyInput } from "@/shared/lib/money";
import { parseMarkupDraft } from "./draft";
import { sellInputFromNet } from "./monthly-sheet";

/** One calendar month: company price + margin → selling price. */
export type MonthPriceDraft = {
  net: string;
  marginKind: MarkupKind;
  marginValue: string;
  sell: string;
};

export type RoomYearDraft = {
  year: number;
  months: Record<number, MonthPriceDraft>;
};

export function markupDraftOf(m: Markup): { kind: MarkupKind; value: string } {
  return { kind: m.kind, value: m.kind === "percent" ? bpsToPercentInput(m.value) : minorToInput(m.value) };
}

export function emptyMonthPrice(fallback: Markup): MonthPriceDraft {
  const m = markupDraftOf(fallback);
  return { net: "", marginKind: m.kind, marginValue: m.value, sell: "" };
}

export function emptyRoomYear(year: number, fallback: Markup): RoomYearDraft {
  const months: Record<number, MonthPriceDraft> = {};
  for (const month of CALENDAR_MONTHS) months[month] = emptyMonthPrice(fallback);
  return { year, months };
}

export function monthMarkup(d: MonthPriceDraft): Markup {
  return { kind: d.marginKind, value: parseMarkupDraft(d.marginKind, d.marginValue) ?? 0 };
}

export function priceMonth(d: MonthPriceDraft): MonthPriceDraft {
  return { ...d, sell: sellInputFromNet(d.net, monthMarkup(d)) };
}

export function applyMonthNet(d: MonthPriceDraft, net: string): MonthPriceDraft {
  return priceMonth({ ...d, net: net.replace(/[^\d.,]/g, "") });
}

export function applyMonthMargin(d: MonthPriceDraft, kind: MarkupKind, value: string): MonthPriceDraft {
  return priceMonth({ ...d, marginKind: kind, marginValue: value.replace(/[^\d.,]/g, "") });
}

export function applyMonthSell(d: MonthPriceDraft, sell: string): MonthPriceDraft {
  return { ...d, sell: sell.replace(/[^\d.,]/g, "") };
}

export function roomYearToRates(room: RoomType, draft: RoomYearDraft): MonthlyRate[] | null {
  const out: MonthlyRate[] = [];
  for (const month of CALENDAR_MONTHS) {
    const cell = draft.months[month] ?? emptyMonthPrice({ kind: "percent", value: 0 });
    const net = cell.net.trim() ? parseMoneyInput(cell.net) : 0;
    const sell = cell.sell.trim() ? parseMoneyInput(cell.sell) : 0;
    if (net == null || sell == null) return null;
    if (net === 0 && sell === 0) continue;
    out.push({ year: draft.year, month, roomType: room, net, sell });
  }
  return out;
}

export function roomYearFromRates(room: RoomType, year: number, rates: readonly MonthlyRate[], fallback: Markup): RoomYearDraft {
  const draft = emptyRoomYear(year, fallback);
  for (const r of rates) {
    if (r.roomType !== room || r.year !== year) continue;
    draft.months[r.month] = {
      ...emptyMonthPrice(fallback),
      net: r.net ? minorToInput(r.net) : "",
      sell: r.sell ? minorToInput(r.sell) : "",
    };
  }
  return draft;
}

export function pricedMonthCount(draft: RoomYearDraft): number {
  return CALENDAR_MONTHS.filter((m) => draft.months[m]?.net.trim() || draft.months[m]?.sell.trim()).length;
}

/** Merge per-room year sheets into API payloads grouped by year. */
export function ratesByYear(sheets: Partial<Record<RoomType, RoomYearDraft>>): Map<number, MonthlyRate[]> | null {
  const out = new Map<number, MonthlyRate[]>();
  for (const [room, draft] of Object.entries(sheets) as [RoomType, RoomYearDraft][]) {
    if (!draft) continue;
    const rows = roomYearToRates(room, draft);
    if (!rows) return null;
    const prev = out.get(draft.year) ?? [];
    out.set(draft.year, prev.concat(rows));
  }
  return out;
}
