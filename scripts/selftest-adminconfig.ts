/**
 * Self-test: admin automation settings — threshold validation mirrors the backend ranges
 * (incl. SLA A below B) and the SLA A/B preview math (pure).
 * Run: npm run test:adminconfig
 */

import assert from "node:assert/strict";
import {
  slaScaledMinutes,
  THRESHOLD_LIMITS,
  validateThresholds,
  type ThresholdSettings,
} from "../src/entities/adminconfig/model.ts";

const defaults: ThresholdSettings = {
  capacitySoftPct: 80,
  paymentOverdueHours: 12,
  missingDocHours: 24,
  leadNoFollowupHours: 24,
  targetBehindPct: 15,
  slaWarnPct: 75,
  slaBreachPct: 100,
  visaFollowUpDays: 7,
};

function validation() {
  assert.equal(validateThresholds(defaults), null, "backend defaults are valid");
  assert.deepEqual(validateThresholds({ ...defaults, paymentOverdueHours: 0 }), {
    key: "paymentOverdueHours",
    reason: "range",
  });
  assert.deepEqual(validateThresholds({ ...defaults, missingDocHours: 721 }), { key: "missingDocHours", reason: "range" });
  assert.deepEqual(validateThresholds({ ...defaults, capacitySoftPct: 12.5 }), {
    key: "capacitySoftPct",
    reason: "range",
  }, "fractions are rejected");
  assert.deepEqual(validateThresholds({ ...defaults, slaWarnPct: 100, slaBreachPct: 100 }), {
    key: "slaWarnPct",
    reason: "warnAboveBreach",
  });
  assert.deepEqual(validateThresholds({ ...defaults, slaBreachPct: 301 }), { key: "slaBreachPct", reason: "range" });
  assert.equal(validateThresholds({ ...defaults, slaWarnPct: 10, slaBreachPct: 50, visaFollowUpDays: 90 }), null, "edges accepted");
  for (const [key, { min, max }] of Object.entries(THRESHOLD_LIMITS)) {
    assert.ok(min >= 1 && max > min, `${key} range sane`);
  }
}

function abPreview() {
  assert.equal(slaScaledMinutes(900, 75), 11, "15 min × 75% ≈ 11 min");
  assert.equal(slaScaledMinutes(900, 100), 15);
  assert.equal(slaScaledMinutes(3600, 150), 90);
  assert.equal(slaScaledMinutes(600, 10), 1);
}

validation();
abPreview();
console.log("adminconfig selftest OK");
