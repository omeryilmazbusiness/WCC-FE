/**
 * Self-test: customer profile rules (pure). Passport validity and the six-month rule,
 * profile completeness, age, timeline stats (payments in minor units, open tasks) and
 * the list's quick filters.
 * Run: npm run test:customers
 */

import assert from "node:assert/strict";
import {
  ageOn,
  customerStats,
  matchesQuickFilter,
  missingProfileFields,
  passportStatus,
  paymentAmount,
  profileCompleteness,
  quickFilterCounts,
  type Customer,
  type TimelineItem,
} from "../src/entities/customer/model.ts";

const TODAY = "2026-10-04";

function customer(over: Partial<Customer> = {}): Customer {
  return {
    id: "c1",
    branchId: "b1",
    fullName: "Aisha Khan",
    fullNameAr: "عائشة خان",
    phone: "+966500000001",
    email: "aisha@example.com",
    nationality: "SA",
    passportNo: "••••5678",
    passportLast4: "5678",
    passportExpiresAt: "2030-01-01",
    dateOfBirth: "1990-05-12",
    notes: "",
    isActive: true,
    createdAt: "2026-01-10T10:00:00Z",
    updatedAt: "2026-01-10T10:00:00Z",
    ...over,
  };
}

function passport() {
  assert.equal(passportStatus(customer(), TODAY), "valid");
  assert.equal(passportStatus(customer({ passportExpiresAt: "2026-10-03" }), TODAY), "expired", "yesterday is expired");
  assert.equal(passportStatus(customer({ passportExpiresAt: TODAY }), TODAY), "expiring", "expires today: still usable, but warn");
  assert.equal(passportStatus(customer({ passportExpiresAt: "2027-04-03" }), TODAY), "expiring", "under six months");
  assert.equal(passportStatus(customer({ passportExpiresAt: "2027-04-04" }), TODAY), "valid", "exactly six months");
  assert.equal(passportStatus(customer({ passportExpiresAt: null }), TODAY), "valid", "number on file, no expiry known");
  assert.equal(passportStatus(customer({ passportExpiresAt: null, passportLast4: "" }), TODAY), "missing");
  assert.equal(passportStatus(customer({ passportExpiresAt: "2027-04-01T00:00:00Z" }), TODAY), "expiring", "timestamps are cut to the day");
  assert.equal(passportStatus(customer({ passportExpiresAt: "2027-02-28" }), "2026-08-31"), "valid", "six months from Aug 31 is Feb 28");
  assert.equal(passportStatus(customer({ passportExpiresAt: "2027-02-27" }), "2026-08-31"), "expiring");
}

function completeness() {
  assert.equal(profileCompleteness(customer()), 100);
  assert.deepEqual(missingProfileFields(customer()), []);
  const sparse = customer({ email: "", nationality: " ", passportLast4: "", passportExpiresAt: null, dateOfBirth: null, fullNameAr: "" });
  assert.deepEqual(missingProfileFields(sparse), ["email", "nationality", "passport", "passportExpiry", "dateOfBirth", "nameAr"]);
  assert.equal(profileCompleteness(sparse), 14, "only the phone of seven facts");
}

function age() {
  assert.equal(ageOn("1990-05-12", TODAY), 36);
  assert.equal(ageOn("1990-10-04", TODAY), 36, "birthday today");
  assert.equal(ageOn("1990-10-05", TODAY), 35, "birthday tomorrow");
  assert.equal(ageOn(null, TODAY), null);
  assert.equal(ageOn("2030-01-01", TODAY), null, "future dates are not an age");
}

function item(over: Partial<TimelineItem>): TimelineItem {
  return { kind: "lead", id: "x", title: "", occurred_at: "2026-09-01T10:00:00Z", ...over };
}

function stats() {
  assert.equal(paymentAmount(item({ kind: "payment", title: "Payment 12500", meta: { amount: 12500 } })), 12500);
  assert.equal(paymentAmount(item({ kind: "payment", title: "Payment 9900" })), 9900, "older timelines: amount from the title");
  assert.equal(paymentAmount(item({ kind: "payment", title: "Payment" })), null);

  const s = customerStats([
    item({ kind: "lead", occurred_at: "2026-08-01T00:00:00Z" }),
    item({ kind: "booking", id: "b1" }),
    item({ kind: "booking", id: "b2" }),
    item({ kind: "payment", meta: { amount: 10000, currency: "USD" } }),
    item({ kind: "payment", meta: { amount: "2500", currency: "USD" } }),
    item({ kind: "payment", meta: { amount: 300000, currency: "SAR" } }),
    item({ kind: "document" }),
    item({ kind: "task", status: "open" }),
    item({ kind: "task", status: "in_progress" }),
    item({ kind: "task", status: "done", occurred_at: "2026-09-20T08:00:00Z" }),
  ]);
  assert.equal(s.leads, 1);
  assert.equal(s.bookings, 2);
  assert.equal(s.payments, 3);
  assert.equal(s.documents, 1);
  assert.equal(s.openTasks, 2, "done tasks are not open");
  assert.deepEqual(s.paid, { USD: 12500, SAR: 300000 }, "paid per currency, minor units");
  assert.equal(s.lastActivityAt, "2026-09-20T08:00:00Z");
  assert.equal(customerStats([]).lastActivityAt, null);
}

function quickFilters() {
  const rows = [
    customer({ id: "ok" }),
    customer({ id: "exp", passportExpiresAt: "2026-11-01" }),
    customer({ id: "nopass", passportLast4: "", passportExpiresAt: null, email: "" }),
    customer({ id: "new", createdAt: "2026-10-01T09:00:00Z" }),
    customer({ id: "merged", isActive: false, passportExpiresAt: "2020-01-01" }),
  ];
  assert.deepEqual(quickFilterCounts(rows, TODAY), { all: 4, passport: 2, incomplete: 1, recent: 1 }, "merged customers are not counted");
  assert.ok(matchesQuickFilter(rows[1], "passport", TODAY));
  assert.ok(!matchesQuickFilter(rows[0], "passport", TODAY));
  assert.ok(matchesQuickFilter(rows[2], "incomplete", TODAY));
  assert.ok(matchesQuickFilter(rows[3], "recent", TODAY));
  assert.ok(matchesQuickFilter(rows[0], "all", TODAY));
}

passport();
completeness();
age();
stats();
quickFilters();
console.log("customer profile selftest OK");
