/**
 * Self-test: dashboard reporting window (pure). Covers presets, custom ranges,
 * validation against the API's 366-day cap, shortcuts and URL round-trips.
 * Run: npm run test:dashboard-period
 */

import assert from "node:assert/strict";
import {
  DEFAULT_PERIOD,
  MAX_RANGE_DAYS,
  daysInclusive,
  parseISODay,
  parsePeriodParams,
  periodDays,
  periodKey,
  resolveWindow,
  shortcutRange,
  toISODay,
  trailingRange,
  validateRange,
  writePeriodParams,
  type DashboardPeriod,
} from "../src/entities/dashboard/lib/period.ts";

const now = new Date(2026, 8, 30, 15, 30); // 30 Sep 2026, 15:30 local
const DAY = 86_400_000;

// Day parsing is strict and local.
assert.equal(toISODay(now), "2026-09-30");
assert.equal(parseISODay("2026-02-30"), null);
assert.equal(parseISODay("2026-9-1"), null);
assert.equal(parseISODay("2026-09-01")?.getDate(), 1);

// Inclusive day counts, across month, leap day and DST boundaries.
assert.equal(daysInclusive("2026-09-30", "2026-09-30"), 1);
assert.equal(daysInclusive("2026-09-01", "2026-09-30"), 30);
assert.equal(daysInclusive("2028-02-01", "2028-03-01"), 30);
assert.equal(daysInclusive("2026-03-01", "2026-03-31"), 31);
assert.equal(daysInclusive("2026-01-01", "2026-12-31"), 365);
assert.equal(daysInclusive("bad", "2026-09-30"), 0);

// Validation.
assert.equal(validateRange("2026-09-01", "2026-09-30", now), null);
assert.equal(validateRange("", "2026-09-30", now), "required");
assert.equal(validateRange("2026-09-10", "2026-09-01", now), "order");
assert.equal(validateRange("2026-09-01", "2026-10-01", now), "future");
assert.equal(validateRange("2025-09-29", "2026-09-29", now), null);
assert.equal(daysInclusive("2025-09-29", "2026-09-29"), MAX_RANGE_DAYS);
assert.equal(validateRange("2025-09-28", "2026-09-29", now), "tooLong");

// Presets roll back from now.
const preset = resolveWindow({ kind: "preset", days: 7 }, now);
assert.equal(preset.to.getTime(), now.getTime());
assert.equal(now.getTime() - preset.from.getTime(), 7 * DAY);

// Custom windows cover whole local days and stop at now when they include today.
const past = resolveWindow({ kind: "custom", from: "2026-08-01", to: "2026-08-31" }, now);
assert.equal(past.from.getTime(), new Date(2026, 7, 1).getTime());
assert.equal(past.to.getTime(), new Date(2026, 8, 1).getTime());
const toToday = resolveWindow({ kind: "custom", from: "2026-09-30", to: "2026-09-30" }, now);
assert.equal(toToday.from.getTime(), new Date(2026, 8, 30).getTime());
assert.equal(toToday.to.getTime(), now.getTime());
assert.ok(toToday.from < toToday.to);

// Days and keys.
assert.equal(periodDays({ kind: "preset", days: 90 }), 90);
assert.equal(periodDays({ kind: "custom", from: "2026-09-01", to: "2026-09-30" }), 30);
assert.equal(periodKey({ kind: "preset", days: 7 }), "7");
assert.equal(periodKey({ kind: "custom", from: "2026-09-01", to: "2026-09-30" }), "2026-09-01_2026-09-30");

// Shortcuts and seeds.
assert.deepEqual(trailingRange(7, now), { from: "2026-09-24", to: "2026-09-30" });
assert.equal(daysInclusive(trailingRange(30, now).from, "2026-09-30"), 30);
assert.deepEqual(shortcutRange("thisMonth", now), { from: "2026-09-01", to: "2026-09-30" });
assert.deepEqual(shortcutRange("lastMonth", now), { from: "2026-08-01", to: "2026-08-31" });
assert.deepEqual(shortcutRange("quarter", now), { from: "2026-07-01", to: "2026-09-30" });
assert.deepEqual(shortcutRange("yearToDate", now), { from: "2026-01-01", to: "2026-09-30" });
assert.deepEqual(shortcutRange("lastMonth", new Date(2026, 0, 15)), { from: "2025-12-01", to: "2025-12-31" });
for (const s of ["thisMonth", "lastMonth", "quarter", "yearToDate"] as const) {
  const r = shortcutRange(s, now);
  assert.equal(validateRange(r.from, r.to, now), null, s);
}

// URL round-trips keep unrelated params and drop the default.
function roundTrip(p: DashboardPeriod, base = "tab=x"): { qs: string; back: DashboardPeriod } {
  const qs = writePeriodParams(new URLSearchParams(base), p).toString();
  return { qs, back: parsePeriodParams(new URLSearchParams(qs), now) };
}
assert.deepEqual(roundTrip(DEFAULT_PERIOD), { qs: "tab=x", back: DEFAULT_PERIOD });
assert.deepEqual(roundTrip({ kind: "preset", days: 7 }).back, { kind: "preset", days: 7 });
assert.equal(roundTrip({ kind: "preset", days: 90 }).qs, "tab=x&period=90");
const custom: DashboardPeriod = { kind: "custom", from: "2026-07-01", to: "2026-09-30" };
assert.deepEqual(roundTrip(custom).back, custom);
assert.equal(writePeriodParams(new URLSearchParams("from=2026-01-01&to=2026-01-02"), { kind: "preset", days: 7 }).toString(), "period=7");

// Tampered URLs fall back safely.
assert.deepEqual(parsePeriodParams(new URLSearchParams("period=14"), now), DEFAULT_PERIOD);
assert.deepEqual(parsePeriodParams(new URLSearchParams("from=2026-09-10&to=2026-09-01"), now), DEFAULT_PERIOD);
assert.deepEqual(parsePeriodParams(new URLSearchParams("from=2020-01-01&to=2026-09-01"), now), DEFAULT_PERIOD);
assert.deepEqual(parsePeriodParams(new URLSearchParams("from=2026-09-01&to=2026-12-01&period=7"), now), { kind: "preset", days: 7 });

console.log("dashboard period self-test OK");
