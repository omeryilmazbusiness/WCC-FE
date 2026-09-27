/**
 * Self-test (Epic 21): booking status chip mapping, option-hold countdown / expiry rules,
 * status-change error classification, FX rate validation / formatting, money input parsing
 * and the finance breakdown helper (pure, no I/O).
 * Run: npm run test:booking-finance
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BOOKING_STATUSES,
  LINE_TYPES,
  fromLineType,
  isBookingStatus,
  toLineCategory,
  toLineKind,
  toLineType,
} from "../src/entities/booking/model.ts";
import { BOOKING_STATUS_TONES, SYSTEM_DRIVEN_STATUSES } from "../src/entities/booking/lib/status-tone.ts";
import {
  HOLD_MAX_DAYS,
  defaultHoldExpiry,
  holdCountdown,
  holdExpiryError,
  localToRfc3339,
  maxHoldExpiry,
  toDateTimeLocal,
} from "../src/entities/booking/lib/hold.ts";
import {
  classifyStatusError,
  isStatusReasonValid,
  reasonRequired,
} from "../src/features/change-booking-status/model/transition.ts";
import {
  fxRateError,
  fxSearchParams,
  formatFxRate,
  normalizeFxRate,
} from "../src/entities/fx/model.ts";
import { minorToInput, parseMoneyInput } from "../src/shared/lib/money.ts";
import {
  dualAmountState,
  financeBreakdown,
  isReceivedAtValid,
} from "../src/entities/payment/lib/finance.ts";
import type { FinancialSummary } from "../src/entities/payment/model.ts";

/** Guard codes of wodi-crm-be internal/domain/booking/lifecycle.go. */
const BACKEND_GUARDS = [
  "customer_required",
  "departure_required",
  "sales_closed",
  "no_capacity",
  "hold_expiry_required",
  "hold_expiry_in_past",
  "hold_expiry_too_far",
  "reason_required",
  "override_reason_too_short",
  "readiness_incomplete",
  "balance_outstanding",
  "hold_not_expired",
  "departure_not_reached",
  "status_not_derived",
];

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const messages = (locale: string) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, `src/shared/i18n/messages/${locale}.json`), "utf8"));

function statusChip() {
  assert.equal(BOOKING_STATUSES.length, 9);
  assert.deepEqual(Object.keys(BOOKING_STATUS_TONES).sort(), [...BOOKING_STATUSES].sort());
  const chips = new Set<string>();
  for (const status of BOOKING_STATUSES) {
    const tone = BOOKING_STATUS_TONES[status];
    assert.ok(tone.chip.includes("bg-") && tone.chip.includes("text-"), `${status} has colors`);
    assert.ok(tone.dot.startsWith("bg-"), `${status} has a dot color`);
    chips.add(tone.chip.split(" ")[0]);
  }
  assert.equal(chips.size, BOOKING_STATUSES.length, "every status has a distinct background");

  for (const locale of ["en", "ar"]) {
    const m = messages(locale);
    for (const status of BOOKING_STATUSES) {
      assert.ok(m.bookings.status[status]?.trim(), `[${locale}] bookings.status.${status}`);
      assert.ok(m.bookingStatus.actions[status]?.trim(), `[${locale}] bookingStatus.actions.${status}`);
    }
    for (const type of LINE_TYPES) {
      assert.ok(m.bookings.lineTypes[type], `[${locale}] bookings.lineTypes.${type}`);
    }
    for (const guard of BACKEND_GUARDS) {
      assert.ok(m.bookingStatus.guards[guard], `[${locale}] bookingStatus.guards.${guard}`);
    }
    for (const key of ["expired", "days", "hours", "minutes"]) {
      assert.ok(m.bookings.hold[key], `[${locale}] bookings.hold.${key}`);
    }
  }

  assert.deepEqual([...SYSTEM_DRIVEN_STATUSES], ["partially_paid", "ready", "travelled"]);
  assert.ok(isBookingStatus("option_hold"));
  assert.ok(!isBookingStatus("pending"));
  assert.equal(toLineKind("tax"), "tax");
  assert.equal(toLineKind("fee"), "fee");
  assert.equal(toLineKind("hotel"), "item");
  assert.equal(toLineCategory("hotel", undefined), "hotel");
  assert.equal(toLineCategory("item", "room"), "room");
  assert.equal(toLineCategory("tax", undefined), null);
  for (const type of LINE_TYPES) {
    const { kind, category } = fromLineType(type);
    assert.equal(kind === "item", category !== null, `${type}: category only on item lines`);
    assert.equal(toLineType(kind, category), type);
  }
  assert.equal(toLineKind(undefined), "item");
}

