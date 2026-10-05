/**
 * Self-test for supplier rules: funds ledger (mirrors `Finance.Apply`), search availability
 * and the automatic "closed to search" block, smart-routing score (mirrors `routeScore`),
 * the form draft, the API mapping/payloads and the offline repository.
 * Run: npm run test:suppliers
 */
import assert from "node:assert/strict";
import {
  ApiSupplierRepository,
  MemorySupplierRepository,
  applyEntry,
  available,
  availabilityOn,
  bpsToPercent,
  categoriesFor,
  classifyProbe,
  contractDaysLeft,
  dueDateFor,
  entryKindsFor,
  fundingPct,
  grossFromNet,
  isExhausted,
  isLowBalance,
  lookToBookRatio,
  mapDetail,
  parsePercent,
  rankSuppliers,
  routeScore,
  supplierPayload,
  usedPct,
  INVOICE_TRANSITIONS,
  type Finance,
  type Supplier,
} from "./shims/supplier-entity.ts";
import {
  balanceLocked,
  credentialPatch,
  draftErrors,
  draftFromSupplier,
  draftToInput,
  isHttpsUrl,
  newDraft,
  normalizeCode,
} from "../src/features/supplier-form/model/draft.ts";
import type { HttpClient, HttpRequestInit } from "../src/shared/api/http-client.ts";

const TODAY = "2026-10-05";

const prepaid = (over: Partial<Finance> = {}): Finance => ({
  paymentModel: "prepaid",
  currency: "SAR",
  depositBalance: 10_000_00,
  creditLimit: 0,
  creditUsed: 0,
  lowBalanceThreshold: 2_000_00,
  paymentTerms: "weekly",
  ...over,
});
const postpaid = (over: Partial<Finance> = {}): Finance => ({
  ...prepaid(),
  paymentModel: "postpaid",
  depositBalance: 0,
  creditLimit: 50_000_00,
  creditUsed: 0,
  lowBalanceThreshold: 5_000_00,
  paymentTerms: "net30",
  ...over,
});

const supplier = (over: Partial<Supplier> = {}): Supplier => ({
  id: "s1",
  branchId: "b1",
  code: "SUP-A",
  nameEn: "Alpha",
  nameAr: "",
  category: "gds",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  emergencyPhone: "",
  terms: "",
  integration: { type: "api", environment: "production", apiBaseUrl: "https://api.example.com", webhookUrl: "" },
  health: { status: "active", latencyMs: 300, checkedAt: null, note: "" },
  finance: prepaid(),
  markups: { flight: 300 },
  regions: ["global"],
  freeCancelHours: 24,
  contractStart: null,
  contractEnd: null,
  isActive: true,
  availability: { bookable: true, reason: "", warnings: [] },
  contractDaysLeft: null,
  createdAt: "",
  updatedAt: "",
  ...over,
});

let passed = 0;
function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
    })
    .catch((e) => {
      console.error(`✗ ${name}`);
      throw e;
    });
}

await test("prepaid ledger: top-up, charge, overdraft and adjustments", () => {
  const fi = prepaid();
  const top = applyEntry(fi, "topup", 5_000_00);
  assert.ok(top.ok && top.balanceAfter === 15_000_00);
  const charge = applyEntry(fi, "charge", 10_000_00);
  assert.ok(charge.ok && charge.balanceAfter === 0 && isExhausted(charge.finance));
  assert.deepEqual(applyEntry(fi, "charge", 10_000_01), { ok: false, error: "funds" });
  assert.deepEqual(applyEntry(fi, "payment", 100), { ok: false, error: "model" });
  assert.deepEqual(applyEntry(fi, "topup", 0), { ok: false, error: "amount" });
  assert.deepEqual(applyEntry(fi, "topup", -5), { ok: false, error: "amount" });
  assert.deepEqual(applyEntry(fi, "topup", 1.5), { ok: false, error: "amount" });
  const down = applyEntry(fi, "adjustment", -1_000_00);
  assert.ok(down.ok && down.balanceAfter === 9_000_00);
  assert.deepEqual(applyEntry(fi, "adjustment", -10_000_01), { ok: false, error: "negative" });
  const refund = applyEntry(fi, "refund", 50_00);
  assert.ok(refund.ok && refund.balanceAfter === 10_050_00);
  assert.equal(fi.depositBalance, 10_000_00, "applyEntry must not mutate its input");
});

