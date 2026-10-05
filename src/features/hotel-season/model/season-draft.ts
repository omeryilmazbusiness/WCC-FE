import {
  OCCUPANCIES,
  bpsToPercentInput,
  daysBetween,
  overlappingSeason,
  parsePercentInput,
  pricedRates,
  rateGrid,
  type Hotel,
  type MarkupKind,
  type Occupancy,
  type Rate,
  type Season,
  type SeasonInput,
  type SeasonKind,
} from "@/entities/hotel";
import { minorToInput, parseMoneyInput } from "@/shared/lib/money";

export const MAX_SEASON_DAYS = 731;

export type RateCells = Record<Occupancy, string>;
export type RateRow = Pick<Rate, "roomType" | "mealPlan"> & { cells: RateCells };

export type SeasonDraft = {
  name: string;
  kind: SeasonKind;
  startDate: string;
  endDate: string;
  ownMarkup: boolean;
  markupKind: MarkupKind;
  markupValue: string;
  rows: RateRow[];
};

export type SeasonDraftError =
  | { field: "name" | "dates" | "span" | "markup" | "rates" | "cells" }
  | { field: "overlap"; season: Season };

const toCells = (r: Rate): RateCells =>
  Object.fromEntries(OCCUPANCIES.map((o) => [o, r[o] ? minorToInput(r[o]) : ""])) as RateCells;

export function seasonDraft(hotel: Hotel, season?: Season | null): SeasonDraft {
  const markup = season?.markup ?? hotel.markup;
  return {
    name: season?.name ?? "",
    kind: season?.kind ?? "low",
    startDate: season?.startDate ?? "",
    endDate: season?.endDate ?? "",
    ownMarkup: Boolean(season?.markup),
    markupKind: markup.kind,
    markupValue: markup.kind === "percent" ? bpsToPercentInput(markup.value) : minorToInput(markup.value),
    rows: rateGrid(hotel, season?.rates).map((r) => ({ roomType: r.roomType, mealPlan: r.mealPlan, cells: toCells(r) })),
  };
}

/** Copies another season's matrix into the draft (rows the hotel no longer sells are skipped). */
export function copyRates(draft: SeasonDraft, hotel: Hotel, from: Season): SeasonDraft {
  return { ...draft, rows: rateGrid(hotel, from.rates).map((r) => ({ roomType: r.roomType, mealPlan: r.mealPlan, cells: toCells(r) })) };
}

export function parseCell(v: string): number | null {
  if (!v.trim()) return 0;
  return parseMoneyInput(v);
}

export function draftMarkupValue(d: Pick<SeasonDraft, "markupKind" | "markupValue">): number | null {
  if (!d.markupValue.trim()) return 0;
  const v = d.markupKind === "percent" ? parsePercentInput(d.markupValue) : parseMoneyInput(d.markupValue);
  if (v == null || (d.markupKind === "percent" && v > 50_000)) return null;
  return v;
}

export function draftRates(d: SeasonDraft): Rate[] | null {
  const out: Rate[] = [];
  for (const row of d.rows) {
    const r: Rate = { roomType: row.roomType, mealPlan: row.mealPlan, single: 0, double: 0, triple: 0, quad: 0 };
    for (const o of OCCUPANCIES) {
      const v = parseCell(row.cells[o]);
      if (v == null) return null;
      r[o] = v;
    }
    out.push(r);
  }
  return pricedRates(out);
}

/** First blocking problem, in the order the form shows them. */
export function seasonDraftError(d: SeasonDraft, others: readonly Season[], selfId?: string): SeasonDraftError | null {
  if (!d.name.trim()) return { field: "name" };
  if (!d.startDate || !d.endDate || d.endDate < d.startDate) return { field: "dates" };
  if (daysBetween(d.startDate, d.endDate) + 1 > MAX_SEASON_DAYS) return { field: "span" };
  const clash = overlappingSeason({ id: selfId, startDate: d.startDate, endDate: d.endDate }, others);
  if (clash) return { field: "overlap", season: clash };
  if (d.ownMarkup && draftMarkupValue(d) == null) return { field: "markup" };
  const rates = draftRates(d);
  if (rates == null) return { field: "cells" };
  if (rates.length === 0) return { field: "rates" };
  return null;
}

export function seasonInput(d: SeasonDraft): SeasonInput {
  return {
    name: d.name.trim(),
    kind: d.kind,
    startDate: d.startDate,
    endDate: d.endDate,
    markup: d.ownMarkup ? { kind: d.markupKind, value: draftMarkupValue(d) ?? 0 } : null,
    rates: draftRates(d) ?? [],
  };
}