function holdRules() {
  const H = 3600;
  const D = 24 * H;
  assert.deepEqual(holdCountdown(2 * D + 4 * H + 59 * 60), {
    key: "days",
    urgent: false,
    values: { days: 2, hours: 4 },
  });
  assert.deepEqual(holdCountdown(D), { key: "days", urgent: false, values: { days: 1, hours: 0 } });
  assert.deepEqual(holdCountdown(D - 1), {
    key: "hours",
    urgent: true,
    values: { hours: 23, minutes: 59 },
  });
  assert.deepEqual(holdCountdown(5 * 60 + 30), { key: "minutes", urgent: true, values: { minutes: 5 } });
  assert.deepEqual(holdCountdown(20), { key: "minutes", urgent: true, values: { minutes: 1 } });
  assert.equal(holdCountdown(0).key, "expired");
  assert.equal(holdCountdown(-50).key, "expired");

  const now = new Date(2026, 8, 27, 10, 15, 30);
  assert.equal(toDateTimeLocal(now), "2026-09-27T10:15");
  assert.equal(defaultHoldExpiry(now), "2026-09-30T10:15");
  assert.equal(maxHoldExpiry(now), "2026-10-11T10:15");
  assert.equal(holdExpiryError("", now), "required");
  assert.equal(holdExpiryError("2026-09-27T10:00", now), "past");
  assert.equal(holdExpiryError(defaultHoldExpiry(now), now), null);
  assert.equal(holdExpiryError(maxHoldExpiry(now), now), null);
  assert.equal(holdExpiryError("2026-10-11T10:17", now), "tooFar");
  assert.equal(HOLD_MAX_DAYS, 14);
  assert.match(localToRfc3339("2026-09-30T10:15"), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/);
}

function statusErrors() {
  assert.ok(!isStatusReasonValid("too short"));
  assert.ok(isStatusReasonValid("  customer asked  "));
  const plain = { status: "confirmed" as const, requiresReason: false, requiresOverride: false };
  assert.equal(reasonRequired(plain, false), false);
  assert.equal(reasonRequired(plain, true), true);
  assert.equal(reasonRequired({ ...plain, requiresReason: true }, false), true);
  assert.equal(reasonRequired({ ...plain, requiresOverride: true }, false), true);

  assert.deepEqual(
    classifyStatusError({
      status: 422,
      code: "guard_failed",
      details: { guards: ["no_capacity", 3, "balance_due"] },
    }),
    { kind: "guardFailed", guards: ["no_capacity", "balance_due"] },
  );
  assert.deepEqual(classifyStatusError({ status: 422, code: "guard_failed" }), {
    kind: "guardFailed",
    guards: [],
  });
  assert.deepEqual(classifyStatusError({ status: 409, code: "invalid_transition" }), {
    kind: "invalidTransition",
  });
  assert.deepEqual(classifyStatusError({ status: 403, code: "forbidden" }), { kind: "other" });
  assert.deepEqual(classifyStatusError(new Error("boom")), { kind: "other" });
  assert.deepEqual(classifyStatusError(null), { kind: "other" });
}

