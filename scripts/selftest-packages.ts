/**
 * Self-test for the package product sheet rules (wire mapping, pricing matrix, costs,
 * currency conversion, itinerary template, eligibility and readiness).
 * Run: npm run test:packages
 */
import assert from "node:assert/strict";
import {
  DEFAULT_REQUIREMENTS,
  convertViaUsd,
  costTotal,
  eligibilityIssues,
  emptySpec,
  fromPrice,
  itineraryTemplate,
  mapSpec,
  marginPct,
  readinessChecks,
  readinessPct,
  roomOrderWarnings,
  specPayload,
  stayNights,
  suggestedPrice,
  suggestPackageCode,
  type PackageSpec,
} from "../src/entities/tourpackage/spec.ts";
import { PACKAGE_STEPS, errorPaths, firstErrorStep, stepOfPath } from "../src/features/package-form/model/steps.ts";

function roundTrip() {
  const spec: PackageSpec = {
    ...emptySpec(),
    nights: { makkah: 10, madinah: 4 },
    makkah: { ...emptySpec().makkah, name: "Swissôtel", stars: 5, distanceM: 50, access: "walking", board: "bb", checkIn: "2026-03-01", checkOut: "2026-03-11" },
    flights: { ...emptySpec().flights, airline: "Saudia", routing: "direct", outbound: { route: "IST-JED", flightNo: "SV262", date: "2026-03-01" }, pnr: "ABC123", blockSeats: 40 },
    transfers: { intercity: "haramain_train", busClass: "2025 Mercedes Tourismo", airportMeet: true, hotelTransfers: true },
    visa: { type: "UMRAH_VISA", healthInsurance: true },
    kit: ["ihram", "zamzam"],
    ziyarat: { makkah: ["hira"], madinah: ["quba", "uhud"] },
    itinerary: [{ day: 1, city: "makkah", title: "Arrival", details: "First Umrah" }],
    costs: { currency: "SAR", flight: 300000, hotel: 500000, visa: 50000, transfer: 20000, guidance: 10000, gifts: 5050, markupPct: 20 },
  };
  const wire = specPayload(spec);
  assert.equal((wire.makkah as Record<string, unknown>).distance_m, 50, "snake_case on the wire");
  assert.deepEqual(mapSpec(JSON.parse(JSON.stringify(wire))), spec, "payload → mapSpec is lossless");
}

function mappingDefaults() {
  const s = mapSpec({ kit: null, ziyarat: { makkah: ["hira", 7] }, visa: { type: "WORK" }, makkah: { board: "ai" } }, "USD");
  assert.deepEqual(s.kit, [], "null lists become empty");
  assert.deepEqual(s.ziyarat.makkah, ["hira"], "non-strings dropped");
  assert.equal(s.visa.type, "", "unknown visa ignored");
  assert.equal(s.makkah.board, "", "unknown board ignored");
  assert.deepEqual(s.requirements, DEFAULT_REQUIREMENTS, "requirements default for legacy packages");
  assert.equal(s.costs.currency, "USD", "costs follow the package currency");
}

function pricing() {
  const rows = [
    { code: "QUAD", kind: "room" as const, amount: 950000, active: true },
    { code: "TRIPLE", kind: "room" as const, amount: 1050000, active: true },
    { code: "DOUBLE", kind: "room" as const, amount: 1000000, active: true },
    { code: "SINGLE", kind: "room" as const, amount: 0, active: true },
    { code: "INFANT", kind: "age" as const, amount: 100, active: true },
  ];
  assert.equal(fromPrice(rows), 950000, "cheapest priced room, ages ignored");
  assert.equal(fromPrice([{ code: "QUAD", kind: "room", amount: 900000, active: false }]), null, "inactive rows ignored");
  assert.deepEqual(roomOrderWarnings(rows), ["DOUBLE"], "double cheaper than triple is flagged");
}

