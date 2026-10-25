/**
 * Official WODI mark is the only product logo: sidebar, sign-in, favicon.
 * Tenant logos stay on the company login tile.
 * Run: npm run test:wodi-mark
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WCC_LOGO } from "../src/shared/config/brand.ts";

const root = join(import.meta.dirname, "..");
const src = (rel: string) => readFileSync(join(root, rel), "utf8");
const bin = (rel: string) => readFileSync(join(root, rel));

assert.equal(WCC_LOGO, "/brand/wcc-logo.png");

{
  const png = bin("public/brand/wcc-logo.png");
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "wcc-logo is PNG");
  assert.ok(png.length > 8_000, "wcc-logo is a real raster, not a stub");
  for (const file of ["src/app/icon.png", "src/app/apple-icon.png"]) {
    const bytes = bin(file);
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${file} is PNG`);
  }
  assert.ok(bin("src/app/favicon.ico").length > 20, "favicon is present");
}

{
  const mark = src("src/shared/ui/wodi-mark.tsx");
  assert.match(mark, /WCC_LOGO/);
  assert.match(mark, /bg-black/);
  assert.match(mark, /object-cover/);
  assert.doesNotMatch(mark, /bg-white/);
}

{
  const sidebar = src("src/widgets/app-shell/ui/shell-sidebar.tsx");
  assert.match(sidebar, /WodiMark/);
  assert.doesNotMatch(sidebar, /WCC_LOGO/);
  assert.doesNotMatch(sidebar, /planMarkRing/);
  assert.doesNotMatch(sidebar, /bg-white p-\[3px\]/);
  assert.match(sidebar, /rounded-none/);
}

{
  const login = src("src/app/[locale]/(auth)/login/page.tsx");
  const platform = src("src/app/[locale]/(auth)/platform/login/page.tsx");
  assert.match(login, /<WodiMark size="lg"/);
  assert.match(platform, /<WodiMark size="lg"/);
  assert.doesNotMatch(login, /LogoIcon/);
  assert.doesNotMatch(platform, /LogoIcon/);
}

{
  const company = src("src/app/[locale]/(auth)/[company]/login/page.tsx");
  assert.match(company, /<LogoIcon src=\{logo\}/);
  assert.doesNotMatch(company, /WodiMark/);
}

console.log("selftest-wodi-mark: ok");
