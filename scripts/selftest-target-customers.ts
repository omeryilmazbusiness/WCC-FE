/**
 * Self-test: optional customer-volume goal on revenue targets (pure).
 * Parsing mirrors the backend; create-draft composition is checked via the
 * same helpers the dialog uses (imported without path aliases).
 * Run: npm run test:target-customers
 */

import assert from "node:assert/strict";
import {
  MAX_TARGET_CUSTOMERS,
  parseCustomers,
  parseMajorAmount,
} from "../src/entities/revenuetarget/lib/customers.ts";
import { isCalendarPeriod, resolvePeriod } from "../src/entities/revenuetarget/lib/period.ts";

assert.equal(parseCustomers(""), null);
assert.equal(parseCustomers("  "), null);
assert.equal(parseCustomers("250"), 250);
assert.equal(parseCustomers("1,200"), 1200);
assert.equal(parseCustomers("0"), "invalid");
assert.equal(parseCustomers("-3"), "invalid");
assert.equal(parseCustomers("12.5"), "invalid");
assert.equal(parseCustomers(String(MAX_TARGET_CUSTOMERS + 1)), "invalid");
assert.equal(parseCustomers(String(MAX_TARGET_CUSTOMERS)), MAX_TARGET_CUSTOMERS);

assert.equal(parseMajorAmount("250,000"), 25_000_000);
assert.equal(parseMajorAmount("0"), null);

// Composition rules used by validateDraft (money required, customers optional).
function createPayload(amount: string, customers: string, label = "October 2026") {
  const period = resolvePeriod("monthly", "2026-10-15", isCalendarPeriod("monthly") ? undefined : "2026-10-31");
  assert.ok(period.ok);
  const minor = parseMajorAmount(amount);
  const cust = parseCustomers(customers);
  if (!amount.trim() || minor === null || cust === "invalid" || !label.trim()) return null;
  return {
    label,
    targetAmount: minor,
    ...(cust != null ? { targetCustomers: cust } : {}),
    periodKind: "monthly" as const,
    periodStart: period.range.start,
    periodEnd: period.range.end,
  };
}

assert.equal(createPayload("100000", "")?.targetCustomers, undefined, "empty = money-only");
assert.equal(createPayload("100000", "180")?.targetCustomers, 180);
assert.equal(createPayload("100000", "0"), null, "zero customers rejected");
assert.equal(createPayload("", "50"), null, "amount stays required");

console.log("target customers self-test: ok");
