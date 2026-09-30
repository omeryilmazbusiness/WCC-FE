/**
 * Self-test: lead pipeline rules (pure). Stage order with "paid" between
 * proposal and won, allowed moves, the conversion path (mirrors the backend's
 * ConversionPath), per-column budget totals, server-paged lane bookkeeping and
 * the created-in period windows.
 * Run: npm run test:lead-pipeline
 */

import assert from "node:assert/strict";
import {
  LEAD_STAGES,
  PIPELINE_COLUMNS,
  canTransitionLead,
  conversionPath,
  emptyTripInterest,
  isOpenStage,
  nextStages,
  type Lead,
  type LeadStage,
} from "../src/entities/lead/model.ts";
import {
  appendBoardPage,
  combineBudgets,
  mergeBoardSummary,
  pipelineValue,
  removeBoardLeads,
  upsertBoardLead,
  valueFromBudgets,
  type BoardColumn,
} from "../src/entities/lead/lib/pipeline.ts";
import { leadQueryParams, periodRange, weekStartFor } from "../src/entities/lead/lib/query.ts";
import { LEAD_SOURCE_KINDS, leadSourceKind } from "../src/entities/lead/lib/source.ts";

// Order: paid sits between proposal and won, on the board and in the list.
const order = ["new", "contacted", "qualified", "proposal", "paid", "won", "lost"];
assert.deepEqual(LEAD_STAGES, order);
assert.deepEqual(PIPELINE_COLUMNS, order);

// Moves.
assert.deepEqual(nextStages("proposal"), ["paid", "lost"]);
assert.deepEqual(nextStages("paid"), ["won", "lost"]);
assert.ok(canTransitionLead("proposal", "paid"));
assert.ok(canTransitionLead("paid", "won"));
assert.ok(canTransitionLead("paid", "lost"));
assert.ok(!canTransitionLead("proposal", "won"), "proposal must pass through paid");
assert.ok(!canTransitionLead("paid", "proposal"));
assert.ok(!canTransitionLead("won", "paid"));
for (const s of LEAD_STAGES) {
  assert.ok(!canTransitionLead(s, s), `${s} to itself`);
  if (isOpenStage(s)) assert.ok(canTransitionLead(s, "lost"), `${s} can be lost`);
  else assert.deepEqual(nextStages(s), [], `${s} is terminal`);
}
assert.ok(isOpenStage("paid"));

// Every open stage can reach won by allowed moves.
for (const start of LEAD_STAGES.filter(isOpenStage)) {
  let cur: LeadStage = start;
  for (let i = 0; i < LEAD_STAGES.length && cur !== "won"; i++) {
    cur = nextStages(cur).find((s) => s !== "lost") ?? cur;
  }
  assert.equal(cur, "won", `${start} reaches won`);
}

// Conversion path: only from proposal or paid, each step allowed.
assert.deepEqual(conversionPath("proposal"), ["paid", "won"]);
assert.deepEqual(conversionPath("paid"), ["won"]);
assert.deepEqual(conversionPath("won"), []);
for (const s of ["new", "contacted", "qualified", "lost"] as const) assert.equal(conversionPath(s), null, s);
for (const s of LEAD_STAGES) {
  const path = conversionPath(s);
  if (!path) continue;
  let from: LeadStage = s;
  for (const to of path) {
    assert.ok(canTransitionLead(from, to), `${from}→${to}`);
    from = to;
  }
}

// Column budget totals never mix currencies.
function withBudget(amount: number | null, currency: string): Pick<Lead, "interest"> {
  return { interest: { ...emptyTripInterest(), budgetAmount: amount, budgetCurrency: currency } };
}
assert.equal(pipelineValue([]), null);
assert.equal(pipelineValue([withBudget(null, ""), withBudget(0, "SAR"), withBudget(500, "")]), null);
assert.deepEqual(pipelineValue([withBudget(100_000, "SAR"), withBudget(50_000, "SAR")]), {
  amount: 150_000,
  currency: "SAR",
  count: 2,
  partial: false,
});
assert.deepEqual(pipelineValue([withBudget(100_000, "SAR"), withBudget(300_000, "USD"), withBudget(null, "")]), {
  amount: 300_000,
  currency: "USD",
  count: 1,
  partial: true,
});

// Free-text sources map to a channel for the card icon; unknown text stays "other".
const sources: [string | null | undefined, string][] = [
  ["whatsapp", "whatsapp"],
  ["WhatsApp Business", "whatsapp"],
  ["واتساب", "whatsapp"],
  ["instagram", "instagram"],
  ["IG story", "instagram"],
  ["Facebook ads", "facebook"],
  ["web", "web"],
  ["Website form", "web"],
  ["Google Ads", "web"],
  ["email", "email"],
  ["phone", "phone"],
  ["Inbound call", "phone"],
  ["referral", "referral"],
  ["Friend of customer", "referral"],
  ["walk-in", "walkin"],
  ["Riyadh office", "walkin"],
  ["hotel partner", "referral"],
  ["platform", "other"],
  ["", "other"],
  [null, "other"],
  [undefined, "other"],
];
for (const [input, kind] of sources) assert.equal(leadSourceKind(input), kind, String(input));
assert.ok(LEAD_SOURCE_KINDS.includes("other"));

