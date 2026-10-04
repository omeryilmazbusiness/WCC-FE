/**
 * Self-test: GM setup flow rules (navigation, hints, branches, password policy, currencies).
 * Run: pnpm test:setup-flow
 */

import assert from "node:assert/strict";
import {
  CURRENCY_CHOICES,
  branchDraftHints,
  companyHints,
  companySlug,
  donePercent,
  generatePassword,
  initialStep,
  initials,
  isLastStep,
  neighborStep,
  passwordIssue,
  progressPercent,
  slugify,
  statusOf,
  withMainCenter,
  type BranchDraft,
} from "../src/features/gm-setup/model/flow.ts";
import type { CompanyProfile, SetupOverview } from "../src/entities/setup/model.ts";

const company: CompanyProfile = {
  slug: "al-noor",
  nameEn: "Al Noor Travel",
  nameAr: "",
  legalName: "",
  phone: "",
  email: "",
  website: "",
  country: "SA",
  city: "Riyadh",
  address: "King Fahd Rd",
  currency: "USD",
  timezone: "Asia/Riyadh",
};

function overview(patch: Partial<SetupOverview> = {}): SetupOverview {
  return {
    companyId: "c1",
    company,
    branches: [],
    steps: [
      { key: "company", status: "done", count: 0 },
      { key: "staff", status: "pending", count: 0 },
      { key: "ai", status: "skipped", count: 0 },
      { key: "channels", status: "pending", count: 0 },
    ],
    nextStep: "staff",
    doneCount: 1,
    totalSteps: 4,
    completed: false,
    fullyDone: false,
    required: true,
    completedAt: null,
    dismissedAt: null,
    ...patch,
  };
}

// navigation
{
  const o = overview();
  assert.equal(initialStep(o), "staff");
  assert.equal(initialStep(overview({ nextStep: null })), "channels");
  // completed with skips reopens the first step that is not done
  assert.equal(initialStep(overview({ completed: true })), "staff");
  assert.equal(initialStep(overview({ completed: true, fullyDone: true })), null);
  assert.equal(neighborStep(o, "company", -1), null);
  assert.equal(neighborStep(o, "company", 1), "staff");
  assert.equal(neighborStep(o, "channels", 1), null);
  assert.equal(isLastStep(o, "channels"), true);
  assert.equal(isLastStep(o, "ai"), false);
  assert.equal(statusOf(o, "ai"), "skipped");
  assert.equal(progressPercent(o), 50);
  assert.equal(donePercent(o), 25);
  assert.equal(donePercent(overview({ totalSteps: 0 })), 0);
}

// company hints: location is required, slug optional but validated
{
  assert.deepEqual(companyHints(company), {});
  assert.deepEqual(companyHints({ ...company, slug: "" }), {});
  const bad = companyHints({ ...company, nameEn: "A", slug: "-x", email: "nope" });
  assert.deepEqual(Object.keys(bad).sort(), ["email", "nameEn", "slug"]);
  assert.equal(companyHints({ ...company, slug: "setup" }).slug, "slug");
  assert.equal(companyHints({ ...company, slug: "Al-Noor" }).slug, "slug");
  const noLocation = companyHints({ ...company, country: "", city: " ", address: "" });
  assert.deepEqual(Object.keys(noLocation).sort(), ["address", "city", "country"]);
  assert.equal(companyHints({ ...company, country: "sa" }).country, "country");
  assert.equal(initials("sara ahmed"), "SA");
  assert.equal(initials("Omer"), "O");
  assert.equal(initials(""), "?");
}

// slugify mirrors the backend
{
  assert.equal(slugify("Al Noor Travel"), "al-noor-travel");
  assert.equal(slugify("  Main Center  "), "main-center");
  assert.equal(slugify("İstanbul Şube"), "istanbul-sube");
  assert.equal(slugify("Çağrı Merkezi"), "cagri-merkezi");
  assert.equal(slugify("مكتب"), "");
  assert.equal(slugify("a".repeat(60)).length, 48);
  assert.equal(slugify(`${"a".repeat(47)} b`), "a".repeat(47));
}

// the company URL follows the English name
{
  const saved = { nameEn: "WIFAD", slug: "wifad" };
  assert.equal(companySlug("WIFAD", saved), "wifad");
  assert.equal(companySlug(" WIFAD ", saved), "wifad");
  assert.equal(companySlug("Test Travel", saved), "test-travel");
  assert.equal(companySlug("وفاد", saved), "wifad");
}

// branch drafts
{
  const drafts: BranchDraft[] = [
    { id: "b1", nameEn: "Main Center", kind: "main_center" },
    { id: "", nameEn: "Jeddah", kind: "branch" },
  ];
  assert.deepEqual(branchDraftHints(drafts), {});
  assert.deepEqual(branchDraftHints([...drafts, { id: "", nameEn: "jeddah ", kind: "branch" }]), { 2: "duplicate" });
  assert.deepEqual(branchDraftHints([...drafts, { id: "", nameEn: "مكتب", kind: "branch" }]), { 2: "name" });
  assert.deepEqual(branchDraftHints([{ id: "", nameEn: "J", kind: "branch" }]), { 0: "name" });
  const swapped = withMainCenter(drafts, 1);
  assert.deepEqual(swapped.map((d) => d.kind), ["branch", "main_center"]);
  assert.equal(swapped.filter((d) => d.kind === "main_center").length, 1);
  assert.equal(drafts[0].kind, "main_center", "input is not mutated");
}

// password policy: ≥10 chars, letters and digits, no look-alikes
{
  for (let i = 0; i < 500; i++) {
    const p = generatePassword();
    assert.equal(p.length, 14);
    assert.match(p, /[A-Za-z]/);
    assert.match(p, /\d/);
    assert.doesNotMatch(p, /[0O1lI]/);
    assert.equal(passwordIssue(p), null);
  }
  assert.equal(generatePassword(4).length, 10);
  // worst case: an rng that always returns zero still yields a letter and a digit
  const zeros = (n: number) => new Uint32Array(n);
  const p = generatePassword(12, zeros);
  assert.match(p, /[A-Za-z]/);
  assert.match(p, /\d/);

  assert.equal(passwordIssue("short1"), "length");
  assert.equal(passwordIssue("a".repeat(129) + "1"), "length");
  assert.equal(passwordIssue("onlyletters"), "mix");
  assert.equal(passwordIssue("1234567891"), "mix");
  assert.equal(passwordIssue("password123"), "common");
  assert.equal(passwordIssue("Sahra2026Trip"), null);
}

// currencies offered in the preferences
{
  assert.ok((CURRENCY_CHOICES as readonly string[]).includes("SYP"), "Syrian pound is offered");
}

console.log("selftest-setup-flow: OK");