await test("postpaid ledger: credit limit, payments and outstanding", () => {
  const fi = postpaid({ creditUsed: 45_000_00 });
  assert.deepEqual(applyEntry(fi, "charge", 5_000_01), { ok: false, error: "limit" });
  const charge = applyEntry(fi, "charge", 5_000_00);
  assert.ok(charge.ok && charge.balanceAfter === 50_000_00 && isExhausted(charge.finance));
  assert.deepEqual(applyEntry(fi, "payment", 45_000_01), { ok: false, error: "outstanding" });
  const pay = applyEntry(fi, "payment", 45_000_00);
  assert.ok(pay.ok && pay.balanceAfter === 0);
  assert.deepEqual(applyEntry(fi, "topup", 1), { ok: false, error: "model" });
  const unlimited = applyEntry(postpaid({ creditLimit: 0, creditUsed: 0 }), "charge", 999_999_00);
  assert.ok(unlimited.ok, "no limit means any charge passes");
  assert.equal(usedPct(fi), 90);
});

await test("card: no balance, only charges and refunds", () => {
  const fi = prepaid({ paymentModel: "card", depositBalance: 0, lowBalanceThreshold: 0 });
  assert.deepEqual(entryKindsFor("card"), ["charge", "refund"]);
  assert.deepEqual(applyEntry(fi, "adjustment", 100), { ok: false, error: "model" });
  assert.ok(applyEntry(fi, "charge", 100).ok);
  assert.deepEqual(available(fi), { amount: 0, limited: false });
  assert.equal(isExhausted(fi), false);
  assert.equal(fundingPct(fi), 100);
});

await test("entry kinds per model", () => {
  assert.deepEqual(entryKindsFor("prepaid"), ["topup", "charge", "refund", "adjustment"]);
  assert.deepEqual(entryKindsFor("postpaid"), ["charge", "payment", "refund", "adjustment"]);
});

await test("low balance and funding gauge", () => {
  assert.equal(isLowBalance(prepaid({ depositBalance: 1_999_99 })), true);
  assert.equal(isLowBalance(prepaid({ depositBalance: 2_000_00 })), false);
  assert.equal(isLowBalance(prepaid({ lowBalanceThreshold: 0, depositBalance: 1 })), false);
  assert.equal(isLowBalance(postpaid({ creditUsed: 46_000_00 })), true);
  assert.equal(fundingPct(prepaid({ depositBalance: 4_000_00 })), 50);
  assert.equal(fundingPct(prepaid({ depositBalance: 99_000_00 })), 100);
  assert.equal(fundingPct(prepaid({ depositBalance: 0 })), 0);
  assert.equal(fundingPct(postpaid({ creditUsed: 10_000_00 })), 80);
});

await test("availability: closed to search reasons in server order", () => {
  const on = (over: Partial<Supplier>) => availabilityOn(supplier(over), TODAY);
  assert.deepEqual(on({}), { bookable: true, reason: "", warnings: [] });
  assert.equal(on({ isActive: false, contractEnd: "2026-01-01" }).reason, "inactive");
  assert.equal(on({ contractEnd: "2026-10-04" }).reason, "contract_expired");
  assert.equal(on({ contractEnd: TODAY }).bookable, true, "the end day itself is still valid");
  assert.equal(on({ health: { status: "down", latencyMs: 0, checkedAt: null, note: "" } }).reason, "down");
  assert.equal(on({ finance: prepaid({ depositBalance: 0 }) }).reason, "deposit_exhausted");
  assert.equal(on({ finance: postpaid({ creditUsed: 50_000_00 }) }).reason, "credit_exhausted");
  const warn = on({ finance: prepaid({ depositBalance: 1_00 }), contractEnd: "2026-10-20", health: { status: "degraded", latencyMs: 1800, checkedAt: null, note: "" } });
  assert.deepEqual(warn, { bookable: true, reason: "", warnings: ["low_balance", "contract_expiring", "degraded"] });
  assert.deepEqual(on({ finance: prepaid({ depositBalance: 0 }) }).warnings, [], "exhausted is a block, not a low-balance warning");
});

