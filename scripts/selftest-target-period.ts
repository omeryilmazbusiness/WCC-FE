/**
 * Self-test: target period boundaries (pure). Cases mirror the backend's
 * ResolvePeriod tests so the dialog preview matches what the API stores.
 * Run: npm run test:target-period
 */

import assert from "node:assert/strict";
import {
  daysInclusive,
  isCalendarPeriod,
  isoWeek,
  MAX_PERIOD_DAYS,
  resolvePeriod,
  shiftPeriod,
  TARGET_PERIOD_KINDS,
  todayISO,
} from "../src/entities/revenuetarget/lib/period.ts";

function range(kind: Parameters<typeof resolvePeriod>[0], start: string, end?: string) {
  const r = resolvePeriod(kind, start, end);
  assert.ok(r.ok, `${kind} ${start}..${end} should resolve`);
  return `${r.range.start}..${r.range.end}`;
}

// Calendar kinds snap around the anchor and ignore the end date.
assert.equal(range("weekly", "2026-09-30"), "2026-09-28..2026-10-04");
assert.equal(range("weekly", "2026-09-28"), "2026-09-28..2026-10-04");
assert.equal(range("weekly", "2026-10-04"), "2026-09-28..2026-10-04");
assert.equal(range("weekly", "2026-12-31"), "2026-12-28..2027-01-03");
assert.equal(range("monthly", "2026-02-14", "2030-01-01"), "2026-02-01..2026-02-28");
assert.equal(range("monthly", "2028-02-10"), "2028-02-01..2028-02-29");
assert.equal(range("monthly", "2026-12-31"), "2026-12-01..2026-12-31");
assert.equal(range("yearly", "2026-06-15"), "2026-01-01..2026-12-31");

// Explicit kinds keep both dates and validate them.
assert.equal(range("season", "2027-04-01", "2027-06-30"), "2027-04-01..2027-06-30");
assert.equal(range("custom", "2027-04-01", "2027-04-01"), "2027-04-01..2027-04-01");
const errorOf = (kind: Parameters<typeof resolvePeriod>[0], start: string, end?: string) => {
  const r = resolvePeriod(kind, start, end);
  return r.ok ? null : r.error;
};
assert.equal(errorOf("monthly", ""), "start");
assert.equal(errorOf("monthly", "2026-02-30"), "start", "impossible dates are rejected");
assert.equal(errorOf("custom", "2026-01-01"), "end");
assert.equal(errorOf("season", "2026-05-01", "2026-04-30"), "end");
assert.equal(errorOf("custom", "2026-01-01", "2029-06-01"), "span");
assert.equal(daysInclusive("2026-01-01", "2028-12-31") <= MAX_PERIOD_DAYS, true, "3 calendar years fit");

// Stepping through calendar periods.
assert.equal(shiftPeriod("weekly", "2026-09-30", 1), "2026-10-07");
assert.equal(shiftPeriod("monthly", "2026-01-31", 1), "2026-02-01", "month step lands on the 1st, never skips February");
assert.equal(shiftPeriod("monthly", "2026-01-15", -1), "2025-12-01");
assert.equal(shiftPeriod("yearly", "2026-06-15", 1), "2027-01-01");
assert.equal(shiftPeriod("custom", "2026-06-15", 1), "2026-06-15");

// ISO week numbers, including year boundaries.
assert.equal(isoWeek("2026-09-30"), 40);
assert.equal(isoWeek("2026-01-01"), 1);
assert.equal(isoWeek("2027-01-01"), 53, "Fri 1 Jan 2027 belongs to week 53 of 2026");
assert.equal(isoWeek("2024-12-30"), 1, "Mon 30 Dec 2024 is week 1 of 2025");

// Helpers.
assert.equal(daysInclusive("2026-09-28", "2026-10-04"), 7);
assert.equal(daysInclusive("2026-03-28", "2026-03-30"), 3, "DST-free day counting");
assert.deepEqual([...TARGET_PERIOD_KINDS], ["weekly", "monthly", "season", "yearly", "custom"]);
assert.ok(isCalendarPeriod("weekly") && !isCalendarPeriod("season") && !isCalendarPeriod("custom"));
assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/);
assert.equal(todayISO(new Date(2026, 8, 30, 23, 59)), "2026-09-30", "today uses the local calendar day");

console.log("target period self-test OK");
