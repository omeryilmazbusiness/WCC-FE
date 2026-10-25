/**
 * Self-test: platform admin company registration — country/city/address as names
 * (not ISO codes), payload mapping, UI wiring, EN/AR copy.
 * Run: pnpm test:register-company
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isCityName,
  isCountryName,
  isStreetAddress,
  normalizeCountry,
} from "../src/entities/company/place.ts";
import {
  registerCompanyHints,
  registerCompanyPayload,
  type RegisterCompanyForm,
} from "../src/features/register-company/model/form.ts";
import { generatePassword } from "../src/features/gm-setup/model/flow.ts";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

function form(patch: Partial<RegisterCompanyForm> = {}): RegisterCompanyForm {
  return {
    nameEn: "Al Noor Travel",
    nameAr: "",
    slug: "",
    country: "Syria",
    city: "Damascus",
    address: "Mazzeh, next to the mosque",
    plan: "standard",
    gmName: "Sara Ahmad",
    gmEmail: "sara@alnoor.test",
    gmPassword: "Sahra2026Trip",
    ...patch,
  };
}

function placeNames() {
  assert.equal(normalizeCountry("sa"), "SA");
  assert.equal(normalizeCountry("  saudi   arabia "), "saudi arabia");
  assert.equal(normalizeCountry("Côte d'Ivoire"), "Côte d'Ivoire");
  assert.ok(isCountryName("SA"), "legacy ISO code");
  assert.ok(isCountryName("Syria"));
  assert.ok(isCountryName("United Arab Emirates"));
  assert.ok(isCountryName("Korea, Republic of"));
  assert.ok(!isCountryName(""));
  assert.ok(!isCountryName("s"));
  assert.ok(!isCountryName("12"));
  assert.ok(!isCountryName("US-1"));
  assert.ok(isCityName("Damascus"));
  assert.ok(isCityName("Al-Midan"));
  assert.ok(!isCityName(""));
  assert.ok(!isCityName("x"));
  assert.ok(isStreetAddress("King Fahd Rd 12"));
  assert.ok(!isStreetAddress("1"));
}

function hints() {
  assert.deepEqual(registerCompanyHints(form()), {});
  assert.deepEqual(registerCompanyHints(form({ country: "SA", city: "Riyadh", address: "Olaya St" })), {});
  const missing = registerCompanyHints(form({ country: "", city: " ", address: "" }));
  assert.deepEqual(Object.keys(missing).sort(), ["address", "city", "country"]);
  assert.equal(registerCompanyHints(form({ country: "SA" })).country, undefined);
  assert.equal(registerCompanyHints(form({ country: "s" })).country, "country");
  assert.equal(registerCompanyHints(form({ nameEn: "A" })).nameEn, "nameEn");
  assert.equal(registerCompanyHints(form({ gmEmail: "nope" })).gmEmail, "gmEmail");
}

function payload() {
  const body = registerCompanyPayload(form({ country: "  syria ", city: "  damascus ", slug: "" }));
  assert.equal(body.country, "syria");
  assert.equal(body.city, "damascus");
  assert.equal(body.address, "Mazzeh, next to the mosque");
  assert.equal(body.slug, undefined, "empty slug is derived on the server");
  assert.equal(body.gm.email, "sara@alnoor.test");
  assert.equal(body.plan, "standard");
  const iso = registerCompanyPayload(form({ country: "sy" }));
  assert.equal(iso.country, "SY", "two-letter tokens stay ISO codes");
}

function wiring() {
  const dialog = read("src/features/register-company/ui/register-company-dialog.tsx");
  assert.match(dialog, /FormSection icon=\{MapPinned\}/);
  assert.match(dialog, /FormSection icon=\{Building2\}/);
  assert.match(dialog, /FormSection icon=\{UserRound\}/);
  assert.match(dialog, /PlanPicker/);
  assert.match(dialog, /data-testid="company-field-country"/);
  assert.match(dialog, /data-testid="company-field-city"/);
  assert.match(dialog, /data-testid="company-field-address"/);
  assert.match(dialog, /<Textarea/);
  assert.doesNotMatch(dialog, /maxLength=\{2\}/);
  assert.doesNotMatch(dialog, /placeholder: "SA"/);
  assert.doesNotMatch(dialog, /toUpperCase\(\)\.slice\(0, 2\)/);
  assert.match(dialog, /registerCompanyPayload\(form\)/);
  assert.match(dialog, /autoComplete="country-name"/);
  assert.match(dialog, /autoComplete="street-address"/);

  const view = read("src/views/companies-admin-view.tsx");
  assert.match(view, /RegisterCompanyDialog/);
  assert.doesNotMatch(view, /maxLength=\{2\}/);

  const go = read("../WCC-BE/internal/domain/company/model.go");
  assert.match(go, /validCountryName/);
  assert.doesNotMatch(go, /ISO 3166 alpha-2 code/);
  assert.match(read("../WCC-BE/migrations/00056_company_country_name.sql"), /companies_country_len/);
}

function messages() {
  const load = (l: string) => JSON.parse(readFileSync(new URL(`../src/shared/i18n/messages/${l}.json`, import.meta.url), "utf8"));
  const leaves = (o: unknown, p = ""): string[] =>
    o && typeof o === "object" ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => leaves(v, p ? `${p}.${k}` : k)) : [p];
  const en = load("en");
  const ar = load("ar");
  assert.deepEqual(leaves(ar.adminCompanies).sort(), leaves(en.adminCompanies).sort(), "adminCompanies messages match in en and ar");
  assert.equal(en.adminCompanies.form.errors.country, "Enter the country name.");
  assert.match(en.adminCompanies.form.groups.locationHint, /not codes/);
  assert.ok(en.adminCompanies.form.fields.address);
  assert.ok(en.adminCompanies.form.placeholders.country);
  assert.doesNotMatch(en.adminCompanies.form.errors.country, /2-letter|ISO|code/i);
}

function passwordsStillGenerate() {
  const p = generatePassword();
  assert.equal(registerCompanyHints(form({ gmPassword: p })).gmPassword, undefined);
}

placeNames();
hints();
payload();
wiring();
messages();
passwordsStillGenerate();
console.log("register-company selftest OK");