await test("contract days and probe classification", () => {
  assert.equal(contractDaysLeft(null, TODAY), null);
  assert.equal(contractDaysLeft("2026-11-04", TODAY), 30);
  assert.equal(contractDaysLeft("2026-10-01", TODAY), -4);
  assert.equal(contractDaysLeft("2027-03-28", "2027-03-27"), 1, "DST change must not shift the day count");
  assert.equal(classifyProbe(200, 200, false), "active");
  assert.equal(classifyProbe(200, 404, false), "active", "4xx still means the host answered");
  assert.equal(classifyProbe(1600, 200, false), "degraded");
  assert.equal(classifyProbe(100, 503, false), "down");
  assert.equal(classifyProbe(0, 0, true), "down");
});

await test("routing score mirrors the server", () => {
  assert.equal(routeScore(supplier(), TODAY), 40 + 30 + 20 + 10, "healthy, funded, fast, long contract");
  assert.equal(routeScore(supplier({ finance: prepaid({ depositBalance: 4_000_00 }) }), TODAY), 40 + 15 + 20 + 10);
  assert.equal(routeScore(supplier({ finance: prepaid({ lowBalanceThreshold: 0 }) }), TODAY), 40 + 20 + 20 + 10);
  assert.equal(routeScore(supplier({ finance: prepaid({ depositBalance: 0 }) }), TODAY), 40 + 0 + 20 + 10);
  assert.equal(routeScore(supplier({ finance: postpaid({ creditLimit: 0 }) }), TODAY), 100);
  assert.equal(routeScore(supplier({ health: { status: "unknown", latencyMs: 0, checkedAt: null, note: "" } }), TODAY), 20 + 30 + 0 + 10);
  assert.equal(
    routeScore(supplier({ integration: { type: "manual", environment: "sandbox", apiBaseUrl: "", webhookUrl: "" }, health: { status: "unknown", latencyMs: 0, checkedAt: null, note: "" } }), TODAY),
    20 + 30 + 10 + 10,
  );
  assert.equal(routeScore(supplier({ health: { status: "degraded", latencyMs: 900, checkedAt: null, note: "" } }), TODAY), 10 + 30 + 12 + 10);
  assert.equal(routeScore(supplier({ health: { status: "degraded", latencyMs: 1400, checkedAt: null, note: "" } }), TODAY), 10 + 30 + 6 + 10);
  assert.equal(routeScore(supplier({ health: { status: "degraded", latencyMs: 2000, checkedAt: null, note: "" } }), TODAY), 10 + 30 + 0 + 10);
  assert.equal(routeScore(supplier({ contractEnd: "2026-10-20" }), TODAY), 40 + 30 + 20 + 4);
  assert.equal(routeScore(supplier({ contractEnd: "2026-10-01" }), TODAY), 40 + 30 + 20 + 0);
});

await test("ranking: bookable first, then score, then code; category filter", () => {
  const list = [
    supplier({ id: "a", code: "SUP-B" }),
    supplier({ id: "b", code: "SUP-A" }),
    supplier({ id: "c", code: "SUP-C", finance: prepaid({ depositBalance: 0 }) }),
    supplier({ id: "d", code: "SUP-D", health: { status: "degraded", latencyMs: 900, checkedAt: null, note: "" } }),
    supplier({ id: "e", code: "SUP-E", category: "wholesaler" }),
  ];
  const ranked = rankSuppliers(list, "flight", TODAY);
  assert.deepEqual(ranked.map((r) => r.supplier.code), ["SUP-A", "SUP-B", "SUP-D", "SUP-C"]);
  assert.equal(ranked.at(-1)?.availability.reason, "deposit_exhausted");
  assert.equal(ranked[0].markupBps, 300);
  assert.deepEqual(categoriesFor("hotel"), ["wholesaler", "dmc"]);
  assert.deepEqual(rankSuppliers(list, "hotel", TODAY).map((r) => r.supplier.code), ["SUP-E"]);
});

