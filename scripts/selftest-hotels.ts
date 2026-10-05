/**
 * Self-test for hotel contracting rules: markup (mirrors the server's `Markup.Apply`), date
 * math, rate grid, inventory signals, child/cancellation policies and the form drafts.
 * Run: npm run test:hotels
 */
import assert from "node:assert/strict";
import {
  DEFAULT_CANCELLATION,
  DEFAULT_CHILD_POLICY,
  DEFAULT_MARKUP,
  addDays,
  applyMarkup,
  bpsToPercentInput,
  cancellationLadder,
  childRuleCharge,
  daysBetween,
  emptyRate,
  fillPct,
  hotelToInput,
  mailtoUrl,
  mapsUrl,
  overlappingSeason,
  parsePercentInput,
  pricedRates,
  rateFrom,
  rateGrid,
  releaseIn,
  releasingSoon,
  roomNet,
  seasonFrom,
  seasonOn,
  stopSaleOn,
  type Allotment,
  type Hotel,
  type Rate,
  type Season,
  type StopSale,
} from "./shims/hotel-entity.ts";
import { draftErrors, draftFromHotel, draftToInput, newDraft } from "../src/features/hotel-form/model/draft.ts";
import {
  cancellationError,
  childDraft,
  childDraftError,
  childPolicyOf,
  nextTier,
  parseRule,
} from "../src/features/hotel-policy/model/policy-draft.ts";
import { defaultQuoteRequest, payingAdults, quoteFormError } from "../src/features/hotel-quote/model/quote-form.ts";
import { draftRates, seasonDraft, seasonDraftError, seasonInput } from "../src/features/hotel-season/model/season-draft.ts";

const hotel: Hotel = {
  id: "h1",
  branchId: "b1",
  name: "Swissôtel Makkah",
  nameAr: "",
  stars: 5,
  location: { city: "Makkah", country: "SA", district: "Ajyad", latitude: null, longitude: null, landmark: "haram", distanceM: 150 },
  contact: { salesName: "", salesPhone: "", salesEmail: "", reservationsEmail: "res@swiss.example" },
  roomTypes: ["deluxe", "standard"],
  mealPlans: ["bb", "ro"],
  currency: "SAR",
  markup: { ...DEFAULT_MARKUP },
  childPolicy: { ...DEFAULT_CHILD_POLICY },
  cancellation: { ...DEFAULT_CANCELLATION },
  notes: "",
  isActive: true,
  createdAt: "",
  updatedAt: "",
};

const rate: Rate = { roomType: "standard", mealPlan: "bb", single: 50_000, double: 30_000, triple: 25_000, quad: 0 };

const season = (id: string, startDate: string, endDate: string, rates: Rate[] = [rate]): Season => ({
  id,
  hotelId: "h1",
  name: id,
  kind: "low",
  startDate,
  endDate,
  markup: null,
  rates,
});

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

test("markup mirrors the server (half-up bps, fixed per paying guest)", () => {
  assert.equal(applyMarkup(12_345, { kind: "percent", value: 1500 }), 14_197);
  assert.equal(applyMarkup(10_000, { kind: "fixed", value: 500 }, 2), 11_000);
  assert.equal(applyMarkup(10_000, { kind: "percent", value: 0 }), 10_000);
  assert.equal(applyMarkup(0, { kind: "fixed", value: 500 }), 0, "unpriced cells stay unpriced");
});

test("percent inputs round-trip through basis points", () => {
  assert.equal(bpsToPercentInput(1500), "15");
  assert.equal(bpsToPercentInput(1250), "12.5");
  assert.equal(bpsToPercentInput(1205), "12.05");
  assert.equal(parsePercentInput("12.5"), 1250);
  assert.equal(parsePercentInput("12,05"), 1205);
  assert.equal(parsePercentInput("15."), 1500);
  assert.equal(parsePercentInput("abc"), null);
  assert.equal(parsePercentInput("1234"), null);
});