function costs() {
  const c = { currency: "SAR", flight: 300000, hotel: 500000, visa: 50000, transfer: 20000, guidance: 10000, gifts: 5050, markupPct: 20 };
  assert.equal(costTotal(c), 885050);
  assert.equal(suggestedPrice(c), 1062100, "matches backend rounding to whole SAR");
  assert.equal(marginPct(1000000, 800000), 20);
  assert.equal(marginPct(0, 800000), null);
}

function currency() {
  const crosses = { SAR: "3.75", EUR: "0.8775", TRY: "41.2" };
  assert.equal(convertViaUsd(375000, "SAR", "USD", crosses), 100000, "SAR 3,750 = USD 1,000");
  assert.equal(convertViaUsd(100000, "USD", "TRY", crosses), 4120000);
  assert.equal(convertViaUsd(375000, "SAR", "EUR", crosses), 87750);
  assert.equal(convertViaUsd(1, "SAR", "GBP", crosses), null, "missing cross → null");
  assert.equal(convertViaUsd(5, "SAR", "SAR", {}), 5);
}

function stays() {
  assert.equal(stayNights({ checkIn: "2026-03-01", checkOut: "2026-03-11" }), 10);
  assert.equal(stayNights({ checkIn: "2026-03-11", checkOut: "2026-03-01" }), null);
  assert.equal(stayNights({ checkIn: "", checkOut: "2026-03-01" }), null);
}

function itinerary() {
  const labels = {
    arrival: "Arrival",
    arrivalDetails: "Ihram, miqat, first Umrah",
    makkahDay: "Worship in Makkah",
    makkahZiyarat: "Makkah ziyarat",
    transfer: (mode: string) => `Transfer by ${mode}`,
    madinahDay: "Worship in Madinah",
    madinahZiyarat: "Madinah ziyarat",
    farewell: "Farewell",
    farewellDetails: "Tawaf al-Wada",
  };
  const days = itineraryTemplate({ durationDays: 14, makkahNights: 10, madinahNights: 4, intercity: "train" }, labels);
  assert.equal(days.length, 14, "one entry per day");
  assert.deepEqual(days.map((d) => d.day), Array.from({ length: 14 }, (_, i) => i + 1), "consecutive days");
  assert.equal(days[0].title, "Arrival");
  assert.equal(days[2].title, "Makkah ziyarat");
  assert.equal(days[10].title, "Transfer by train");
  assert.equal(days[10].city, "madinah");
  assert.equal(days[11].title, "Madinah ziyarat");
  assert.equal(days[13].title, "Farewell");
  assert.equal(itineraryTemplate({ durationDays: 0, makkahNights: 0, madinahNights: 0, intercity: "" }, labels).length, 0);
  const makkahOnly = itineraryTemplate({ durationDays: 5, makkahNights: 4, madinahNights: 0, intercity: "" }, labels);
  assert.ok(makkahOnly.every((d) => d.city !== "madinah"), "no Madinah days without Madinah nights");
  assert.equal(makkahOnly.length, 5);
}

function eligibility() {
  const depart = "2026-08-31";
  const codes = (t: Parameters<typeof eligibilityIssues>[1]) => eligibilityIssues(DEFAULT_REQUIREMENTS, t, depart).map((i) => i.code);
  assert.deepEqual(codes({ passportExpiresAt: null, gender: "male" }), ["passport_missing", "meningitis", "photo"]);
  const short = eligibilityIssues(DEFAULT_REQUIREMENTS, { passportExpiresAt: "2027-02-27", gender: "male" }, depart);
  assert.equal(short[0].code, "passport_short");
  assert.equal(short[0].until, "2027-02-28", "six months from Aug 31 clamps to Feb 28");
  assert.ok(!codes({ passportExpiresAt: "2027-02-28", gender: "male" }).includes("passport_short"));
  assert.ok(codes({ passportExpiresAt: "2030-01-01", gender: "female", dateOfBirth: "2000-01-01" }).includes("mahram"));
  assert.ok(!codes({ passportExpiresAt: "2030-01-01", gender: "female", dateOfBirth: "1970-01-01" }).includes("mahram"), "over the age limit");
  const unknown = eligibilityIssues(DEFAULT_REQUIREMENTS, { passportExpiresAt: "2030-01-01" }, depart).find((i) => i.code === "mahram");
  assert.equal(unknown?.level, "info", "unknown gender is a reminder, not a warning");
  const relaxed = { ...DEFAULT_REQUIREMENTS, meningitis: false, biometricPhoto: false, mahram: false };
  assert.deepEqual(eligibilityIssues(relaxed, { passportExpiresAt: "2030-01-01" }, depart), []);
}