await test("percent / basis points / gross and look-to-book", () => {
  assert.equal(parsePercent("3"), 300);
  assert.equal(parsePercent("2.5"), 250);
  assert.equal(parsePercent("2,75"), 275);
  assert.equal(parsePercent("12.345"), null);
  assert.equal(parsePercent("-1"), null);
  assert.equal(bpsToPercent(250), "2.5");
  assert.equal(bpsToPercent(275), "2.75");
  assert.equal(bpsToPercent(1000), "10");
  assert.equal(grossFromNet(100_00, 300), 103_00);
  assert.equal(grossFromNet(333, 150), 338, "rounds half up in minor units");
  assert.equal(lookToBookRatio(400, 3), "133:1");
  assert.equal(lookToBookRatio(10, 0), null);
  assert.equal(lookToBookRatio(1, 5), "1:1");
});

await test("invoice due date follows payment terms", () => {
  assert.equal(dueDateFor("2026-10-01", "net15"), "2026-10-16");
  assert.equal(dueDateFor("2026-10-20", "net30"), "2026-11-19", "rolls over the month end");
  assert.equal(dueDateFor("2026-12-28", "weekly"), "2027-01-04", "rolls over the year end");
  assert.equal(dueDateFor("2026-10-01", "on_booking"), "2026-10-01");
  assert.equal(dueDateFor("", "net7"), "");
  assert.equal(dueDateFor("2026-1-1", "net7"), "");
});

await test("form draft: validation, credential patch and payload", () => {
  const d = newDraft();
  assert.deepEqual(Object.keys(draftErrors(d)).sort(), ["code", "nameEn"]);
  d.code = normalizeCode("sup duffel_01!");
  assert.equal(d.code, "SUP-DUFFEL01");
  d.nameEn = "Duffel";
  d.apiBaseUrl = "http://api.duffel.com";
  d.contactEmail = "bad";
  d.markups.flight = "600";
  d.contractStart = "2026-12-01";
  d.contractEnd = "2026-11-01";
  d.freeCancelHours = "9000";
  assert.deepEqual(Object.keys(draftErrors(d)).sort(), ["apiBaseUrl", "contactEmail", "contractEnd", "freeCancelHours", "markups"]);
  d.apiBaseUrl = "https://api.duffel.com";
  d.contactEmail = "ops@duffel.com";
  d.markups.flight = "3,5";
  d.contractEnd = "2027-12-01";
  d.freeCancelHours = "24";
  d.lowBalanceThreshold = "5,000.50";
  assert.deepEqual(Object.keys(draftErrors(d)), ["lowBalanceThreshold"], "thousands separators are ambiguous with a decimal comma");
  d.lowBalanceThreshold = "5000,50";
  d.credentials.api_key = "  live_key_123  ";
  assert.deepEqual(draftErrors(d), {});
  const input = draftToInput(d);
  assert.equal(input.lowBalanceThreshold, 500_050);
  assert.deepEqual(input.markups, { flight: 350 });
  assert.equal(input.creditLimit, 0, "credit limit only applies to postpaid");
  assert.deepEqual(input.credentials, { api_key: "live_key_123" });
  assert.equal(input.freeCancelHours, 24);

  d.integrationType = "manual";
  d.apiBaseUrl = "not a url";
  assert.deepEqual(draftErrors(d), {}, "URLs are ignored for manual suppliers");
  assert.equal(draftToInput(d).apiBaseUrl, "");

  assert.equal(isHttpsUrl("https://user:pw@api.example.com"), false);
  assert.equal(isHttpsUrl("https://api.example.com/v2"), true);
});

