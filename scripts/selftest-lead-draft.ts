/**
 * Self-test: turning an AI lead draft into lead form values (pure).
 * Run: npm run test:lead-draft
 */

import assert from "node:assert/strict";
import {
  mergeDraftIntoLead,
  prefillFromContact,
  prefillFromDraft,
} from "../src/features/lead-from-conversation/model/prefill.ts";

const conv = {
  id: "c1",
  channel: "whatsapp",
  contactName: "Abu Ahmad",
  contactPhone: "+966500000001",
  customerName: "",
} as Parameters<typeof prefillFromContact>[0];

const draft = {
  fullName: "Ahmed Al-Harbi",
  phone: "+966500000001",
  travelDate: "2027-03-10",
  travelWindow: "",
  paxCount: 4,
  budgetAmount: 1250000,
  budgetCurrency: "SAR",
  packageId: "pkg-1",
  packageInterest: "",
  notes: "Departing from Jeddah.",
  aiFields: ["full_name", "travel_date", "pax_count", "budget_amount", "package_id", "notes"],
};

const created = prefillFromDraft(conv, draft);
assert.equal(created.fullName, "Ahmed Al-Harbi");
assert.equal(created.phone, "+966500000001");
assert.equal(created.source, "whatsapp");
assert.deepEqual(created.interest, {
  travelDate: "2027-03-10",
  travelWindow: "",
  paxCount: 4,
  budgetAmount: 1250000,
  budgetCurrency: "SAR",
  packageId: "pkg-1",
  packageInterest: "",
});
assert.equal(prefillFromDraft(conv, { ...draft, fullName: "" }).fullName, "Abu Ahmad", "falls back to the contact name");

assert.deepEqual(prefillFromContact(conv), { fullName: "Abu Ahmad", phone: "+966500000001", source: "whatsapp" });

const lead = {
  id: "l1",
  fullName: "Unknown contact",
  phone: "+966500000001",
  notes: "Called twice.",
  interest: {
    travelDate: null,
    travelWindow: "Ramadan",
    paxCount: 2,
    budgetAmount: 900000,
    budgetCurrency: "USD",
    packageId: null,
    packageInterest: "Family Umrah",
  },
} as Parameters<typeof mergeDraftIntoLead>[0];

const merged = mergeDraftIntoLead(lead, draft);
assert.equal(merged.fullName, "Ahmed Al-Harbi", "AI name replaces the placeholder");
assert.equal(merged.phone, lead.phone, "phone is never replaced");
assert.equal(merged.notes, "Called twice.\nDeparting from Jeddah.", "AI notes are appended");
assert.equal(merged.interest?.travelWindow, "Ramadan", "fields AI did not fill stay");
assert.equal(merged.interest?.paxCount, 4);
assert.equal(merged.interest?.budgetCurrency, "SAR", "budget amount and currency move together");
assert.equal(merged.interest?.packageId, "pkg-1");
assert.equal(merged.interest?.packageInterest, "", "a catalogue package clears the free-text interest");

const partial = mergeDraftIntoLead({ ...lead, fullName: "Sara" }, { ...draft, aiFields: ["pax_count"] });
assert.equal(partial.fullName, "Sara", "a real name is kept unless AI filled it");
assert.equal(partial.interest?.budgetAmount, 900000);
assert.equal(partial.interest?.packageInterest, "Family Umrah");
assert.equal(partial.notes, "Called twice.");
assert.equal(
  mergeDraftIntoLead({ ...lead, notes: "Departing from Jeddah." }, draft).notes,
  "Departing from Jeddah.",
  "notes already present are not duplicated",
);

console.log("lead draft selftest OK");
