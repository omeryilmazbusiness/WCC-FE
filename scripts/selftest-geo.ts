/**
 * Self-test: location catalogue (generated GeoNames files) and the picker helpers
 * (localized alphabetical options, search ranking, time zones, caching catalogue).
 * Run: pnpm test:geo
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COUNTRY_ROWS, GEO_DATA_VERSION } from "../src/entities/geo/model/countries.generated.ts";
import {
  buildSearchIndex,
  cityOptions,
  countryOptions,
  normalizeSearch,
  searchOptions,
  timezoneFor,
} from "../src/entities/geo/model/options.ts";
import { createStaticGeoCatalog, parseCityFile, type CityFile } from "../src/entities/geo/api/static-catalog.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "public/geo", GEO_DATA_VERSION, "cities");
const readFile = (code: string) => JSON.parse(fs.readFileSync(path.join(DIR, `${code}.json`), "utf8")) as CityFile;

const validZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// generated data: every country has a file, unique values, valid zones, backend length limit
{
  const codes = COUNTRY_ROWS.map(([code]) => code);
  assert.ok(codes.length >= 240, `only ${codes.length} countries`);
  assert.equal(new Set(codes).size, codes.length);
  assert.deepEqual(fs.readdirSync(DIR).map((f) => f.replace(".json", "")).sort(), [...codes].sort());
  const regions = new Intl.DisplayNames(["en"], { type: "region" });
  let total = 0;
  for (const [code, tz] of COUNTRY_ROWS) {
    assert.match(code, /^[A-Z]{2}$/);
    assert.notEqual(regions.of(code), code, `no display name for ${code}`);
    assert.ok(validZone(tz), `${code}: ${tz}`);
    const file = readFile(code);
    assert.ok(file.c.length > 0, `${code} has no cities`);
    for (const zone of file.tz) assert.ok(validZone(zone), `${code}: ${zone}`);
    const values = file.c.map(([value]) => value);
    assert.equal(new Set(values).size, values.length, `${code}: duplicate city value`);
    for (const [value, ar, zone] of file.c) {
      assert.ok(value.trim() === value && value.length > 0 && value.length <= 80, `${code}: "${value}"`);
      assert.ok(!/[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069\ufeff]/.test(value + ar), `${code}: bidi mark in "${value}"`);
      assert.ok(file.tz[zone], `${code}: ${value} has no zone`);
    }
    total += file.c.length;
  }
  assert.ok(total > 200_000, `only ${total} cities`);
}

// well-known places are present, with Arabic names and their own zones
{
  const sy = parseCityFile(readFile("SY"));
  for (const name of ["Damascus", "Aleppo", "Homs", "Latakia", "Hama", "Tartus"]) {
    assert.ok(sy.some((c) => c.value === name), `SY: ${name}`);
  }
  assert.equal(sy.find((c) => c.value === "Damascus")?.ar, "دمشق");
  const tr = parseCityFile(readFile("TR"));
  for (const name of ["Istanbul", "Ankara", "İzmir", "Gaziantep", "Şanlıurfa"]) assert.ok(tr.some((c) => c.value === name), `TR: ${name}`);
  const us = parseCityFile(readFile("US"));
  assert.equal(us.find((c) => c.value === "Los Angeles")?.timezone, "America/Los_Angeles");
  assert.ok(us.filter((c) => c.value.startsWith("Springfield, ")).length > 3, "repeated names carry their region");
  assert.ok(us.some((c) => c.value === "Houston") && us.some((c) => c.value === "Houston, Missouri"), "a dominant namesake keeps the bare name");
  assert.ok(!us.some((c) => c.value === "Springfield"), "balanced namesakes all carry their region");
  assert.ok(!tr.some((c) => / Province\b/.test(c.value)), "no unit names in city values");
  assert.ok(tr.some((c) => c.value === "Gölbaşı, Adıyaman"), "namesakes carry the bare region name");
  assert.equal(COUNTRY_ROWS.find(([code]) => code === "SY")?.[1], "Asia/Damascus");
}

// options: localized, alphabetical, saved values outside the catalogue are kept
{
  const countries = COUNTRY_ROWS.map(([code, timezone]) => ({ code, timezone }));
  for (const locale of ["en", "ar"]) {
    const collator = new Intl.Collator(locale, { sensitivity: "base" });
    const labels = countryOptions(countries, locale).map((o) => o.label);
    assert.ok(labels.every((l, i) => i === 0 || collator.compare(labels[i - 1], l) <= 0), `countries sorted (${locale})`);
    const cities = cityOptions(parseCityFile(readFile("SY")), locale).map((o) => o.label);
    assert.ok(cities.every((l, i) => i === 0 || collator.compare(cities[i - 1], l) <= 0), `cities sorted (${locale})`);
  }
  assert.equal(countryOptions(countries, "en").find((o) => o.value === "SY")?.label, "Syria");
  assert.equal(countryOptions(countries, "ar").find((o) => o.value === "SY")?.label, "سوريا");
  const sy = parseCityFile(readFile("SY"));
  assert.equal(cityOptions(sy, "ar").find((o) => o.value === "Damascus")?.label, "دمشق");
  assert.ok(cityOptions(sy, "en", "Old Quarter").some((o) => o.value === "Old Quarter"));
  assert.ok(countryOptions(countries, "en", "ZZ").some((o) => o.value === "ZZ"));

  assert.equal(timezoneFor(countries, sy, "SY", "Aleppo", "UTC"), "Asia/Damascus");
  const us = parseCityFile(readFile("US"));
  assert.equal(timezoneFor(countries, us, "US", "Chicago", "UTC"), "America/Chicago");
  assert.equal(timezoneFor(countries, [], "US", "", "UTC"), COUNTRY_ROWS.find(([c]) => c === "US")?.[1]);
  assert.equal(timezoneFor(countries, [], "ZZ", "", "Asia/Riyadh"), "Asia/Riyadh");
}

// search: accent / case / Arabic-form insensitive, prefix first, capped
{
  assert.equal(normalizeSearch("  Şanlıurfa "), "sanliurfa");
  assert.equal(normalizeSearch("إدلب"), normalizeSearch("ادلب"));
  const countries = COUNTRY_ROWS.map(([code, timezone]) => ({ code, timezone }));
  const index = buildSearchIndex(countryOptions(countries, "ar"));
  assert.equal(searchOptions(index, "syr", 5).options[0]?.value, "SY", "English name is searchable in Arabic");
  assert.equal(searchOptions(index, "سور", 5).options[0]?.value, "SY");

  const tr = buildSearchIndex(cityOptions(parseCityFile(readFile("TR")), "en"));
  const ist = searchOptions(tr, "ist", 10);
  assert.equal(ist.options[0]?.value, "Istanbul");
  const all = searchOptions(tr, "", 100);
  assert.equal(all.options.length, 100);
  assert.ok(all.total > 1000);
  assert.deepEqual(searchOptions(tr, "zzzz-none", 10), { options: [], total: 0 });
}

// files are ranked by prominence; before typing the best-known cities are suggested, alphabetically
{
  const top50 = (code: string) => readFile(code).c.slice(0, 50).map(([value]) => value);
  for (const city of ["New York", "Los Angeles", "Chicago", "Houston", "Miami"]) assert.ok(top50("US").includes(city), city);
  for (const city of ["Berlin", "Munich", "Hamburg", "Cologne"]) assert.ok(top50("DE").includes(city), city);
  assert.ok(!top50("TR").some((v) => v.endsWith(", Istanbul")), "metropolis districts are not suggested");

  const trCities = parseCityFile(readFile("TR"));
  assert.equal(trCities[0].value, "Istanbul");
  assert.ok(trCities.every((c, i) => c.rank === i));
  assert.equal(parseCityFile(readFile("SY")).slice(0, 2).map((c) => c.value).sort().join(), "Aleppo,Damascus");

  for (const locale of ["en", "ar"]) {
    const index = buildSearchIndex(cityOptions(trCities, locale));
    const top = searchOptions(index, "", 100, 50);
    assert.equal(top.options.length, 50);
    assert.equal(top.total, trCities.length);
    assert.ok(top.options.every((o) => (o.rank ?? 99) < 50));
    const collator = new Intl.Collator(locale, { sensitivity: "base" });
    assert.ok(top.options.every((o, i) => i === 0 || collator.compare(top.options[i - 1].label, o.label) <= 0));
    for (const city of ["Istanbul", "Ankara", "İzmir", "Antalya"]) assert.ok(top.options.some((o) => o.value === city), city);
  }
  // while typing every city is reachable; bigger places come first within a match tier
  const index = buildSearchIndex(cityOptions(trCities, "en"));
  assert.equal(searchOptions(index, "an", 10).options[0]?.value, "Ankara");
  const smallest = trCities[trCities.length - 1].value;
  assert.equal(searchOptions(index, smallest, 10).options.some((o) => o.value === smallest), true);

  const countries = COUNTRY_ROWS.map(([code, timezone]) => ({ code, timezone }));
  const all = searchOptions(buildSearchIndex(countryOptions(countries, "en")), "", 100, countries.length);
  assert.equal(all.options.length, countries.length, "every country is listed");
}

// catalogue: one request per country, failures are not cached, unknown codes need no request
{
  let calls = 0;
  let fail = true;
  const catalog = createStaticGeoCatalog({
    version: GEO_DATA_VERSION,
    rows: COUNTRY_ROWS,
    load: async (url) => {
      calls++;
      assert.equal(url, `/geo/${GEO_DATA_VERSION}/cities/SY.json`);
      if (fail) throw new Error("offline");
      return readFile("SY");
    },
  });
  assert.equal(catalog.countries().length, COUNTRY_ROWS.length);
  await assert.rejects(catalog.cities("SY"));
  fail = false;
  const [a, b] = await Promise.all([catalog.cities("SY"), catalog.cities("SY")]);
  assert.equal(a, b);
  await catalog.cities("SY");
  assert.equal(calls, 2);
  assert.deepEqual(await catalog.cities("ZZ"), []);
  assert.equal(calls, 2);
}

console.log("selftest-geo: OK");
