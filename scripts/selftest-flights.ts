/**
 * Self-test: flight search (pure). Covers API mappers (tolerance, unsafe booking links),
 * sorting, gap / duration helpers, wall-clock formatting, form validation, passenger
 * steppers and the URL round-trip of a submitted search.
 * Run: npm run test:flights
 */

import assert from "node:assert/strict";
import {
  gapKind,
  mapOffer,
  mapPlaces,
  mapSearchResult,
  safeBookingUrl,
  searchQueryString,
  sortOffers,
  spanParts,
  wallClockDate,
  airlineLogoUrl,
  errorSearchUrl,
  type FlightOffer,
} from "../src/entities/flight/model.ts";
import {
  addDays,
  canStep,
  defaultForm,
  localDay,
  readFormParams,
  stepPassengers,
  submittedSearch,
  swapPlaces,
  toSearchParams,
  validateForm,
  writeFormParams,
  type FlightSearchForm,
} from "../src/features/flight-search/model/search-form.ts";

const TODAY = "2026-10-02";

function rawOffer(over: Record<string, unknown> = {}) {
  return {
    origin: "IST",
    destination: "DXB",
    origin_airport: "SAW",
    destination_airport: "DXB",
    airline: "PC",
    airline_name: "Pegasus",
    flight_number: "742",
    departure_at: "2026-12-10T13:05:00+03:00",
    local_departure: "2026-12-10T13:05",
    duration_minutes: 255,
    transfers: 0,
    price: 182.5,
    currency: "EUR",
    gap_minutes: -55,
    closest: true,
    cheapest: false,
    booking_url: "https://www.aviasales.com/search/IST1012DXB21?marker=784605&t=x",
    ...over,
  };
}

function mappers() {
  const o = mapOffer(rawOffer());
  assert.ok(o);
  assert.equal(o.airlineName, "Pegasus");
  assert.equal(o.originAirport, "SAW");
  assert.equal(o.gapMinutes, -55);
  assert.equal(o.bookingUrl, "https://www.aviasales.com/search/IST1012DXB21?marker=784605&t=x");

  assert.equal(mapOffer(rawOffer({ booking_url: "javascript:alert(1)" }))?.bookingUrl, "", "unsafe links dropped");
  assert.equal(mapOffer(rawOffer({ booking_url: "http://x.test/a" }))?.bookingUrl, "", "only https");
  assert.equal(mapOffer(rawOffer({ price: 0 })), null, "no price, no offer");
  assert.equal(mapOffer(rawOffer({ local_departure: "10/12 13:05" })), null, "bad wall clock");
  assert.equal(mapOffer(null), null);
  const sparse = mapOffer(rawOffer({ airline_name: "", origin_airport: "", transfers: -1, duration_minutes: "x" }));
  assert.equal(sparse?.airlineName, "PC", "falls back to the code");
  assert.equal(sparse?.originAirport, "IST");
  assert.equal(sparse?.transfers, 0);
  assert.equal(sparse?.durationMinutes, 0);

  assert.equal(safeBookingUrl("not a url"), null);

  const places = mapPlaces([
    { code: "ist", type: "city", name: "Istanbul", country_name: "Türkiye" },
    { code: "SAW", type: "airport", name: "Sabiha Gökçen", city_code: "IST", city_name: "Istanbul" },
    { code: "TOOLONG", type: "city", name: "x" },
    "junk",
  ]);
  assert.deepEqual(places.map((p) => p.code), ["IST", "SAW"]);
  assert.equal(places[0].cityCode, "IST", "a city is its own city");
  assert.equal(mapPlaces({}).length, 0);

  const result = mapSearchResult({
    query: { origin: "IST", destination: "DXB", departure: "2026-12-10T14:00", adults: 2, children: 1, infants: 0, currency: "EUR", direct: true },
    window_hours: 72,
    fetched_at: "2026-10-02T08:00:00Z",
    offers: [rawOffer(), { bad: true }],
    search_url: "https://www.aviasales.com/search/IST1012DXB21?marker=784605",
  });
  assert.equal(result.query.date, "2026-12-10");
  assert.equal(result.query.time, "14:00");
  const anyTime = mapSearchResult({ query: { departure: "2026-12-10T00:00", any_time: true } });
  assert.equal(anyTime.query.time, "", "any-time search has no wanted time");
  assert.equal(anyTime.query.date, "2026-12-10");
  assert.equal(result.query.passengers.children, 1);
  assert.equal(result.query.direct, true);
  assert.equal(result.windowHours, 72);
  assert.equal(result.offers.length, 1, "bad rows skipped");
  assert.equal(mapSearchResult(null).offers.length, 0);
  assert.equal(result.searchUrl, "https://www.aviasales.com/search/IST1012DXB21?marker=784605");
  assert.equal(mapSearchResult({ search_url: "javascript:alert(1)" }).searchUrl, "", "unsafe search link dropped");
  assert.equal(errorSearchUrl({ search_url: "https://www.aviasales.com/search/IST0510DAM1?marker=784605" }),
    "https://www.aviasales.com/search/IST0510DAM1?marker=784605");
  assert.equal(errorSearchUrl({ search_url: "http://x.test" }), "", "plain http refused");
  assert.equal(errorSearchUrl(undefined), "");

  assert.equal(
    searchQueryString({
      origin: "IST", destination: "DXB", date: "2026-12-10", time: "14:00",
      passengers: { adults: 2, children: 1, infants: 0 }, currency: "EUR", direct: false,
    }),
    "origin=IST&destination=DXB&date=2026-12-10&time=14%3A00&adults=2&children=1&infants=0&currency=EUR&direct=false",
  );
  assert.equal(
    searchQueryString({
      origin: "IST", destination: "DXB", date: "2026-12-10", time: "",
      passengers: { adults: 1, children: 0, infants: 0 }, currency: "USD", direct: false,
    }),
    "origin=IST&destination=DXB&date=2026-12-10&adults=1&children=0&infants=0&currency=USD&direct=false",
    "no time, whole day",
  );
}

