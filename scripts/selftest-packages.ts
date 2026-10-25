/**
 * Self-test for the package product sheet rules (wire mapping, pricing matrix, costs,
 * currency conversion, itinerary template, eligibility and readiness).
 * Run: npm run test:packages
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_REQUIREMENTS,
  applyKindOffer,
  convertViaUsd,
  costTotal,
  eligibilityIssues,
  customItineraryTemplate,
  emptySpec,
  fromPrice,
  isValidCategory,
  itineraryTemplate,
  stayPlanNights,
  syncStaysWithDistricts,
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
import { brochureFilename, brochurePath, parseBrochureLang } from "../src/entities/tourpackage/brochure.ts";
import { PACKAGE_STEPS, errorPaths, firstErrorStep, stepOfPath } from "../src/features/package-form/model/steps.ts";

function roundTrip() {
  const spec: PackageSpec = {
    ...emptySpec(),
    nights: { makkah: 10, madinah: 4 },
    makkah: { ...emptySpec().makkah, name: "Swissôtel", stars: 5, distanceM: 50, access: "walking", board: "bb", checkIn: "2026-03-01", checkOut: "2026-03-11" },
    flights: { ...emptySpec().flights, airline: "Saudia", routing: "direct", outbound: { route: "IST-JED", flightNo: "SV262", date: "2026-03-01" }, pnr: "ABC123", blockSeats: 40 },
    transfers: { intercity: "haramain_train", busClass: "2025 Mercedes Tourismo", airportMeet: true, hotelTransfers: true },
    destination: { country: "", districts: [] },
    stays: [],
    bus: { company: "SAPTCO", seats: 45, price: 150000, details: "VIP 2+1" },
    services: [],
    activities: [],
    visa: { type: "UMRAH_VISA", healthInsurance: true },
    kit: ["ihram", "zamzam", "City map"],
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
  assert.deepEqual(s.destination, { country: "", districts: [] }, "missing destination is empty");
  assert.deepEqual(s.bus, { company: "", seats: 0, price: 0, details: "" });
  assert.deepEqual(s.services, [], "missing services is empty");
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
  assert.equal(readinessPct(empty), 29, "Madinah (no nights) and optional costs count as done");
  spec.makkah = { ...spec.makkah, name: "Hilton", stars: 5 };
  spec.visa.type = "UMRAH_VISA";
  spec.itinerary = [{ day: 1, city: "makkah", title: "Arrival", details: "" }];
  spec.costs.hotel = 1;
  const road = readinessChecks({ transportMode: "road", spec }, true);
  assert.equal(readinessPct(road), 100, "road trips need no flights");
  const other = readinessChecks({ kind: "other", transportMode: "road", spec: emptySpec() }, true);
  assert.equal(other.visa, true, "other tours do not require a Nusuk visa");
}

function codes() {
  assert.equal(suggestPackageCode("umrah", "ramadan_last15", 2026), "UMR-2026-RAM-01");
  assert.equal(suggestPackageCode("umrah", "ramadan_full", 2026, ["umr-2026-ram-01", "UMR-2026-RAM-02"]), "UMR-2026-RAM-03", "skips taken codes case-insensitively");
  assert.equal(suggestPackageCode("hajj", "special_mujamala", 2027), "HAJ-2027-MJM-01");
  assert.equal(suggestPackageCode("other", "economy", 2026), "CUS-2026-ECO-01");
  assert.equal(suggestPackageCode("umrah", "personal", 2026), "UMR-2026-PER-01");
  assert.equal(suggestPackageCode("umrah", "unknown", 2026), "UMR-2026-PKG-01");
  assert.match(suggestPackageCode("hajj", "long", 2026), /^[A-Z0-9][A-Z0-9-]{1,31}$/, "matches the form/BE code rule");
}

function steps() {
  assert.equal(PACKAGE_STEPS.length, 7);
  assert.equal(stepOfPath("customerId"), "identity");
  assert.equal(stepOfPath("code"), "identity");
  assert.equal(stepOfPath("spec.nights.makkah"), "hotels");
  assert.equal(stepOfPath("spec.madinah.checkOut"), "hotels");
  assert.equal(stepOfPath("prices.DOUBLE"), "pricing");
  assert.equal(stepOfPath("spec.costs.markupPct"), "pricing");
  assert.equal(stepOfPath("spec.flights.inbound.date"), "logistics");
  assert.equal(stepOfPath("spec.bus.company"), "logistics");
  assert.equal(stepOfPath("spec.destination.country"), "identity");
  assert.equal(stepOfPath("spec.stays.0.hotel.name"), "hotels");
  assert.equal(stepOfPath("spec.activities.0.title"), "services");
  assert.equal(stepOfPath("spec.services.0.title"), "services");
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

function customTour() {
  assert.equal(isValidCategory("umrah", "economy"), true);
  assert.equal(isValidCategory("hajj", "luxury"), true);
  assert.equal(isValidCategory("other", "standard"), true);
  assert.equal(isValidCategory("umrah", "personal"), true);
  assert.equal(isValidCategory("hajj", "personal"), true);
  assert.equal(isValidCategory("other", "personal"), true);
  assert.equal(isValidCategory("umrah", "ramadan_last15"), true, "legacy umrah still valid");
  assert.equal(isValidCategory("other", "short"), false);
  const identity = readFileSync(new URL("../src/features/package-form/ui/identity-step.tsx", import.meta.url), "utf8");
  assert.match(identity, /PersonalCustomerField/);
  assert.match(identity, /isPersonalCategory/);
  assert.match(identity, /columns=\{4\}/);
  const stays = syncStaysWithDistricts([], ["Istanbul", "Cappadocia"]);
  assert.deepEqual(stays.map((s) => s.city), ["Istanbul", "Cappadocia"]);
  const kept = syncStaysWithDistricts([{ city: "Istanbul", nights: 3, hotel: emptySpec().makkah }, { city: "Ankara", nights: 2, hotel: { ...emptySpec().makkah, name: "Divan" } }], ["Istanbul"]);
  assert.equal(kept.length, 2, "typed extra stay is kept");
  assert.equal(stayPlanNights({ stays: kept }), 5);
  const days = customItineraryTemplate(
    { durationDays: 5, country: "Turkey", districts: ["Istanbul", "Cappadocia"], activities: [{ title: "Balloon", details: "Sunrise" }] },
    {
      arrival: (place) => `Arrive ${place}`,
      arrivalDetails: "Meet",
      cityDay: (city) => `Day in ${city}`,
      activity: (title) => title,
      farewell: "Leave",
      farewellDetails: "Airport",
    },
  );
  assert.equal(days.length, 5);
  assert.equal(days[0].title, "Arrive Istanbul");
  assert.equal(days[1].city, "Cappadocia");
  assert.equal(days[2].title, "Balloon");
  assert.equal(days[4].title, "Leave");
  const custom: PackageSpec = {
    ...emptySpec(),
    destination: { country: "Turkey", districts: ["Istanbul"] },
    services: [{ title: "Airport transfer", details: "Private car" }, { title: "City card", details: "48h" }],
    activities: [{ title: "Balloon", details: "Sunrise" }],
    visa: { type: "UMRAH_VISA", healthInsurance: true },
    kit: ["ihram"],
    included: ["Umrah visa"],
  };
  applyKindOffer(custom, "other");
  assert.equal(custom.visa.type, "");
  assert.deepEqual(custom.kit, []);
  assert.deepEqual(custom.included, []);
  assert.equal(custom.services.length, 2);
  const wire = specPayload(custom);
  assert.deepEqual(mapSpec(JSON.parse(JSON.stringify(wire))).services, custom.services, "custom services survive the wire");
}

function brochure() {
  assert.equal(parseBrochureLang(""), "en");
  assert.equal(parseBrochureLang("AR"), "ar");
  assert.equal(brochureFilename("umr-2026-eco-01", "en"), "UMR-2026-ECO-01-brochure-en.pdf");
  assert.equal(brochureFilename("  messy name!! ", "ar"), "MESSY-NAME-brochure-ar.pdf");
  assert.equal(brochurePath("pkg-1", "ar"), "/packages/pkg-1/brochure?lang=ar");
}

const tests = { roundTrip, mappingDefaults, pricing, costs, currency, stays, itinerary, eligibility, readiness, codes, steps, customTour, brochure };
for (const [name, fn] of Object.entries(tests)) {
  try {
    fn();
  } catch (err) {
    console.error(`✗ ${name}`);
    throw err;
  }
}
console.log(`packages selftest OK — ${Object.keys(tests).length} groups`);