// Server lane totals pick the richest currency, like pipelineValue.
assert.equal(valueFromBudgets([]), null);
assert.deepEqual(valueFromBudgets([{ currency: "SAR", amount: 900, count: 3 }, { currency: "USD", amount: 100, count: 1 }]), {
  amount: 900,
  currency: "SAR",
  count: 3,
  partial: true,
});
assert.deepEqual(combineBudgets([{ currency: "SAR", amount: 500, count: 2 }], [{ currency: "SAR", amount: 500, count: 2 }], -1), []);

// Lane bookkeeping: moves, edits, deletes and paging keep totals and budgets right.
function lead(id: string, stage: LeadStage, budget: number | null = null, noFollowUp = false): Lead {
  return {
    id, stage, noFollowUp,
    branchId: "b", customerId: null, fullName: id, phone: "", source: "", ownerId: "o", ownerName: "",
    lostReasonCode: "", lostReason: "", notes: "", convertedBookingId: null, createdAt: "", updatedAt: "",
    interest: { ...emptyTripInterest(), budgetAmount: budget, budgetCurrency: budget ? "SAR" : "" },
  };
}
function lane(stage: LeadStage, items: Lead[], total = items.length): BoardColumn {
  return {
    stage, total, items,
    noFollowUp: items.filter((l) => l.noFollowUp).length,
    budgets: combineBudgets([], items.filter((l) => l.interest.budgetAmount).map((l) => ({ currency: "SAR", amount: l.interest.budgetAmount!, count: 1 }))),
  };
}
const a = lead("a", "new", 1000, true);
const b = lead("b", "new", 500);
let board = [lane("new", [a, b], 30), lane("contacted", [], 4)];

board = upsertBoardLead(board, { ...a, stage: "contacted", noFollowUp: false });
assert.deepEqual(board[0].items.map((l) => l.id), ["b"]);
assert.equal(board[0].total, 29);
assert.equal(board[0].noFollowUp, 0);
assert.deepEqual(board[0].budgets, [{ currency: "SAR", amount: 500, count: 1 }]);
assert.deepEqual(board[1].items.map((l) => l.id), ["a"]);
assert.equal(board[1].total, 5);
assert.deepEqual(board[1].budgets, [{ currency: "SAR", amount: 1000, count: 1 }]);

// Edit in place keeps position and count, budget follows.
board = appendBoardPage(board, "new", [lead("c", "new"), b]);
assert.deepEqual(board[0].items.map((l) => l.id), ["b", "c"], "page dedupes");
board = upsertBoardLead(board, { ...b, interest: { ...b.interest, budgetAmount: 800 } });
assert.deepEqual(board[0].items.map((l) => l.id), ["b", "c"]);
assert.equal(board[0].total, 29);
assert.deepEqual(board[0].budgets, [{ currency: "SAR", amount: 800, count: 1 }]);

// A created lead lands on top of its lane.
board = upsertBoardLead(board, lead("n", "new"));
assert.equal(board[0].items[0].id, "n");
assert.equal(board[0].total, 30);

board = removeBoardLeads(board, new Set(["n", "c", "unloaded"]));
assert.deepEqual(board[0].items.map((l) => l.id), ["b"]);
assert.equal(board[0].total, 28);

board = mergeBoardSummary(board, [lane("new", [], 100)]);
assert.equal(board[0].total, 100);
assert.deepEqual(board[0].items.map((l) => l.id), ["b"], "summary keeps cards");

// Period windows are local calendar ranges; the week starts per locale.
const wed = new Date(2026, 8, 30, 15, 30); // Wed 30 Sep 2026
assert.deepEqual(periodRange("all", wed, 1), {});
const monWeek = periodRange("week", wed, 1);
assert.deepEqual([monWeek.from, monWeek.to], [new Date(2026, 8, 28), new Date(2026, 9, 5)]);
const sunWeek = periodRange("week", wed, weekStartFor("ar"));
assert.deepEqual([sunWeek.from, sunWeek.to], [new Date(2026, 8, 27), new Date(2026, 9, 4)]);
const sunday = periodRange("week", new Date(2026, 8, 27, 9), 1);
assert.deepEqual(sunday.from, new Date(2026, 8, 21), "Sunday belongs to the Monday week before");
const month = periodRange("month", wed, 1);
assert.deepEqual([month.from, month.to], [new Date(2026, 8, 1), new Date(2026, 9, 1)]);
const dec = periodRange("month", new Date(2026, 11, 31), 1);
assert.deepEqual(dec.to, new Date(2027, 0, 1));
const quarter = periodRange("quarter", wed, 1);
assert.equal(Math.round((+quarter.to! - +quarter.from!) / 86_400_000), 90);

// Query string: empty values are dropped and the default sort is implicit.
assert.equal(leadQueryParams({ q: "  ", sort: "updated" }).toString(), "");
assert.equal(
  leadQueryParams({ q: " omar ", stage: "paid", noFollowUp: true, sort: "budget", createdFrom: "2026-09-01T00:00:00.000Z" }).toString(),
  "q=omar&stage=paid&no_follow_up=true&created_from=2026-09-01T00%3A00%3A00.000Z&sort=budget",
);

console.log("lead pipeline self-test OK");