await test("edit draft round-trips a supplier; clearing keeps others", () => {
  const s = supplier({ finance: postpaid({ creditUsed: 1_00 }), markups: { flight: 250, hotel: 1000 }, contractEnd: "2027-01-31" });
  const d = draftFromSupplier(s);
  assert.equal(d.creditLimit, "50000.00");
  assert.equal(d.markups.flight, "2.5");
  assert.equal(d.markups.hotel, "10");
  assert.equal(d.markups.visa, "");
  assert.equal(balanceLocked(s), true);
  assert.equal(balanceLocked(supplier()), true, "a prepaid deposit locks the model");
  assert.equal(balanceLocked(supplier({ finance: prepaid({ depositBalance: 0 }) })), false);
  d.clearCredentials.client_secret = true;
  d.credentials.api_key = "new";
  assert.deepEqual(credentialPatch(d), { api_key: "new", client_secret: "" });
  const input = draftToInput(d);
  assert.equal(input.creditLimit, 50_000_00);
  assert.equal(input.contractEnd, "2027-01-31");
});

await test("API payload is snake_case and keeps the credential patch semantics", () => {
  const d = draftFromSupplier(supplier());
  d.clearCredentials.account_id = true;
  const body = supplierPayload(draftToInput(d));
  assert.equal(body.name_en, "Alpha");
  assert.equal(body.integration_type, "api");
  assert.equal(body.low_balance_threshold, 2_000_00);
  assert.deepEqual(body.credentials, { account_id: "" });
  assert.deepEqual(body.markups, { flight: 300 });
  assert.ok(!("nameEn" in body));
});

await test("API mapping of the server detail shape", () => {
  const detail = mapDetail({
    id: "x1",
    code: "SUP-X",
    name_en: "X",
    category: "wholesaler",
    integration: { type: "api", environment: "sandbox", api_base_url: "https://x.example", webhook_url: "" },
    health: { status: "degraded", latency_ms: 1600, checked_at: "2026-10-05T08:00:00Z", note: "slow" },
    finance: { payment_model: "postpaid", currency: "USD", credit_limit: 1000, credit_used: 990, low_balance_threshold: 100, payment_terms: "net15" },
    markups: { hotel: 800, bogus: 5 },
    regions: ["makkah", "atlantis"],
    contract_end: "2026-10-20",
    is_active: true,
    availability: { bookable: true, reason: "", warnings: ["low_balance", "nope"] },
    contract_days_left: 15,
    credentials: { api_key: "••••abcd", other: "x" },
    metrics: { searches: 400, bookings: 3, look_to_book: 7.5, error_rate_pct: 1.2, window_days: 30 },
    volume: { spend: 12345, bookings: 3, refunds: 0 },
    ledger: [{ id: "l1", kind: "charge", amount: 500, balance_after: 990, currency: "USD", created_at: "2026-10-05T08:00:00Z" }],
    can_view_ledger: true,
    disputes: [{ id: "d1", title: "Overcharge", status: "open", amount: 100 }],
    today: "2026-10-05",
  });
  assert.equal(detail.supplier.finance.paymentModel, "postpaid");
  assert.deepEqual(detail.supplier.markups, { hotel: 800 });
  assert.deepEqual(detail.supplier.regions, ["makkah"]);
  assert.deepEqual(detail.supplier.availability.warnings, ["low_balance"]);
  assert.equal(detail.supplier.contractDaysLeft, 15);
  assert.deepEqual(detail.credentials, { api_key: "••••abcd" });
  assert.equal(detail.metrics.lookToBook, 7.5);
  assert.equal(detail.ledger[0].balanceAfter, 990);
  assert.equal(detail.openDisputes, 1);
  assert.equal(detail.canViewLedger, true);
});

