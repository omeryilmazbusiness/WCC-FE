/**
 * Self-test: the one-year lead archive (pure). Search parsing mirrors the
 * backend's lead.ParseSearch, matching mirrors the repository's SQL (every
 * word in name/email/company/source, digits against the phone ignoring
 * formatting, or the whole query in the owner's name), the "year" period is
 * the 12-month retention window, and the new filters reach the URL.
 * Run: npm run test:lead-archive
 */

import assert from "node:assert/strict";
import {
  LEAD_PERIODS,
  LEAD_QUERY_MAX,
  LEAD_RETENTION_MONTHS,
  isLeadPeriod,
  leadMatchesSearch,
  leadQueryParams,
  parseLeadSearch,
  periodRange,
  type SearchableLead,
} from "../src/entities/lead/lib/query.ts";

// Parsing.
assert.deepEqual(parseLeadSearch(""), []);
assert.deepEqual(parseLeadSearch("   "), []);
assert.deepEqual(parseLeadSearch("Ayşe  KAYA"), ["ayşe", "kaya"]);
assert.deepEqual(parseLeadSearch("kaya kaya, Kaya"), ["kaya"]);
assert.deepEqual(parseLeadSearch("+90 (555) 123-45"), ["9055512345"]);
assert.deepEqual(parseLeadSearch("555"), ["555"]);
assert.deepEqual(parseLeadSearch("a b c d e f g"), ["a", "b", "c", "d", "e"]);
assert.deepEqual(parseLeadSearch("acme 2024"), ["acme", "2024"]);

// Matching.
const ayse: SearchableLead = {
  fullName: "Ayşe Kaya",
  phone: "+90 (555) 123 45 67",
  source: "Instagram",
  ownerName: "Sara Sales",
  profile: { email: "ayse@example.com", companyName: "" },
};
const acme: SearchableLead = {
  fullName: "Mehmet Demir",
  phone: "05321112233",
  source: "web",
  ownerName: "Gm User",
  profile: { email: "m@acme.io", companyName: "Acme 50%_Travel" },
};
const hit = (l: SearchableLead, q: string) => leadMatchesSearch(l, q);

assert.ok(hit(ayse, ""), "empty search matches everything");
assert.ok(hit(ayse, "KAYA ayşe"), "all words, any order, any case");
assert.ok(!hit(ayse, "kaya demir"), "every word must match");
assert.ok(hit(ayse, "555 123-45"), "phone typed with other formatting");
assert.ok(hit(ayse, "5551234567"), "phone digits only");
assert.ok(!hit(acme, "555 123"), "phone fragment of another lead");
assert.ok(hit(acme, "1112233"), "phone tail");
assert.ok(hit(acme, "acme.io"), "email");
assert.ok(hit(acme, "acme travel"), "company words");
assert.ok(hit(acme, "50%_t"), "wildcards are literal text");
assert.ok(!hit(ayse, "%"), "a wildcard never matches everything");
assert.ok(hit(ayse, "instagram"), "source");
assert.ok(hit(ayse, "sara sales"), "owner name as a whole");
assert.ok(!hit(ayse, "zzqqxx"), "no match");

// Year period: the 12-month archive window, ending after today.
assert.equal(LEAD_RETENTION_MONTHS, 12);
assert.ok(isLeadPeriod("year"));
assert.deepEqual(LEAD_PERIODS, ["all", "week", "month", "quarter", "year"]);
const now = new Date(2026, 9, 15, 14, 30);
const year = periodRange("year", now, 1);
assert.deepEqual(year.from, new Date(2025, 9, 15));
assert.deepEqual(year.to, new Date(2026, 9, 16));
const leap = periodRange("year", new Date(2024, 1, 29, 9), 1);
assert.deepEqual(leap.from, new Date(2023, 2, 1), "Feb 29 rolls like the backend's AddDate");

// URL parameters.
const sp = leadQueryParams({ q: "  ayşe  ", priority: "high", segment: "b2b", lostReason: "price" });
assert.equal(sp.get("q"), "ayşe");
assert.equal(sp.get("priority"), "high");
assert.equal(sp.get("segment"), "b2b");
assert.equal(sp.get("lost_reason"), "price");
assert.equal(leadQueryParams({}).toString(), "");
const long = leadQueryParams({ q: "ş".repeat(LEAD_QUERY_MAX + 20) }).get("q") ?? "";
assert.equal(Array.from(long).length, LEAD_QUERY_MAX, "query clipped to the backend limit in characters");
const emoji = leadQueryParams({ q: "😀".repeat(LEAD_QUERY_MAX + 1) }).get("q") ?? "";
assert.equal(Array.from(emoji).length, LEAD_QUERY_MAX, "never splits a surrogate pair");

console.log("lead archive self-test: ok");
