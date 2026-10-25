/**
 * Self-test: package Reserved tab lists customers who hold a seat and paid in full.
 * Run: npm run test:package-reserved
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { consumesSeat, isFullyPaid, isPaidReserved } from "../src/entities/booking/lib/lifecycle.ts";
import { orderReserved, reservedBookings, summarizeReserved } from "../src/widgets/packages-board/model/reserved.ts";

const root = join(import.meta.dirname, "..");
const src = (rel: string) => readFileSync(join(root, rel), "utf8");

function lifecycle() {
  assert.equal(consumesSeat("draft"), false);
  assert.equal(consumesSeat("quoted"), false);
  assert.equal(consumesSeat("cancelled"), false);
  assert.equal(consumesSeat("option_hold"), true);
  assert.equal(consumesSeat("confirmed"), true);
  assert.equal(consumesSeat("partially_paid"), true);
  assert.equal(consumesSeat("ready"), true);
  assert.equal(consumesSeat("travelled"), true);
  assert.equal(consumesSeat("completed"), true);
  assert.equal(isFullyPaid("paid"), true);
  assert.equal(isFullyPaid("deposit"), false);
  assert.ok(isPaidReserved({ status: "ready", paymentStatus: "paid" }));
  assert.ok(!isPaidReserved({ status: "option_hold", paymentStatus: "awaiting" }), "a hold without payment is not reserved-paid");
  assert.ok(!isPaidReserved({ status: "draft", paymentStatus: "paid" }), "paid draft does not occupy a seat");
  assert.ok(!isPaidReserved({ status: "confirmed", paymentStatus: "deposit" }), "a deposit is not fully paid");
}

function list() {
  const rows = [
    { id: "hold", customerId: "c1", status: "option_hold" as const, paymentStatus: "awaiting" as const, paxCount: 2, updatedAt: "2026-10-02", info: { departDate: "2026-11-01" } },
    { id: "paid", customerId: "c2", status: "ready" as const, paymentStatus: "paid" as const, paxCount: 3, updatedAt: "2026-10-03", info: { departDate: "2026-12-01" } },
    { id: "deposit", customerId: "c3", status: "partially_paid" as const, paymentStatus: "deposit" as const, paxCount: 4, updatedAt: "2026-10-04", info: { departDate: "2026-11-15" } },
    { id: "later", customerId: "c2", status: "completed" as const, paymentStatus: "paid" as const, paxCount: 1, updatedAt: "2026-10-05", info: { departDate: "2026-10-20" } },
    { id: "cancel", customerId: "c4", status: "cancelled" as const, paymentStatus: "paid" as const, paxCount: 8, updatedAt: "2026-10-06", info: { departDate: "2026-09-01" } },
  ];
  const reserved = reservedBookings(rows);
  assert.deepEqual(reserved.map((r) => r.id), ["paid", "later"]);
  assert.deepEqual(summarizeReserved(rows), { reservations: 2, customers: 1, pax: 4 }, "two paid bookings, one customer, 3+1 pax");
  assert.deepEqual(orderReserved(reserved).map((r) => r.id), ["paid", "later"], "later departure first");
  assert.deepEqual(summarizeReserved([]), { reservations: 0, customers: 0, pax: 0 });
}

function wiring() {
  const tabs = src("src/widgets/packages-board/model/use-package-tab.ts");
  assert.match(tabs, /"reserved"/);
  const board = src("src/widgets/packages-board/ui/package-detail-board.tsx");
  assert.match(board, /PackageReservedTab/);
  assert.match(board, /onOpenReserved=\{\(\) => selectTab\("reserved"\)\}/);
  assert.match(board, /package-tab-\$\{key\}/);
  const hero = src("src/widgets/packages-board/ui/package-hero.tsx");
  assert.match(hero, /onOpenReserved/);
  assert.match(hero, /package-stat-reserved/);
  const tab = src("src/widgets/packages-board/ui/package-reserved-tab.tsx");
  assert.match(tab, /package-reserved/);
  assert.match(tab, /routes\.customer/);
  assert.match(tab, /routes\.booking/);
  assert.doesNotMatch(tab, /window\.location/);
}

const groups = { lifecycle, list, wiring };
for (const [name, run] of Object.entries(groups)) {
  try {
    run();
  } catch (err) {
    console.error(`✗ ${name}`);
    throw err;
  }
}
console.log(`package-reserved selftest OK — ${Object.keys(groups).length} groups`);