function fxRates() {
  assert.equal(fxRateError(""), "required");
  assert.equal(fxRateError("   "), "required");
  assert.equal(fxRateError("abc"), "format");
  assert.equal(fxRateError("-3.75"), "format");
  assert.equal(fxRateError("3,75"), "format");
  assert.equal(fxRateError("1e3"), "format");
  assert.equal(fxRateError(".5"), "format");
  assert.equal(fxRateError("3."), "format");
  assert.equal(fxRateError("0"), "positive");
  assert.equal(fxRateError("0.00000000"), "positive");
  assert.equal(fxRateError("3.123456789"), "precision");
  assert.equal(fxRateError("3.12345678"), null);
  assert.equal(fxRateError("0.00000001"), null);
  assert.equal(fxRateError(" 3.75 "), null);

  assert.equal(normalizeFxRate("3.75000000"), "3.75");
  assert.equal(normalizeFxRate("003.50"), "3.5");
  assert.equal(normalizeFxRate("4.00"), "4");
  assert.equal(normalizeFxRate("0.0771"), "0.0771");

  assert.equal(formatFxRate("3.75000000"), "3.75");
  assert.equal(formatFxRate("1"), "1.00");
  assert.equal(formatFxRate("0.10950000"), "0.1095");
  assert.equal(formatFxRate("4.07120000"), "4.0712");
  assert.equal(formatFxRate(""), "—");

  assert.equal(
    fxSearchParams({ base: "usd ", quote: "", from: "2026-09-01" }, { limit: 25, offset: 50 }).toString(),
    "base=USD&from=2026-09-01&limit=25&offset=50",
  );
}

function money() {
  assert.equal(parseMoneyInput("1250"), 125000);
  assert.equal(parseMoneyInput("1250.5"), 125050);
  assert.equal(parseMoneyInput("1250,05"), 125005);
  assert.equal(parseMoneyInput("0.1"), 10);
  assert.equal(parseMoneyInput("19.99"), 1999);
  assert.equal(parseMoneyInput("1.005"), null);
  assert.equal(parseMoneyInput("-5"), null);
  assert.equal(parseMoneyInput(""), null);
  assert.equal(parseMoneyInput("abc"), null);
  assert.equal(minorToInput(125050), "1250.50");
  assert.equal(minorToInput(5), "0.05");
  assert.equal(minorToInput(-1999), "-19.99");
  assert.equal(parseMoneyInput(minorToInput(987654321)), 987654321);
}

function finance() {
  const summary: FinancialSummary = {
    currency: "USD",
    subtotal: 380000,
    discount: 20000,
    tax: 18000,
    fees: 2000,
    total: 380000,
    cost: 280000,
    margin: 100000,
    collected: 100000,
    pending: 50000,
    balance: 280000,
    reporting: null,
    promises: { openCount: 0, openAmount: 0, nextPromisedOn: null },
  };
  const b = financeBreakdown(summary);
  assert.deepEqual(
    b.pricing.map((r) => [r.key, r.amount]),
    [
      ["subtotal", 380000],
      ["discount", -20000],
      ["tax", 18000],
      ["fees", 2000],
      ["total", 380000],
    ],
  );
  assert.equal(b.mismatch, 0);
  assert.deepEqual(b.profitability.map((r) => r.key), ["cost", "margin"]);
  assert.deepEqual(b.collection.map((r) => r.key), ["collected", "pending", "balance"]);
  assert.ok(b.pricing.find((r) => r.key === "total")?.emphasis);

  const hidden = financeBreakdown({ ...summary, cost: null, margin: null, total: 379999 });
  assert.deepEqual(hidden.profitability, []);
  assert.equal(hidden.mismatch, 1);

  assert.equal(dualAmountState({ currency: "SAR", amountReporting: 1000, reportingCurrency: "SAR" }), "single");
  assert.equal(dualAmountState({ currency: "SAR", amountReporting: null, reportingCurrency: "" }), "single");
  assert.equal(dualAmountState({ currency: "USD", amountReporting: 375000, reportingCurrency: "SAR" }), "dual");
  assert.equal(dualAmountState({ currency: "EGP", amountReporting: null, reportingCurrency: "SAR" }), "missing");
  assert.equal(
    dualAmountState({ currency: "EGP", amountReporting: null, reportingCurrency: "", fxMissing: true }),
    "missing",
  );

  assert.ok(isReceivedAtValid("", "2026-09-27"));
  assert.ok(isReceivedAtValid("2026-09-27", "2026-09-27"));
  assert.ok(isReceivedAtValid("2026-01-02", "2026-09-27"));
  assert.ok(!isReceivedAtValid("2026-09-28", "2026-09-27"));
  assert.ok(!isReceivedAtValid("27/09/2026", "2026-09-27"));
}

statusChip();
holdRules();
statusErrors();
fxRates();
money();
finance();
console.log("booking-finance selftest OK");
