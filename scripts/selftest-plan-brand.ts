import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { planBrandShowsBadge, planBrandTone } from "../src/widgets/app-shell/model/plan-brand.ts";

const root = join(import.meta.dirname, "..");
const src = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(planBrandTone("premium"), "premium");
assert.equal(planBrandTone("ultimate"), "ultimate");
assert.equal(planBrandTone(""), "standard");
assert.equal(planBrandTone("gold"), "standard");
assert.ok(planBrandShowsBadge("premium"));
assert.ok(planBrandShowsBadge("ultimate"));
assert.ok(!planBrandShowsBadge("standard"));

{
  const sidebar = src("src/widgets/app-shell/ui/shell-sidebar.tsx");
  assert.match(sidebar, /PlanWordmark/);
  assert.match(sidebar, /planBrandTone/);
  const frame = src("src/widgets/app-shell/ui/app-shell.tsx");
  assert.match(frame, /plan=\{workspace\?\.company\.plan\}/);
}

{
  const mark = src("src/widgets/app-shell/ui/plan-wordmark.tsx");
  assert.match(mark, /shell-plan-badge/);
  assert.match(mark, /whitespace-nowrap/);
  assert.match(mark, /#2563eb/);
  assert.match(mark, /#f59e0b/);
  assert.doesNotMatch(mark, /shell-plan-badge[\s\S]{0,200}border/);
}

console.log("selftest-plan-brand: ok");
