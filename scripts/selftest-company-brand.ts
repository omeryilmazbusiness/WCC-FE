/**
 * Self-test: company logo in the app header — branding mapping, versioned logo URL,
 * initials fallback, one shared cached hook, and live refresh after an upload.
 * Run: npm run test:company-brand
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { companyLogoUrl, mapCompanyBranding } from "../src/entities/company-branding/model.ts";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

function mapping() {
  const b = mapCompanyBranding({ slug: "head-office", name_en: "Head Office", has_logo: true, logo_version: "muy70gyd" });
  assert.equal(companyLogoUrl(b), "/api/public/companies/head-office/logo?v=muy70gyd", "same-origin, versioned (cached forever)");
  assert.equal(companyLogoUrl(mapCompanyBranding({ slug: "x", has_logo: false, logo_version: "v1" })), null, "no logo → initials");
  assert.equal(companyLogoUrl(mapCompanyBranding({ slug: "x", has_logo: true, logo_version: "" })), null, "no version → initials");
  assert.equal(companyLogoUrl(mapCompanyBranding(null)), null);
  assert.equal(companyLogoUrl({ slug: "a b", logoVersion: "1/2" }), "/api/public/companies/a%20b/logo?v=1%2F2");
}

function wiring() {
  const select = read("src/features/branch-scope/ui/branch-scope-select.tsx");
  assert.match(select, /<CompanyMark slug=\{ws\.company\.slug\} name=\{companyName\} \/>/, "the header shows the company mark");
  const mark = read("src/features/branch-scope/ui/company-mark.tsx");
  assert.match(mark, /useCompanyBranding\(slug\)/);
  assert.match(mark, /onError=\{\(\) => setFailed\(src\)\}/, "a broken image falls back to initials");
  assert.match(mark, /initials\(name\)/);
  assert.match(mark, /object-contain/, "logos are never cropped");

  const hook = read("src/entities/company-branding/use-company-branding.ts");
  assert.match(hook, /cacheKey: \["company-branding", slug\]/, "navigation never refetches the logo");
  assert.match(hook, /enabled: Boolean\(slug\)/);
  assert.match(hook, /next\.slug === slug/, "another company's upload never changes this header");

  assert.match(read("src/features/gm-setup/ui/logo-group.tsx"), /announceCompanyBrandingChanged\(next\)/, "uploads refresh the header live");
  const brand = read("src/widgets/booking-workspace/model/use-company-brand.ts");
  assert.match(brand, /useCompanyBranding\(company\?\.slug\)/, "documents share the same cached branding");
  assert.doesNotMatch(brand, /createCompanyBrandingApi/);
}

mapping();
wiring();
console.log("company-brand selftest OK");