await test("API repository sends the routes and bodies the server expects", async () => {
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
  const repo = new ApiSupplierRepository(client);
  replies["GET /suppliers/routing"] = { product: "hotel", options: [{ supplier_id: "s9", code: "SUP-9", score: 88, markup_bps: 800, availability: { bookable: true } }] };
  const options = await repo.routing("hotel");
  assert.equal(options[0].score, 88);
  assert.equal(calls.at(-1)?.path, "/suppliers/routing?product=hotel");

  replies["POST /suppliers/s1/ledger"] = { entry: { id: "e1", kind: "topup", amount: 100 }, supplier: { id: "s1", code: "SUP-A" } };
  const posted = await repo.postLedger("s1", { kind: "topup", amount: 100, reference: "TRX-1", note: "" });
  assert.equal(posted.entry.kind, "topup");
  assert.deepEqual(calls.at(-1)?.body, { kind: "topup", amount: 100, reference: "TRX-1", note: "" });

  await repo.setActive("s1", false);
  assert.deepEqual(calls.at(-1), { path: "/suppliers/s1", method: "PATCH", body: { is_active: false } });

  await repo.closeDispute("s1", "d1", "resolved", "credit note");
  assert.deepEqual(calls.at(-1), { path: "/suppliers/s1/disputes/d1", method: "PATCH", body: { status: "resolved", resolution: "credit note" } });

  replies["POST /suppliers/invoices"] = { id: "inv1", status: "draft" };
  await repo.createInvoice({ supplierId: "s1", invoiceNumber: "INV-1", issueDate: "2026-10-01", lines: [{ description: "Rooms", quantity: 2, unitCost: 500_00 }] });
  const create = calls.find((c) => c.path === "/suppliers/invoices" && c.method === "POST");
  assert.equal((create?.body as Record<string, unknown>).issued_on, "2026-10-01T00:00:00Z");
  const lines = calls.at(-1);
  assert.equal(lines?.path, "/suppliers/invoices/inv1/lines");
  assert.equal(lines?.method, "PUT");
  assert.ok(Array.isArray(lines?.body), "invoice lines are sent as a JSON array");
});

await test("invoice transitions mirror the server", () => {
  assert.deepEqual(INVOICE_TRANSITIONS.draft, ["submitted", "void"]);
  assert.deepEqual(INVOICE_TRANSITIONS.paid, []);
  assert.deepEqual(INVOICE_TRANSITIONS.void, []);
});

await test("offline repository: deposit drain closes search, top-up reopens", async () => {
  const repo = new MemorySupplierRepository();
  const list = await repo.list();
  assert.equal(list.length, 4);
  const dmc = list.find((s) => s.code === "SUP-HAJJ-DMC")!;
  assert.equal(dmc.availability.reason, "deposit_exhausted");
  const saptco = list.find((s) => s.code === "SUP-SAPTCO")!;
  assert.equal(saptco.availability.reason, "contract_expired");

  const { supplier: reopened } = await repo.postLedger(dmc.id, { kind: "topup", amount: 20_000_00, reference: "", note: "" });
  assert.equal(reopened.availability.bookable, true);
  const { supplier: low } = await repo.postLedger(dmc.id, { kind: "charge", amount: 15_000_00, reference: "BK-1", note: "" });
  assert.deepEqual(low.availability.warnings, ["low_balance"]);
  await assert.rejects(repo.postLedger(dmc.id, { kind: "charge", amount: 5_000_01, reference: "", note: "" }), /funds/);
  const { supplier: closed, entry } = await repo.postLedger(dmc.id, { kind: "charge", amount: 5_000_00, reference: "", note: "" });
  assert.equal(closed.availability.reason, "deposit_exhausted");
  assert.equal(entry.balanceAfter, 0);

  const detail = await repo.get(dmc.id);
  assert.equal(detail.ledger.length, 3);
  const flight = await repo.routing("flight");
  assert.equal(flight[0].code, "SUP-DUFFEL-01");

  const duffel = list.find((s) => s.code === "SUP-DUFFEL-01")!;
  const before = await repo.get(duffel.id);
  assert.equal(before.credentials.api_key?.startsWith("••••"), true);
  const d = draftFromSupplier(before.supplier);
  d.clearCredentials.account_id = true;
  await repo.update(duffel.id, draftToInput(d));
  const after = await repo.get(duffel.id);
  assert.ok(after.credentials.api_key, "untouched keys stay stored");
  assert.equal(after.credentials.account_id, undefined, "cleared key is removed");

  await assert.rejects(repo.create({ ...draftToInput(d), code: "SUP-DUFFEL-01" }), /exists/);
});

console.log(`suppliers selftest: ${passed} checks passed`);