function display() {
  const a = mapOffer(rawOffer({ price: 300, gap_minutes: 10 })) as FlightOffer;
  const b = mapOffer(rawOffer({ price: 150, gap_minutes: -200 })) as FlightOffer;
  const c = mapOffer(rawOffer({ price: 150, gap_minutes: 90 })) as FlightOffer;
  assert.deepEqual(sortOffers([a, b, c], "closest"), [a, b, c], "closest keeps the server order");
  assert.deepEqual(sortOffers([a, b, c], "cheapest"), [c, b, a], "price, then smaller gap");

  assert.deepEqual(spanParts(255), [["h", 4], ["m", 15]]);
  assert.deepEqual(spanParts(-55), [["m", 55]]);
  assert.deepEqual(spanParts(480), [["h", 8]], "zero units are dropped");
  assert.deepEqual(spanParts(-1680), [["d", 1], ["h", 4]]);
  assert.deepEqual(spanParts(1441), [["d", 1]], "at most two units, largest first");
  assert.deepEqual(spanParts(0), [["m", 0]]);
  assert.equal(gapKind(15), "onTime");
  assert.equal(gapKind(-15), "onTime");
  assert.equal(gapKind(-16), "earlier");
  assert.equal(gapKind(120), "later");

  const d = wallClockDate("2026-12-10T13:05");
  assert.ok(d);
  const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  assert.equal(fmt.format(d), "13:05", "origin wall clock is never shifted");
  assert.equal(wallClockDate("nope"), null);

  assert.equal(airlineLogoUrl("PC"), "https://pics.avs.io/64/64/PC.png");
  assert.equal(airlineLogoUrl("../x"), null);
}

function form(over: Partial<FlightSearchForm> = {}): FlightSearchForm {
  return {
    ...defaultForm(TODAY),
    origin: { code: "IST", label: "Istanbul" },
    destination: { code: "DXB", label: "Dubai" },
    ...over,
  };
}

