/**
 * Self-test for the finance hub: money rules that mirror the server (bps rounding, agency
 * risk grades, refund offsetting, currency shares, booking reference
 * extraction), bank / BSP CSV parsing, API mapping and request shapes, and the demo twin.
 * Run: npm run test:finance
 */
import assert from "node:assert/strict";
import type { HttpClient, HttpRequestInit } from "../src/shared/api/http-client.ts";
import {
  ApiFinanceRepository,
  MemoryFinanceRepository,
  applyBps,
  bucketOf,
  extractRefs,
  fingerprint,
  parseBankCsv,
  parseBspCsv,
  parseDay,
  parseSignedAmount,
  percentToBps,
  ratioBps,
  refCode,
  riskOf,
  settleRefund,
  shares,
} from "./shims/finance-entity.ts";

let failed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${name}\n     ${(e as Error).message}`);
  }
}

await test("bps rounding is half away from zero (server parity)", () => {
  assert.equal(applyBps(10_000, 175), 175);
  assert.equal(applyBps(1_99, 250), 5);
  assert.equal(applyBps(-1_99, 250), -5);
  assert.equal(applyBps(3, 5000), 2);
  assert.equal(ratioBps(1, 3), 3333);
  assert.equal(ratioBps(2, 3), 6667);
  assert.equal(ratioBps(-2, 3), -6667);
  assert.equal(ratioBps(5, 0), 0);
  assert.equal(percentToBps("12,5"), 1250);
  assert.equal(percentToBps("2.49"), 249);
  assert.equal(percentToBps("abc"), null);
});

await test("agency risk grades match the server thresholds", () => {
  const a = { creditLimit: 100_000, graceDays: 7, status: "active" as const };
  const e = (outstanding: number, overdue = 0, days = 0) => ({ outstanding, overdue, oldestOverdueDays: days, openBookings: 1, unconvertedBalance: false });
  assert.equal(riskOf(a, e(10_000)).level, "ok");
  assert.equal(riskOf(a, e(70_000)).level, "watch");
  assert.equal(riskOf(a, e(10_000, 500, 3)).level, "watch");
  assert.equal(riskOf(a, e(10_000, 500, 8)).level, "critical");
  assert.equal(riskOf(a, e(95_000)).level, "critical");
  assert.equal(riskOf({ ...a, status: "suspended" }, e(0)).level, "blocked");
  assert.deepEqual(riskOf(a, e(120_000)), { available: -20_000, usedPct: 120, level: "critical" });
  assert.equal(riskOf({ ...a, creditLimit: 0 }, e(5_000)).usedPct, 0);
});

await test("ageing buckets", () => {
  assert.equal(bucketOf(null, "2026-10-05"), "unscheduled");
  assert.equal(bucketOf("2026-10-05", "2026-10-05"), "current");
  assert.equal(bucketOf("2026-09-20", "2026-10-05"), "d0_15");
  assert.equal(bucketOf("2026-09-19", "2026-10-05"), "d16_30");
  assert.equal(bucketOf("2026-09-04", "2026-10-05"), "d31_plus");
});

await test("refund offsetting: penalty and fee come out of what the customer paid", () => {
  const s = settleRefund({ paid: 10_000, supplierCost: 8_000, supplierPenalty: 2_000, serviceFee: 500 });
  assert.deepEqual(s, { customerRefund: 7_500, supplierRefund: 6_000, retained: 2_500, shortfall: 0, agencyResult: 500 });
  const short = settleRefund({ paid: 1_000, supplierCost: 8_000, supplierPenalty: 2_000, serviceFee: 500 });
  assert.equal(short.customerRefund, 0);
  assert.equal(short.shortfall, 1_500);
});

await test("currency shares always sum to 100 %", () => {
  const out = shares([
    { currency: "SAR", amount: 1, converted: 1, unconverted: false },
    { currency: "USD", amount: 1, converted: 1, unconverted: false },
    { currency: "TRY", amount: 1, converted: 1, unconverted: false },
    { currency: "XXX", amount: 9, converted: 0, unconverted: true },
  ]);
  assert.equal(out.reduce((s, x) => s + x.shareBps, 0), 10_000);
  assert.equal(out.find((x) => x.currency === "XXX")?.shareBps, 0);
});

await test("booking references in transfer descriptions (server parity)", () => {
  assert.deepEqual(extractRefs("EFT BK-000123 umre"), { refNos: [123], pnrs: [] });
  assert.deepEqual(extractRefs("WCC-1042 PNR x7k2lp ve #77"), { refNos: [1042, 77], pnrs: ["X7K2LP"] });
  assert.deepEqual(extractRefs("REZ 15 rez:15").refNos, [15]);
  assert.deepEqual(extractRefs("ABCDEF 123456").pnrs, []);
  assert.equal(refCode(123), "BK-000123");
  assert.equal(refCode(0), "");
});

await test("amount and date parsing for bank exports", () => {
  assert.equal(parseSignedAmount("1.250,50"), 1_250_50);
  assert.equal(parseSignedAmount("1,250.50"), 1_250_50);
  assert.equal(parseSignedAmount("-300"), -300_00);
  assert.equal(parseSignedAmount("(42,5)"), -42_50);
  assert.equal(parseSignedAmount("SAR 12 500"), 12_500_00);
  assert.equal(parseSignedAmount("abc"), null);
  assert.equal(parseDay("05.10.2026"), "2026-10-05");
  assert.equal(parseDay("2026-10-05T10:00:00Z"), "2026-10-05");
  assert.equal(parseDay("31.02.2026"), null);
});

await test("bank CSV: signed amount or debit/credit columns, stable ids", () => {
  const a = parseBankCsv("Tarih;Açıklama;Tutar;Referans\n05.10.2026;EFT BK-000123;1.250,50;TRX-1\n05.10.2026;Komisyon;-12,00;\nbad;x;1;");
  assert.equal(a.rows.length, 2);
  assert.deepEqual(a.rows[0], { externalId: "TRX-1", occurredOn: "2026-10-05", amount: 1_250_50, direction: "in", description: "EFT BK-000123", counterparty: "" });
  assert.equal(a.rows[1].direction, "out");
  assert.match(a.rows[1].externalId, /^row-[0-9a-f]{8}$/);
  assert.deepEqual(a.errors, [{ line: 4, reason: "date" }]);
  const again = parseBankCsv("Tarih;Açıklama;Tutar;Referans\n05.10.2026;EFT BK-000123;1.250,50;TRX-1\n05.10.2026;Komisyon;-12,00;");
  assert.equal(again.rows[1].externalId, a.rows[1].externalId, "re-import keeps the same id");
  const dc = parseBankCsv("date,description,credit,debit\n2026-10-05,in,100.00,\n2026-10-05,out,,40.00");
  assert.deepEqual(dc.rows.map((r) => [r.direction, r.amount]), [["in", 100_00], ["out", 40_00]]);
  assert.deepEqual(parseBankCsv("foo,bar\n1,2").errors, [{ line: 1, reason: "columns" }]);
  assert.equal(fingerprint("x"), fingerprint("x"));
});

await test("BSP CSV: types, sign handling and validation", () => {
  const r = parseBspCsv("ticket,pnr,type,passenger,date,amount\n0651234567890,qa7x9z,TKTT,DOE/J,05.10.2026,\"1.010,00\"\n0651234567891,ZZ1Y2X,RFND,,,-500\n065,AB,weird,,,10");
  assert.equal(r.rows.length, 2);
  assert.deepEqual(r.rows[0], { documentNo: "0651234567890", pnr: "QA7X9Z", type: "sale", passenger: "DOE/J", issuedOn: "2026-10-05", amount: 1_010_00 });
  assert.equal(r.rows[1].type, "refund");
  assert.equal(r.rows[1].amount, 500_00, "amounts are sent unsigned; the type carries the sign");
  assert.deepEqual(r.errors, [{ line: 4, reason: "type" }]);
});

await test("API repository maps responses and sends the server's shapes", async () => {
  const calls: { path: string; method: string; body: unknown }[] = [];
  const replies: Record<string, unknown> = {};
  const client: HttpClient = {
    async request<T>(path: string, init?: HttpRequestInit) {
      const method = init?.method ?? "GET";
      calls.push({ path, method, body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined });
      return (replies[`${method} ${path.split("?")[0]}`] ?? {}) as T;
    },
    async raw() {
      throw new Error("unused");
    },
  };
  const repo = new ApiFinanceRepository(client);

  replies["GET /finance/overview"] = {
    reporting_currency: "SAR",
    cash: { items: [{ currency: "USD", amount: 100, count: 1 }], total: 375, partial: true },
    month: { month: "2026-10", revenue: 1000, margin: 150 },
    exposure: [{ currency: "USD", amount: 100, converted: 375, share_bps: 10000 }],
    alerts: { unmatched_credits: 2 },
  };
  const o = await repo.overview();
  assert.equal(o.cash.partial, true);
  assert.equal(o.exposure[0].shareBps, 10_000);
  assert.equal(o.alerts.unmatchedCredits, 2);
  assert.equal(o.alerts.lowDeposits, 0);

  await repo.createAccount({ kind: "bank", name: " Main ", currency: "SAR", bankName: "", iban: "sa03 8000 0000 6080 1016 7519", commissionBps: 0, lowBalanceThreshold: 0, openingBalance: 500 });
  assert.deepEqual(calls.at(-1), {
    path: "/finance/treasury/accounts",
    method: "POST",
    body: { kind: "bank", name: "Main", currency: "SAR", bank_name: "", iban: "SA0380000000608010167519", commission_bps: 0, low_balance_threshold: 0, is_active: true, opening_balance: 500 },
  });

  replies["POST /finance/treasury/accounts/a1/feed"] = { imported: 2, duplicates: 1, auto_matched: 1, unmatched: 1 };
  const feed = await repo.importFeed("a1", [{ externalId: "x", occurredOn: "2026-10-05", amount: 100, direction: "in", description: "d", counterparty: "c" }]);
  assert.deepEqual(feed, { imported: 2, duplicates: 1, autoMatched: 1, unmatched: 1 });
  assert.deepEqual((calls.at(-1)?.body as { rows: unknown[] }).rows[0], { external_id: "x", occurred_on: "2026-10-05", amount: 100, direction: "in", description: "d", counterparty: "c" });

  await repo.movements({ accountId: "a1", unmatched: true });
  assert.equal(calls.at(-1)?.path, "/finance/treasury/movements?account_id=a1&unmatched=true");

  await repo.assignBooking("ag1", "b1");
  assert.deepEqual(calls.at(-1), { path: "/finance/agencies/ag1/bookings/b1", method: "PUT", body: undefined });
  await repo.unassignBooking("b1");
  assert.deepEqual(calls.at(-1), { path: "/finance/agency-bookings/b1", method: "DELETE", body: undefined });

  replies["POST /finance/letters"] = { id: "l1", party_type: "supplier", status: "sent", token: "tok" };
  const letter = await repo.createLetter({ partyType: "supplier", partyId: "s1", email: "" });
  assert.equal(letter.token, "tok");
  assert.equal(letter.partyType, "supplier");

  await repo.quoteRefund({ bookingId: "b1", supplierPenalty: 10, serviceFee: 5 });
  assert.deepEqual(calls.at(-1)?.body, { booking_id: "b1", currency: "", paid: null, supplier_cost: null, supplier_penalty: 10, service_fee: 5 });

  await repo.profitability({ from: "2026-10-01", to: "2026-10-31" });
  assert.equal(calls.at(-1)?.path, "/finance/profitability?from=2026-10-01&to=2026-10-31");
});

await test("demo twin serves consistent reads and refuses writes", async () => {
  const repo = new MemoryFinanceRepository();
  const o = await repo.overview();
  assert.equal(o.exposure.reduce((s, x) => s + x.shareBps, 0), 10_000);
  assert.equal(o.trend.length, 6);
  const rc = await repo.receivables();
  const total = rc.ageing.reduce((s, a) => s + a.total, 0);
  assert.equal(total, rc.debtors.reduce((s, d) => s + d.balance, 0));
  assert.equal(rc.agencies.find((a) => a.code === "HIJ")?.risk.level, "blocked");
  const unmatched = await repo.movements({ unmatched: true });
  assert.ok(unmatched.every((m) => m.matchStatus === "unmatched"));
  assert.throws(() => repo.createAccount({} as never), /server/);
});

if (failed) {
  console.error(`\n${failed} finance self-test(s) failed`);
  process.exit(1);
}
console.log("\nfinance self-tests passed");
