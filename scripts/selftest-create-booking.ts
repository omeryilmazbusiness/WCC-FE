/**
 * Self-test: New Booking wizard — draft validation, who-gets-which-service mapping, HTTP payload.
 * Run: npm run test:create-booking
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BOOKING_CREATE_STEPS,
  draftGrandTotal,
  draftIssues,
  emptyBookingDraft,
  firstIssueStep,
  isStepComplete,
  isStepUnlocked,
  serviceLineCategory,
  serviceLineLabel,
  toCreateInput,
  type BookingDraft,
  type FlightPick,
  type ServiceDraft,
  type TravellerDraft,
} from "../src/features/create-booking/model/draft.ts";
import { applyBusRide, busRideIssues, busRideLabel, emptyBusRide, removeBusRide } from "../src/features/create-booking/model/bus-ride.ts";
import { applyCustomer } from "../src/features/create-booking/model/party.ts";
import { applyFlightPick, flightPickFromOffer, flightSummary } from "../src/features/create-booking/model/flight-pick.ts";
import { applyVisaPick, visaPickFromOffer, visaSummary } from "../src/features/create-booking/model/visa-pick.ts";
import { applyHotelPick, hotelPickFromRoom, hotelSummary, roomSellsOn } from "../src/features/create-booking/model/hotel-pick.ts";
import { pricedRoomTypes } from "../src/entities/hotel/lib/monthly.ts";
import type { HotelDetail } from "../src/entities/hotel/model.ts";
import { emptySpec } from "../src/entities/tourpackage/spec.ts";
import { CREATE_LOOK, KIND_LOOK, STEP_LOOK } from "../src/features/create-booking/ui/look.ts";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

function traveller(key: string, name: string, extra: Partial<TravellerDraft> = {}): TravellerDraft {
  return {
    key,
    fullName: name,
    gender: "",
    dateOfBirth: "",
    nationality: "",
    passportNo: "",
    nationalId: "",
    healthOk: false,
    ...extra,
  };
}

function service(key: string, extra: Partial<ServiceDraft> = {}): ServiceDraft {
  return { key, kind: "package", label: "", travellerKeys: [], quantity: 1, unitPrice: "0", unitCost: "0", ...extra };
}

function validDraft(): BookingDraft {
  return {
    ...emptyBookingDraft(),
    customerId: "cust-1",
    customerLabel: "Ali",
    channel: "b2b_agency",
    companyName: "Al Noor Travel",
    serviceType: "package",
    departureId: "dep-1",
    packageId: "pkg-1",
    pnr: "um4z9p",
    summary: "Family Umrah",
    currency: "SAR",
    discountAmt: "100",
    travellers: [
      traveller("a", "Ali Hassan", { gender: "male", nationality: "sa", passportNo: "a1234567", dateOfBirth: "1990-05-01" }),
      traveller("b", "Fatima Hassan", { gender: "female", nationality: "SA", nationalId: "1234567890" }),
    ],
    services: [
      service("s1", { kind: "package", label: "Umrah", travellerKeys: ["a", "b"], quantity: 2, unitPrice: "4000", unitCost: "3000" }),
      service("s2", { kind: "visa", label: "Visa", travellerKeys: ["a"], quantity: 1, unitPrice: "500", unitCost: "400" }),
      service("s3", { kind: "transfer", label: "JED–Makkah", quantity: 1, unitPrice: "250.50", unitCost: "180" }),
    ],
  };
}

function validation() {
  const empty = emptyBookingDraft();
  const issues = draftIssues(empty);
  assert.ok(issues.party?.includes("customer"));
  assert.ok(issues.trip?.includes("departure"));
  assert.ok(issues.travellers?.some((x) => x.startsWith("name:")));
  assert.equal(firstIssueStep(issues), "party");

  const agency = { ...empty, customerId: "c1", channel: "b2b_agency" as const };
  assert.ok(draftIssues(agency).party?.includes("companyName"));

  const badPnr = { ...validDraft(), pnr: "bad pnr!" };
  assert.ok(draftIssues(badPnr).trip?.includes("pnr"));

  const badNid = validDraft();
  badNid.travellers[1] = { ...badNid.travellers[1], nationalId: "12" };
  assert.ok(draftIssues(badNid).travellers?.includes("nationalId:1"));

  const overDiscount = { ...validDraft(), discountAmt: "999999" };
  assert.ok(draftIssues(overDiscount).services?.includes("discount"));

  const badMoney = validDraft();
  badMoney.services[0] = { ...badMoney.services[0], unitPrice: "12.345" };
  assert.ok(draftIssues(badMoney).services?.includes("money:0"));

  assert.equal(firstIssueStep(draftIssues(validDraft())), null);

  const flightTrip = { ...validDraft(), serviceType: "flight" as const, flight: null };
  assert.ok(draftIssues(flightTrip).trip?.includes("flight"));
  const flightOk = { ...flightTrip, flight: samplePick() };
  assert.ok(!draftIssues(flightOk).trip?.includes("flight"));

  const busTrip = { ...validDraft(), serviceType: "bus" as const, buses: [] };
  assert.ok(draftIssues(busTrip).trip?.includes("bus"));

  const visaTrip = { ...validDraft(), serviceType: "visa" as const, visa: null };
  assert.ok(draftIssues(visaTrip).trip?.includes("visa"));
  const hotelTrip = { ...validDraft(), serviceType: "hotel" as const, hotel: null };
  assert.ok(draftIssues(hotelTrip).trip?.includes("hotel"));

  const emptyGate = draftIssues(empty);
  assert.equal(isStepUnlocked("party", emptyGate), true);
  assert.equal(isStepUnlocked("trip", emptyGate), false);
  assert.equal(isStepUnlocked("review", emptyGate), false);
  assert.equal(isStepComplete("party", emptyGate), false);
  const partyOk = draftIssues({ ...empty, customerId: "c1", channel: "agent" });
  assert.equal(isStepUnlocked("trip", partyOk), true);
  assert.equal(isStepUnlocked("travellers", partyOk), false);
  const allOk = draftIssues(validDraft());
  assert.equal(isStepUnlocked("review", allOk), true);
  assert.equal(isStepComplete("services", allOk), true);
}

function samplePick(extra: Partial<FlightPick> = {}): FlightPick {
  return {
    airline: "TK",
    airlineName: "Turkish Airlines",
    flightNumber: "123",
    origin: "IST",
    destination: "JED",
    originAirport: "IST",
    destinationAirport: "JED",
    localDeparture: "2026-12-10T10:00",
    price: 450.5,
    currency: "USD",
    bookingUrl: "https://example.test/tk123",
    ...extra,
  };
}

function partyAndFlight() {
  const unnamed = emptyBookingDraft();
  const seeded = { ...unnamed, ...applyCustomer(unnamed, { id: "c9", fullName: "Omar Ali", nationality: "sa", dateOfBirth: "1988-03-12" }) };
  assert.equal(seeded.customerId, "c9");
  assert.equal(seeded.customerLabel, "Omar Ali");
  assert.equal(seeded.travellers[0].fullName, "Omar Ali");
  assert.equal(seeded.travellers[0].nationality, "SA");
  assert.equal(seeded.travellers[0].dateOfBirth, "1988-03-12");

  const named = { ...unnamed, travellers: [traveller(unnamed.travellers[0].key, "Kept Name")] };
  const kept = applyCustomer(named, { id: "c2", fullName: "New Person", nationality: "tr" });
  assert.equal(kept.customerId, "c2");
  assert.equal(kept.travellers?.[0].fullName, "Kept Name");
  assert.equal(kept.travellers?.[0].nationality, "");

  const pick = flightPickFromOffer(samplePick({ price: 450.5, currency: "EUR" }));
  assert.equal(flightSummary(pick), "TK 123 · IST–JED");
  const twoPax = {
    ...emptyBookingDraft(),
    travellers: [traveller("a", "Ali"), traveller("b", "Fatima")],
    services: [service("s0", { kind: "package", label: "" })],
  };
  const applied = { ...twoPax, ...applyFlightPick(twoPax, pick) };
  assert.equal(applied.serviceType, "flight");
  assert.equal(applied.currency, "EUR");
  assert.equal(applied.supplierSource, "other");
  assert.equal(applied.summary, "TK 123 · IST–JED");
  assert.equal(applied.flight?.flightNumber, "123");
  assert.equal(applied.services[0].kind, "flight");
  assert.equal(applied.services[0].quantity, 2);
  assert.equal(applied.services[0].unitPrice, "450.5");
  assert.equal(applied.services[0].key, "s0");

  const visaPkg = {
    id: "vis-1",
    kind: "visa",
    baseCurrency: "SAR",
    spec: { ...emptySpec(), visaOffers: [{ type: "UMRAH_VISA", net: 40000, sell: 65000, processingDays: 7, healthInsurance: true, notes: "" }] },
    nameEn: "Visa desk",
    nameAr: "",
  };
  const visaPick = visaPickFromOffer(visaPkg, "UMRAH_VISA", "dep-open", "Umrah visa · Visa desk");
  assert.ok(visaPick);
  assert.equal(visaSummary(visaPick), "Umrah visa · Visa desk");
  const visaDraft = {
    ...emptyBookingDraft(),
    travellers: [traveller("a", "Ali"), traveller("b", "Fatima")],
    services: [service("s0", { kind: "package", label: "" })],
  };
  const visaApplied = { ...visaDraft, ...applyVisaPick(visaDraft, visaPick) };
  assert.equal(visaApplied.serviceType, "visa");
  assert.equal(visaApplied.packageId, "vis-1");
  assert.equal(visaApplied.departureId, "dep-open");
  assert.equal(visaApplied.services[0].kind, "visa");
  assert.equal(visaApplied.services[0].unitPrice, "650.00");
  assert.equal(visaApplied.services[0].unitCost, "400.00");
  assert.ok(!draftIssues({ ...validDraft(), ...visaApplied, customerId: "c1", departureId: "dep-open" }).trip?.includes("visa"));

  const extraVisa = {
    ...emptyBookingDraft(),
    serviceType: "package" as const,
    packageId: "umr-1",
    departureId: "dep-umr",
    travellers: [traveller("a", "Ali")],
    services: [service("pkg", { kind: "package", label: "Umrah" }), service("vis", { kind: "visa", label: "" })],
  };
  const extraApplied = { ...extraVisa, ...applyVisaPick(extraVisa, visaPick, { serviceKey: "vis" }) };
  assert.equal(extraApplied.serviceType, "package", "visa add-on does not steal a linked tour");
  assert.equal(extraApplied.packageId, "umr-1");
  assert.equal(extraApplied.departureId, "dep-umr");
  assert.equal(extraApplied.services[0].kind, "package");
  assert.equal(extraApplied.services[1].kind, "visa");
  assert.equal(extraApplied.services[1].unitPrice, "650.00");
  assert.equal(extraApplied.visa?.packageId, "vis-1");

  const rates = [{ year: 2026, month: 12, roomType: "deluxe" as const, net: 40000, sell: 52000 }];
  assert.deepEqual(pricedRoomTypes(["deluxe", "standard"], rates, "2026-12-10").map((r) => r.roomType), ["deluxe"]);
  const hotelDetail = {
    hotel: { id: "h1", name: "Hilton", roomTypes: ["deluxe"], currency: "SAR" },
    monthlyRates: rates,
    seasons: [],
  } as HotelDetail;
  assert.equal(roomSellsOn(hotelDetail, "2026-12-10")[0]?.sell, 52000);
  const hotelPick = hotelPickFromRoom(hotelDetail, "deluxe", "2026-12-10", 3);
  assert.ok(hotelPick);
  assert.equal(hotelSummary(hotelPick), "Hilton · deluxe · 2026-12-10");
  const hotelDraft = { ...emptyBookingDraft(), services: [service("s0", { kind: "package", label: "" })] };
  const hotelApplied = { ...hotelDraft, ...applyHotelPick(hotelDraft, hotelPick) };
  assert.equal(hotelApplied.serviceType, "hotel");
  assert.equal(hotelApplied.services[0].kind, "hotel");
  assert.equal(hotelApplied.services[0].quantity, 3);
  assert.equal(hotelApplied.services[0].unitPrice, "520.00");
  assert.equal(hotelApplied.hotel?.roomType, "deluxe");

  const withVisa = {
    ...twoPax,
    services: [service("visa", { kind: "visa", label: "Visa" })],
  };
  const added = applyFlightPick(withVisa, pick);
  assert.equal(added.services?.[0].kind, "flight");
  assert.equal(added.services?.[1].kind, "visa");
}

function busRides() {
  const blank = emptyBusRide(2);
  assert.ok(busRideIssues(blank).includes("company"));
  assert.ok(busRideIssues(blank).includes("origin"));
  assert.ok(busRideIssues(blank).includes("departDate"));

  const ride = {
    ...emptyBusRide(3),
    company: "Kamil Koç",
    origin: "IST",
    destination: "ANK",
    departDate: "2026-12-10",
    departTime: "22:00",
    unitPrice: "350",
    unitCost: "280",
  };
  assert.deepEqual(busRideIssues(ride), []);
  assert.equal(busRideLabel(ride), "Kamil Koç · IST–ANK · 2026-12-10 22:00");
  assert.ok(busRideIssues({ ...ride, arriveDate: "2026-12-09" }).includes("arriveDate"));

  const draft = emptyBookingDraft();
  const applied = { ...draft, ...applyBusRide(draft, ride) };
  assert.equal(applied.serviceType, "bus");
  assert.equal(applied.buses.length, 1);
  assert.equal(applied.buses[0].company, "Kamil Koç");
  assert.equal(applied.services[0].kind, "bus");
  assert.equal(applied.services[0].quantity, 3);
  assert.equal(applied.services[0].unitPrice, "350");
  assert.equal(serviceLineCategory("bus"), "transport");
  const input = toCreateInput({ ...applied, customerId: "c1", departureId: "d1", travellers: [traveller("a", "Ali")] });
  assert.equal(input.profile?.serviceType, "bus");
  assert.equal(input.items?.[0].category, "transport");

  const second = { ...emptyBusRide(1), company: "Metro", origin: "ANK", destination: "ADA", departDate: "2026-12-11", unitPrice: "200", unitCost: "0" };
  const two = { ...applied, ...applyBusRide(applied, second) };
  assert.equal(two.buses.length, 2);
  const removed = { ...two, ...removeBusRide(two, ride.key) };
  assert.equal(removed.buses.length, 1);
  assert.equal(removed.buses[0].company, "Metro");
}

function mapping() {
  assert.equal(serviceLineCategory("transfer"), "transport");
  assert.equal(serviceLineCategory("visa"), "extras");
  assert.equal(serviceLineCategory("tour"), "extras");
  assert.equal(serviceLineCategory("hotel"), "hotel");
  assert.equal(serviceLineCategory("bus"), "transport");
  const d = validDraft();
  assert.equal(serviceLineLabel(d.services[0], d.travellers), "Umrah — Ali Hassan, Fatima Hassan");
  assert.equal(serviceLineLabel(d.services[1], d.travellers), "Visa — Ali Hassan");
  assert.equal(serviceLineLabel(d.services[2], d.travellers), "JED–Makkah");
  // 2*4000 + 500 + 250.50 = 8750.50 major → 875050 minor; minus 100.00 → 865050
  assert.equal(draftGrandTotal(d), 2 * 400000 + 50000 + 25050 - 10000);

  const input = toCreateInput(d);
  assert.equal(input.customerId, "cust-1");
  assert.equal(input.departureId, "dep-1");
  assert.equal(input.paxCount, 2);
  assert.equal(input.currency, "SAR");
  assert.equal(input.profile?.pnr, "UM4Z9P");
  assert.equal(input.profile?.channel, "b2b_agency");
  assert.equal(input.profile?.companyName, "Al Noor Travel");
  assert.equal(input.participants?.length, 2);
  assert.equal(input.participants?.[0].nationality, "SA");
  assert.equal(input.participants?.[0].dateOfBirth, "1990-05-01");
  assert.equal(input.items?.[0].category, "package");
  assert.equal(input.items?.[0].label, "Umrah — Ali Hassan, Fatima Hassan");
  assert.equal(input.items?.[0].quantity, 2);
  assert.equal(input.items?.[0].unitPrice, 400000);
  assert.equal(input.items?.[1].category, "extras");
  assert.equal(input.items?.[2].category, "transport");
  assert.equal(input.items?.[2].unitPrice, 25050);
  assert.equal(input.totalAmount, draftGrandTotal(d));
  assert.equal(input.discountAmt, 10000);
}

function look() {
  assert.deepEqual(Object.keys(STEP_LOOK), [...BOOKING_CREATE_STEPS]);
  assert.ok(CREATE_LOOK.icon && CREATE_LOOK.tone === "emerald");
  assert.equal(KIND_LOOK.bus.tone, "amber");
  assert.equal(KIND_LOOK.transfer.tone, "amber");
  assert.equal(KIND_LOOK.visa.tone, "rose");
  assert.equal(KIND_LOOK.extras.tone, "zinc");
}

function wiring() {
  const dialog = read("src/features/create-booking/ui/create-booking-dialog.tsx");
  const steps = read("src/features/create-booking/ui/steps.tsx");
  const grid = read("src/shared/ui/form-controls.tsx");
  assert.match(dialog, /DrawerContent/);
  assert.match(dialog, /GlyphTile/);
  assert.match(dialog, /data-testid="create-booking-dialog"/);
  assert.match(dialog, /create-booking-rail-\$\{s\}/);
  assert.match(dialog, /isStepUnlocked/);
  assert.match(dialog, /stepLocked/);
  assert.match(dialog, /disabled=\{!currentReady\}/);
  assert.match(dialog, /data-state=/);
  assert.match(steps, /FormSection/);
  assert.match(steps, /GlyphTile/);
  assert.match(steps, /InitialsAvatar/);
  assert.match(steps, /size="lg"/);
  assert.match(steps, /CustomerFormDialog/);
  assert.match(steps, /PickFlightDialog/);
  assert.match(steps, /PickVisaDialog/);
  assert.match(steps, /VisaServiceField/);
  assert.match(steps, /HotelServiceField/);
  assert.match(steps, /PickHotelDialog/);
  assert.match(steps, /hotels.pricing/);
  assert.match(steps, /BusRideDialog/);
  const visaField = read("src/features/create-booking/ui/visa-service-field.tsx");
  assert.match(visaField, /kind="visa"/);
  assert.match(visaField, /applyVisaPick/);
  assert.match(visaField, /serviceKey/);
  const hotelDlg = read("src/features/create-booking/ui/pick-hotel-dialog.tsx");
  assert.match(hotelDlg, /data-testid="create-booking-hotel-dialog"/);
  assert.match(hotelDlg, /roomSellsOn/);
  const visaEditor = read("src/features/package-form/ui/visa-offers-editor.tsx");
  assert.match(visaEditor, /hotels.pricing/);
  assert.match(steps, /applyCustomer/);
  assert.match(steps, /applyFlightPick/);
  assert.match(steps, /applyBusRide/);
  assert.match(steps, /create-booking-new-customer/);
  assert.match(steps, /create-booking-pick-flight/);
  assert.match(steps, /create-booking-add-bus/);
  const busDlg = read("src/features/create-booking/ui/bus-ride-dialog.tsx");
  assert.match(busDlg, /data-testid="create-booking-bus-dialog"/);
  assert.match(busDlg, /create-booking-bus-company/);
  const picker = read("src/features/create-booking/ui/pick-flight-dialog.tsx");
  assert.match(picker, /data-testid="create-booking-flight-dialog"/);
  assert.match(picker, /FlightSearchForm/);
  assert.match(picker, /w-\[min\(96vw,1180px\)\]/);
  assert.match(picker, /create-booking-select-flight/);
  assert.match(dialog, /onCustomerCreated/);
  assert.match(grid, /size === "lg"/);
  assert.deepEqual([...BOOKING_CREATE_STEPS], ["party", "trip", "travellers", "services", "review"]);
  const api = read("src/entities/booking/api.ts");
  assert.match(api, /participants:/);
  assert.match(api, /full_name:/);
  assert.match(api, /unit_price:/);
  const en = JSON.parse(read("src/shared/i18n/messages/en.json"));
  const ar = JSON.parse(read("src/shared/i18n/messages/ar.json"));
  for (const step of BOOKING_CREATE_STEPS) {
    assert.ok(en.bookings.steps[step].title && ar.bookings.steps[step].title, `steps.${step}`);
  }
  for (const key of [
    "createTitle",
    "forWhom",
    "kind",
    "grand",
    "createCustomer",
    "noCustomersCreate",
    "pickFlight",
    "pickFlightTitle",
    "selectFlight",
    "flightRequired",
    "addBus",
    "busRequired",
    "busCompany",
    "pickVisa",
    "pickVisaTitle",
    "visaRequired",
    "stepLocked",
    "stepDone",
    "pickHotel",
    "pickHotelTitle",
    "hotelRequired",
  ]) {
    assert.ok(en.bookings.form[key] && ar.bookings.form[key], `form.${key}`);
  }
}

validation();
partyAndFlight();
busRides();
mapping();
look();
wiring();
console.log("create-booking selftest OK");
