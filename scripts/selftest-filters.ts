/**
 * Self-test: shared search/filter model used by SearchFilterBar and useFilterState (pure).
 * Run: npm run test:filters
 */

import assert from "node:assert/strict";
import { activeFilters, countActive, defaultOf, setFilter } from "../src/shared/lib/filters.ts";
import { isSearchKind, searchQueryString } from "../src/entities/search/model.ts";

const type = {
  id: "type",
  label: "Type",
  value: "all",
  options: [
    { value: "all", label: "All" },
    { value: "booking", label: "Bookings" },
  ],
};

assert.equal(defaultOf(type), "all", "first option is the default");
assert.equal(defaultOf({ ...type, defaultValue: "booking" }), "booking");
assert.equal(defaultOf({ ...type, options: [] }), "");

assert.deepEqual(activeFilters([type]), [], "default value is not an active filter");
assert.deepEqual(activeFilters([{ ...type, value: "booking" }]), [
  { sectionId: "type", sectionLabel: "Type", value: "booking", valueLabel: "Bookings", defaultValue: "all" },
]);
assert.equal(activeFilters([{ ...type, value: "gone" }])[0].valueLabel, "gone", "unknown value falls back to raw");
assert.deepEqual(activeFilters([{ ...type, value: "all", defaultValue: "booking" }]).map((f) => f.defaultValue), ["booking"]);

const defaults = { type: "all", status: "open" };
assert.equal(countActive(defaults, defaults), 0);
assert.equal(countActive({ type: "booking", status: "open" }, defaults), 1);
assert.equal(countActive({ type: "booking", status: "done" }, defaults), 2);

const same = setFilter(defaults, "type", "all");
assert.equal(same, defaults, "no-op set keeps identity (no re-render)");
assert.deepEqual(setFilter(defaults, "type", "lead"), { type: "lead", status: "open" });

assert.equal(searchQueryString(" ali "), "q=ali", "no kind means every kind");
assert.equal(searchQueryString("ali", { kinds: [] }), "q=ali");
assert.equal(searchQueryString("ali", { kinds: ["booking", "lead"], limit: 20 }), "q=ali&kind=booking%2Clead&limit=20");
assert.equal(searchQueryString("a&b"), "q=a%26b", "query is encoded");
assert.ok(isSearchKind("passport"));
assert.ok(!isSearchKind("invoice"));

console.log("filters selftest OK");