test("calendar math is timezone free", () => {
  assert.equal(addDays("2026-02-27", 2), "2026-03-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(daysBetween("2026-12-30", "2027-01-02"), 3);
});

test("room net and 'from' prices", () => {
  assert.equal(roomNet(rate, 1), 50_000, "single is per room");
  assert.equal(roomNet(rate, 2), 60_000);
  assert.equal(roomNet(rate, 3), 75_000);
  assert.equal(roomNet(rate, 4), 0, "uncontracted occupancy");
  assert.equal(roomNet(rate, 5), 0);
  assert.equal(rateFrom(rate), 30_000);
  assert.equal(rateFrom({ ...rate, double: 0 }), 50_000);
  assert.equal(seasonFrom({ rates: [rate, emptyRate("deluxe", "ro")] }), 30_000);
  assert.equal(seasonFrom({ rates: [] }), 0);
});

test("rate grid follows the canonical order and keeps existing prices", () => {
  const suite: Rate = { ...rate, roomType: "suite" };
  const deluxeBb: Rate = { ...rate, roomType: "deluxe" };
  const grid = rateGrid(hotel, [deluxeBb, suite]);
  assert.deepEqual(
    grid.map((r) => `${r.roomType}/${r.mealPlan}`),
    ["standard/ro", "standard/bb", "deluxe/ro", "deluxe/bb"],
  );
  assert.equal(grid[3].double, 30_000);
  assert.notEqual(grid[3], deluxeBb, "rows are copies");
  assert.deepEqual(pricedRates(grid), [deluxeBb]);
});

test("season and stop-sale lookups", () => {
  const seasons = [season("a", "2026-10-01", "2026-10-31"), season("b", "2026-11-01", "2026-11-30")];
  assert.equal(seasonOn(seasons, "2026-11-01")?.id, "b");
  assert.equal(seasonOn(seasons, "2026-12-01"), null);
  assert.equal(overlappingSeason({ startDate: "2026-10-31", endDate: "2026-11-02" }, seasons)?.id, "a");
  assert.equal(overlappingSeason({ id: "a", startDate: "2026-10-05", endDate: "2026-10-06" }, seasons), null, "ignores itself");

  const stop = (roomType: StopSale["roomType"]): StopSale => ({
    id: roomType || "all",
    hotelId: "h1",
    startDate: "2026-12-20",
    endDate: "2026-12-22",
    roomType,
    reason: "",
    createdAt: "",
  });
  assert.equal(stopSaleOn([stop("suite")], "2026-12-21", "standard"), null);
  assert.equal(stopSaleOn([stop("suite")], "2026-12-21", "suite")?.id, "suite");
  assert.equal(stopSaleOn([stop("")], "2026-12-22", "standard")?.id, "all");
  assert.equal(stopSaleOn([stop("")], "2026-12-23"), null);
});

test("allotment fill and release signals", () => {
  assert.equal(fillPct(8, 10), 80);
  assert.equal(fillPct(11, 10), 100);
  assert.equal(fillPct(1, 3), 33);
  assert.equal(fillPct(1, 0), 0);

  const base: Allotment = {
    id: "a1",
    hotelId: "h1",
    roomType: "standard",
    kind: "guaranteed",
    startDate: "2026-11-01",
    endDate: "2026-11-30",
    rooms: 10,
    sold: 4,
    releaseDays: 21,
    notes: "",
    releaseDate: "2026-10-11",
    status: "open",
    available: 6,
  };
  assert.equal(releaseIn(base, "2026-10-05"), 6);
  const list = [
    base,
    { ...base, id: "far", releaseDate: "2026-10-20" },
    { ...base, id: "full", available: 0 },
    { ...base, id: "req", kind: "on_request" as const },
    { ...base, id: "gone", releaseDate: "2026-10-04" },
  ];
  assert.deepEqual(releasingSoon(list, "2026-10-05").map((a) => a.id), ["a1"]);
});

test("child rules charge against the adult per-person rate", () => {
  assert.equal(childRuleCharge({ mode: "percent", value: 75 }, 30_001), 22_501);
  assert.equal(childRuleCharge({ mode: "fixed", value: 5000 }, 30_000), 5000);
  assert.equal(childRuleCharge({ mode: "free", value: 0 }, 30_000), 0);
});

test("cancellation ladder reads far to near", () => {
  assert.deepEqual(cancellationLadder(DEFAULT_CANCELLATION), [
    { kind: "free", fromDays: 14 },
    { kind: "nights", fromDays: 7, toDays: 13, value: 1 },
    { kind: "percent", fromDays: 0, toDays: 6, value: 100 },
    { kind: "no_show", value: 100 },
  ]);
  assert.deepEqual(cancellationLadder({ freeDays: 10, tiers: [{ minDays: 3, kind: "percent", value: 50 }], noShowPct: 80 }), [
    { kind: "free", fromDays: 10 },
    { kind: "percent", fromDays: 3, toDays: 9, value: 50 },
    { kind: "percent", fromDays: 0, toDays: 2, value: 100 },
    { kind: "no_show", value: 80 },
  ], "the gap below the last tier is the full stay");
  assert.deepEqual(cancellationLadder({ freeDays: 0, tiers: [], noShowPct: 100 }), [
    { kind: "free", fromDays: 0 },
    { kind: "no_show", value: 100 },
  ], "free until check-in");
});

test("cancellation validation and next tier mirror the server", () => {
  assert.equal(cancellationError(DEFAULT_CANCELLATION), null);
  assert.equal(cancellationError({ ...DEFAULT_CANCELLATION, freeDays: 366 }), "freeDays");
  assert.equal(cancellationError({ ...DEFAULT_CANCELLATION, noShowPct: 101 }), "noShow");
  assert.equal(cancellationError({ freeDays: 5, tiers: [{ minDays: 5, kind: "nights", value: 1 }], noShowPct: 100 }), "tierDays");
  assert.equal(
    cancellationError({ freeDays: 5, tiers: [{ minDays: 2, kind: "nights", value: 1 }, { minDays: 2, kind: "percent", value: 10 }], noShowPct: 0 }),
    "tierDuplicate",
  );
  assert.equal(cancellationError({ freeDays: 5, tiers: [{ minDays: 2, kind: "nights", value: 61 }], noShowPct: 0 }), "tierValue");

  assert.deepEqual(nextTier(DEFAULT_CANCELLATION), { minDays: 13, kind: "percent", value: 50 });
  assert.equal(nextTier({ freeDays: 1, tiers: [{ minDays: 0, kind: "percent", value: 100 }], noShowPct: 100 }), null);
  assert.equal(nextTier({ freeDays: 0, tiers: [], noShowPct: 100 }), null);
});

test("child policy draft round-trips and validates", () => {
  const d = childDraft(DEFAULT_CHILD_POLICY);
  assert.equal(childDraftError(d), null);
  assert.deepEqual(childPolicyOf(d), DEFAULT_CHILD_POLICY);
  assert.equal(childDraftError({ ...d, child1MaxAge: 2 }), "ages");
  assert.equal(childDraftError({ ...d, rules: { ...d.rules, child1: { mode: "percent", value: "101" } } }), "child1");
  assert.equal(childDraftError({ ...d, extraBedAdult: "12.345" }), "extraBed");
  assert.deepEqual(parseRule({ mode: "fixed", value: "150.5" }), { mode: "fixed", value: 15_050 });
  assert.deepEqual(parseRule({ mode: "fixed", value: "" }), { mode: "fixed", value: 0 });
  assert.equal(parseRule({ mode: "percent", value: "7.5" }), null);
});

test("hotel draft validates and keeps policies on edit", () => {
  const fresh = newDraft();
  assert.deepEqual(Object.keys(draftErrors(fresh)).sort(), ["city", "name"]);

  const d = draftFromHotel({ ...hotel, childPolicy: { ...DEFAULT_CHILD_POLICY, extraBedAdult: 9900 } });
  assert.deepEqual(draftErrors(d), {});
  assert.equal(draftErrors({ ...d, latitude: "21.4" }).longitude, "coordsPair");
  assert.equal(draftErrors({ ...d, latitude: "91", longitude: "39" }).latitude, "latitude");
  assert.equal(draftErrors({ ...d, reservationsEmail: "nope" }).reservationsEmail, "email");
  assert.equal(draftErrors({ ...d, markupValue: "600" }).markupValue, "markupPercent");
  assert.equal(draftErrors({ ...d, country: "SAU" }).country, "country");

  const input = draftToInput({ ...d, country: "sa", latitude: "21,42", longitude: "39.82" }, { ...hotel, childPolicy: { ...DEFAULT_CHILD_POLICY, extraBedAdult: 9900 } });
  assert.equal(input.location.country, "SA");
  assert.equal(input.location.latitude, 21.42);
  assert.equal(input.childPolicy?.extraBedAdult, 9900, "profile edits never reset policies");
  assert.deepEqual(input.markup, DEFAULT_MARKUP);
  assert.deepEqual(hotelToInput(hotel).location, hotel.location);
});

test("season draft: matrix parsing, overlap and override markup", () => {
  const others = [season("a", "2026-10-01", "2026-10-31")];
  const d = { ...seasonDraft(hotel), name: "Ramadan", startDate: "2026-11-01", endDate: "2026-11-30" };
  assert.equal(d.rows.length, 4);
  assert.deepEqual(seasonDraftError(d, others), { field: "rates" });

  d.rows[0].cells.double = "300";
  assert.equal(seasonDraftError(d, others), null);
  assert.deepEqual(draftRates(d), [{ roomType: "standard", mealPlan: "ro", single: 0, double: 30_000, triple: 0, quad: 0 }]);

  assert.deepEqual(seasonDraftError({ ...d, startDate: "2026-10-31" }, others), { field: "overlap", season: others[0] });
  assert.equal(seasonDraftError({ ...d, startDate: "2026-10-31" }, others, "a"), null, "editing itself");
  assert.deepEqual(seasonDraftError({ ...d, endDate: "2026-10-30" }, others), { field: "dates" });
  assert.deepEqual(seasonDraftError({ ...d, endDate: "2028-12-01" }, others), { field: "span" });
  const bad = { ...d, rows: d.rows.map((r, i) => (i === 1 ? { ...r, cells: { ...r.cells, quad: "1.234" } } : r)) };
  assert.deepEqual(seasonDraftError(bad, others), { field: "cells" });

  assert.equal(seasonInput(d).markup, null, "inherits the hotel markup");
  const own = seasonInput({ ...d, ownMarkup: true, markupKind: "fixed", markupValue: "25" });
  assert.deepEqual(own.markup, { kind: "fixed", value: 2500 });

  const edit = seasonDraft(hotel, { ...others[0], markup: { kind: "percent", value: 1250 } });
  assert.equal(edit.ownMarkup, true);
  assert.equal(edit.markupValue, "12.5");
});

test("quote form defaults and limits", () => {
  const req = defaultQuoteRequest(hotel, "2026-10-05");
  assert.equal(req.checkIn, "2026-11-04");
  assert.equal(req.checkOut, "2026-11-09");
  assert.equal(req.roomType, "standard", "first contracted room in canonical order");
  assert.equal(req.mealPlan, "ro");
  assert.equal(quoteFormError(req, hotel), null);
  assert.equal(quoteFormError({ ...req, checkOut: req.checkIn }, hotel), "dates");
  assert.equal(quoteFormError({ ...req, checkOut: addDays(req.checkIn, 61) }, hotel), "tooLong");
  const teen = { ...req, adults: 3, children: [{ age: 12 }, { age: 5 }] };
  assert.equal(payingAdults(teen, hotel), 4, "children over the child-2 band pay as adults");
  assert.equal(quoteFormError(teen, hotel), null);
  assert.equal(quoteFormError({ ...teen, children: [{ age: 12 }, { age: 13 }] }, hotel), "occupancy");

  const bbOnly: Rate[] = [
    { ...rate, roomType: "deluxe", mealPlan: "bb" },
    { ...rate, roomType: "standard", mealPlan: "bb" },
    { ...rate, roomType: "suite", mealPlan: "ro" },
  ];
  const covering = defaultQuoteRequest(hotel, "2026-10-05", [season("s", "2026-11-01", "2026-12-20", bbOnly)]);
  assert.equal(covering.checkIn, "2026-11-04");
  assert.deepEqual([covering.roomType, covering.mealPlan], ["standard", "bb"], "first priced combination the hotel sells");

  const later = defaultQuoteRequest(hotel, "2026-10-05", [
    season("past", "2026-01-01", "2026-03-01"),
    season("unpriced", "2026-11-01", "2026-11-30", []),
    season("dec", "2026-12-21", "2027-01-05", bbOnly),
  ]);
  assert.equal(later.checkIn, "2026-12-21", "jumps to the next priced season");
  assert.equal(later.checkOut, "2026-12-26");

  const running = defaultQuoteRequest(hotel, "2026-10-05", [season("now", "2026-09-01", "2026-10-20")]);
  assert.equal(running.checkIn, "2026-10-05", "a season ending before the default day starts today");
});

test("links", () => {
  assert.equal(
    mapsUrl(hotel),
    "https://www.google.com/maps/search/?api=1&query=Swiss%C3%B4tel%20Makkah%2C%20Makkah%2C%20SA",
  );
  assert.ok(mapsUrl({ ...hotel, location: { ...hotel.location, latitude: 21.42, longitude: 39.82 } }).endsWith("query=21.42%2C39.82"));
  assert.equal(mailtoUrl(" res@x.sa ", "Voucher #1", "a&b"), "mailto:res@x.sa?subject=Voucher%20%231&body=a%26b");
});

console.log(`hotels: ${passed} groups passed`);