function validation() {
  assert.equal(localDay(new Date(2026, 0, 5)), "2026-01-05");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");

  const base = defaultForm(TODAY);
  assert.equal(base.date, "2026-10-03", "defaults to tomorrow");
  assert.equal(base.time, "", "no preferred time until one is picked");
  assert.deepEqual(base.passengers, { adults: 1, children: 0, infants: 0 });

  assert.deepEqual(validateForm(form(), TODAY), {});
  assert.deepEqual(validateForm(base, TODAY), { origin: "required", destination: "required" });
  assert.equal(validateForm(form({ destination: { code: "IST", label: "x" } }), TODAY).destination, "sameAsOrigin");
  assert.equal(validateForm(form({ date: "2026-10-01" }), TODAY).date, "past");
  assert.equal(validateForm(form({ date: TODAY }), TODAY).date, undefined, "today is allowed");
  assert.equal(validateForm(form({ date: "2027-10-02" }), TODAY).date, undefined, "365 days ahead is allowed");
  assert.equal(validateForm(form({ date: "2027-10-03" }), TODAY).date, "tooFar");
  assert.equal(validateForm(form({ date: "2026-02-30" }), TODAY).date, "invalid");
  assert.equal(validateForm(form({ date: "" }), TODAY).date, "required");
  assert.equal(validateForm(form({ time: "24:00" }), TODAY).time, "invalid");
  assert.equal(validateForm(form({ time: "" }), TODAY).time, undefined, "time is optional");
  assert.equal(validateForm(form({ passengers: { adults: 0, children: 1, infants: 0 } }), TODAY).passengers, "invalid");
  assert.equal(validateForm(form({ passengers: { adults: 1, children: 0, infants: 2 } }), TODAY).passengers, "infants");
  assert.equal(validateForm(form({ passengers: { adults: 5, children: 5, infants: 0 } }), TODAY).passengers, "tooMany");

  assert.deepEqual(toSearchParams(form({ direct: true })), {
    origin: "IST", destination: "DXB", date: "2026-10-03", time: "",
    passengers: { adults: 1, children: 0, infants: 0 }, currency: "USD", direct: true,
  });
  assert.equal(toSearchParams(base), null);

  const swapped = swapPlaces(form());
  assert.equal(swapped.origin?.code, "DXB");
  assert.equal(swapped.destination?.code, "IST");
}

function passengers() {
  const one = { adults: 1, children: 0, infants: 0 };
  assert.equal(canStep(one, "adults", -1), false, "at least one adult");
  assert.equal(canStep(one, "infants", 1), true);
  assert.equal(canStep({ ...one, infants: 1 }, "infants", 1), false, "one infant per adult");
  assert.equal(canStep({ adults: 5, children: 4, infants: 0 }, "children", 1), false, "max 9");
  assert.equal(canStep(one, "children", -1), false);
  assert.deepEqual(stepPassengers({ adults: 2, children: 0, infants: 2 }, "adults", -1), { adults: 1, children: 0, infants: 1 }, "infants follow adults down");
  assert.deepEqual(stepPassengers(one, "adults", -1), one, "blocked step is a no-op");
  assert.deepEqual(stepPassengers(one, "children", 1), { adults: 1, children: 1, infants: 0 });
}

function url() {
  const f = form({
    origin: { code: "IST", label: "Istanbul" },
    destination: { code: "DXB", label: "DXB" },
    date: "2026-12-10",
    time: "14:00",
    passengers: { adults: 2, children: 1, infants: 1 },
    currency: "EUR",
    direct: true,
  });
  const sp = writeFormParams(new URLSearchParams("tab=x&from=OLD"), f);
  assert.equal(sp.get("tab"), "x", "unrelated params survive");
  assert.equal(sp.get("from"), "IST");
  assert.equal(sp.get("fromName"), "Istanbul");
  assert.equal(sp.has("toName"), false, "label equal to code is not repeated");
  assert.equal(sp.get("direct"), "1");

  const back = readFormParams(sp, TODAY);
  assert.deepEqual(back, f, "round trip");
  assert.deepEqual(submittedSearch(sp, TODAY), toSearchParams(f));

  const noTime = writeFormParams(new URLSearchParams(), form({ date: "2026-12-10" }));
  assert.equal(noTime.has("time"), false, "an empty time stays out of the URL");
  assert.deepEqual(readFormParams(noTime, TODAY), form({ date: "2026-12-10" }), "round trip without time");
  assert.equal(submittedSearch(noTime, TODAY)?.time, "");
  assert.equal(submittedSearch(new URLSearchParams("from=IST&to=DXB&date=2026-12-10&time=25:00"), TODAY), null, "bad time is not run");

  assert.equal(submittedSearch(new URLSearchParams(""), TODAY), null, "nothing submitted");
  assert.equal(submittedSearch(new URLSearchParams("from=IST&to=IST&date=2026-12-10"), TODAY), null, "invalid search is not run");
  assert.equal(submittedSearch(new URLSearchParams("from=IST&to=DXB&date=2026-01-01"), TODAY), null, "past search is not run");

  const tolerant = readFormParams(new URLSearchParams("from=ist&to=x&adults=abc&currency=btc&direct=yes"), TODAY);
  assert.equal(tolerant.origin?.code, "IST");
  assert.equal(tolerant.destination, null);
  assert.equal(tolerant.passengers.adults, 1);
  assert.equal(tolerant.currency, "USD");
  assert.equal(tolerant.direct, false);
  assert.equal(readFormParams(new URLSearchParams(`from=IST&fromName=${"a".repeat(200)}`), TODAY).origin?.label.length, 80);
}

mappers();
display();
validation();
passengers();
url();
console.log("selftest-flights: ok");
