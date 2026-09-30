/**
 * Self-test: lead pipeline rules (pure). Stage order with "paid" between
 * proposal and won, allowed moves, the conversion path (mirrors the backend's
 * ConversionPath) and per-column budget totals.
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
import { pipelineValue } from "../src/entities/lead/lib/pipeline.ts";
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

console.log("lead pipeline self-test OK");