function readiness() {
  const spec = emptySpec();
  const empty = readinessChecks({ transportMode: "flight_scheduled", spec }, false);
  assert.equal(readinessPct(empty), 14, "only Madinah (no nights planned) counts as done");
  spec.makkah = { ...spec.makkah, name: "Hilton", stars: 5 };
  spec.visa.type = "UMRAH_VISA";
  spec.itinerary = [{ day: 1, city: "makkah", title: "Arrival", details: "" }];
  spec.costs.hotel = 1;
  const road = readinessChecks({ transportMode: "road", spec }, true);
  assert.equal(readinessPct(road), 100, "road trips need no flights");
}

function codes() {
  assert.equal(suggestPackageCode("umrah", "ramadan_last15", 2026), "UMR-2026-RAM-01");
  assert.equal(suggestPackageCode("umrah", "ramadan_full", 2026, ["umr-2026-ram-01", "UMR-2026-RAM-02"]), "UMR-2026-RAM-03", "skips taken codes case-insensitively");
  assert.equal(suggestPackageCode("hajj", "special_mujamala", 2027), "HAJ-2027-MJM-01");
  assert.equal(suggestPackageCode("umrah", "unknown", 2026), "UMR-2026-PKG-01");
  assert.match(suggestPackageCode("hajj", "long", 2026), /^[A-Z0-9][A-Z0-9-]{1,31}$/, "matches the form/BE code rule");
}

function steps() {
  assert.equal(PACKAGE_STEPS.length, 7);
  assert.equal(stepOfPath("code"), "identity");
  assert.equal(stepOfPath("spec.nights.makkah"), "hotels");
  assert.equal(stepOfPath("spec.madinah.checkOut"), "hotels");
  assert.equal(stepOfPath("prices.DOUBLE"), "pricing");
  assert.equal(stepOfPath("spec.costs.markupPct"), "pricing");
  assert.equal(stepOfPath("spec.flights.inbound.date"), "logistics");
  assert.equal(stepOfPath("spec.visa.type"), "services");
  assert.equal(stepOfPath("spec.itinerary.3.title"), "itinerary");
  assert.equal(stepOfPath("spec.requirements.passportMonths"), "requirements");
  assert.equal(stepOfPath("spec.kitchen"), "identity", "prefix match is per segment");

  const errors = {
    spec: {
      itinerary: [undefined, { title: { message: "x", type: "custom" } }],
      flights: { outbound: { route: { message: "bad", type: "custom", ref: {} } } },
    },
    prices: { SINGLE: { message: "money", type: "custom" } },
  };
  assert.deepEqual(errorPaths(errors).sort(), ["prices.SINGLE", "spec.flights.outbound.route", "spec.itinerary.1.title"]);
  assert.equal(firstErrorStep(errors), "pricing", "earliest step in sheet order wins");
  assert.equal(firstErrorStep({ code: { message: "x" }, spec: { requirements: { passportMonths: { message: "y" } } } }), "identity");
  assert.equal(firstErrorStep({}), null);
}

const tests = { roundTrip, mappingDefaults, pricing, costs, currency, stays, itinerary, eligibility, readiness, codes, steps };
for (const [name, fn] of Object.entries(tests)) {
  try {
    fn();
  } catch (err) {
    console.error(`✗ ${name}`);
    throw err;
  }
}
console.log(`packages selftest OK — ${Object.keys(tests).length} groups`);
