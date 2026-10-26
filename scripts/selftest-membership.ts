/**
 * Self-test: Settings → Membership & subscription — presentation-free feature
 * matrix, three vertical cards, upgrade ask, EN/AR copy.
 * Run: pnpm test:membership
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MEMBERSHIP_FEATURES,
  featureCap,
  featuresOn,
  planIncludes,
} from "../src/entities/company/membership.ts";
import { COMPANY_PLANS, canUpgradeTo, nextCompanyPlan } from "../src/entities/company/plan.ts";
import { upgradeAskForPlan, upgradeFeatureName } from "../src/features/request-plan-upgrade/model/target.ts";
import { findSettingsSection, isSettingsDetail, SETTINGS_SECTIONS } from "../src/shared/config/settings.ts";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

function catalog() {
  assert.equal(nextCompanyPlan("standard"), "premium");
  assert.equal(nextCompanyPlan("premium"), "ultimate");
  assert.equal(nextCompanyPlan("ultimate"), null);
  assert.ok(canUpgradeTo("standard", "ultimate"));

  const standard = featuresOn("standard").map((f) => f.id);
  const premium = featuresOn("premium").map((f) => f.id);
  const ultimate = featuresOn("ultimate").map((f) => f.id);

  assert.ok(standard.includes("users") && standard.includes("salesDesk") && standard.includes("ai"));
  assert.ok(standard.includes("visa") && standard.includes("inbox"));
  assert.ok(!standard.includes("dashboard") && !standard.includes("payments"));
  assert.ok(premium.includes("dashboard") && premium.includes("visa") && premium.includes("pricing"));
  assert.deepEqual(featureCap("standard", MEMBERSHIP_FEATURES.find((f) => f.id === "inbox")!), { kind: "unlimited" });
  assert.ok(!premium.includes("aiSetup") && !premium.includes("fx") && !premium.includes("finance"));
  assert.deepEqual(ultimate, MEMBERSHIP_FEATURES.map((f) => f.id), "Ultimate lists every published feature");

  assert.ok(planIncludes("premium", MEMBERSHIP_FEATURES.find((f) => f.id === "payments")!));
  assert.ok(!planIncludes("standard", MEMBERSHIP_FEATURES.find((f) => f.id === "payments")!));

  assert.deepEqual(featureCap("standard", MEMBERSHIP_FEATURES.find((f) => f.id === "users")!), { kind: "count", n: 3 });
  assert.deepEqual(featureCap("ultimate", MEMBERSHIP_FEATURES.find((f) => f.id === "users")!), { kind: "unlimited" });
  assert.equal(featureCap("standard", MEMBERSHIP_FEATURES.find((f) => f.id === "salesDesk")!), null);
}

function settings() {
  const section = findSettingsSection("membership");
  assert.ok(section && section.group === "account" && !section.permission && !section.href);
  assert.ok(isSettingsDetail("membership"));
  assert.ok(SETTINGS_SECTIONS.some((s) => s.id === "membership"));
}

function upgrade() {
  const ask = upgradeAskForPlan("standard", "premium", "Membership & subscription");
  assert.equal(ask?.current, "standard");
  assert.equal(ask?.next, "premium");
  assert.equal(ask?.feature, "Membership & subscription");
  assert.equal(upgradeAskForPlan("ultimate", "premium", "x"), null);
  assert.equal(upgradeFeatureName(ask!, () => "nav"), "Membership & subscription");
}

function wiring() {
  const body = read("src/widgets/settings-sections/ui/settings-section-body.tsx");
  assert.match(body, /case "membership"/);
  assert.match(body, /MembershipSection/);
  const section = read("src/widgets/settings-sections/ui/membership/membership-section.tsx");
  assert.match(section, /data-testid="membership-section"/);
  assert.match(section, /data-testid="membership-cards"/);
  assert.match(section, /openPlan/);
  const card = read("src/widgets/settings-sections/ui/membership/plan-card.tsx");
  assert.match(card, /membership-card-\$\{plan\}/);
  assert.match(card, /membership-feature-\$\{plan\}-\$\{feature.id\}/);
  assert.match(card, /membership-upgrade-\$\{plan\}/);
  const look = read("src/widgets/settings-hub/ui/section-look.ts");
  assert.match(look, /membership: \{ icon: CreditCard/);
  const provider = read("src/features/request-plan-upgrade/ui/upgrade-plan-provider.tsx");
  assert.match(provider, /openPlan/);
}

function messages() {
  const load = (l: string) =>
    JSON.parse(readFileSync(new URL(`../src/shared/i18n/messages/${l}.json`, import.meta.url), "utf8"));
  const leaves = (o: unknown, p = ""): string[] =>
    o && typeof o === "object"
      ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => leaves(v, p ? `${p}.${k}` : k))
      : [p];
  const en = load("en");
  const ar = load("ar");
  assert.deepEqual(leaves(ar.settings.membership).sort(), leaves(en.settings.membership).sort());
  assert.equal(en.settings.sections.membership.title, "Membership & subscription");
  assert.equal(ar.settings.sections.membership.title, "العضوية والاشتراك");
  for (const plan of COMPANY_PLANS) {
    assert.ok(en.settings.membership.plans[plan].tagline, plan);
    assert.ok(en.settings.membership.plans[plan].body, plan);
  }
  for (const feature of MEMBERSHIP_FEATURES) {
    assert.ok(en.settings.membership.features[feature.id].title, feature.id);
    assert.ok(en.settings.membership.features[feature.id].body, feature.id);
    if (feature.limit) assert.ok(en.settings.membership.caps[feature.id], `cap ${feature.id}`);
  }
}

catalog();
settings();
upgrade();
wiring();
messages();
console.log("membership selftest OK");
