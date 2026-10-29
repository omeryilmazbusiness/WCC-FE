/**
 * Self-test: platform admin company delete — slug confirm, soft-retire,
 * session revoke, EN/AR copy, UI + API + backend contract.
 * Run: pnpm test:company-delete
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const be = join(root, "../WCC-BE");

const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const readBe = (rel: string) => readFileSync(join(be, rel), "utf8");

function leaves(o: unknown, p = ""): string[] {
  return o && typeof o === "object"
    ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => leaves(v, p ? `${p}.${k}` : k))
    : [p];
}

{
  const api = read("src/entities/company/api.ts");
  assert.match(api, /export async function deleteCompany/);
  assert.match(api, /method: "DELETE"/);
  assert.match(api, /\/platform\/companies\/\$\{id\}/);
  assert.match(api, /JSON\.stringify\(\{ slug \}\)/);

  const barrel = read("src/entities/company/index.ts");
  assert.match(barrel, /deleteCompany/);
}

{
  const drawer = read("src/features/edit-company/ui/edit-company-drawer.tsx");
  assert.match(drawer, /deleteCompany/);
  assert.match(drawer, /data-testid="company-delete"/);
  assert.match(drawer, /challenge=\{row\?\.slug\}/);
  assert.match(drawer, /ConfirmDialog/);
  assert.match(drawer, /t\("deleteTitle"/);
  assert.match(drawer, /t\("deleteDescription"/);

  const confirm = read("src/shared/ui/confirm-dialog.tsx");
  assert.match(confirm, /challenge\?:/);
  assert.match(confirm, /data-testid="confirm-challenge"/);
  assert.match(confirm, /data-testid="confirm-submit"/);
  assert.match(confirm, /disabled=\{pending \|\| !matched\}/);
}

{
  const en = JSON.parse(read("src/shared/i18n/messages/en.json"));
  const ar = JSON.parse(read("src/shared/i18n/messages/ar.json"));
  assert.deepEqual(leaves(ar.adminCompanies).sort(), leaves(en.adminCompanies).sort());
  const edit = en.adminCompanies.edit;
  for (const k of [
    "delete",
    "deleteTitle",
    "deleteDescription",
    "deleteChallenge",
    "deleteConfirm",
    "deleteCancel",
    "deleting",
    "deleted",
    "deleteError",
  ]) {
    assert.equal(typeof edit[k], "string", `adminCompanies.edit.${k}`);
  }
  assert.match(edit.deleteTitle, /\{name\}/);
  assert.match(edit.deleteDescription, /\{slug\}/);
}

{
  const router = readBe("internal/adapter/http/router.go");
  assert.match(router, /r\.Delete\("\/\{id\}", h\.Company\.DeleteCompany\)/);

  const handler = readBe("internal/adapter/http/company/handler.go");
  assert.match(handler, /func \(h Handler\) DeleteCompany/);
  assert.match(handler, /h\.Svc\.Delete\(/);
  assert.match(handler, /http\.StatusNoContent/);

  const service = readBe("internal/app/company/service.go");
  assert.match(service, /func \(s \*Service\) Delete\(/);
  assert.match(service, /ConfirmDeleteSlug/);
  assert.match(service, /company\.deleted/);
  assert.match(service, /company already deleted/);

  const repo = readBe("internal/adapter/postgres/company/repository.go");
  assert.match(repo, /func \(r \*Repository\) DeleteCompany/);
  assert.match(repo, /is_active=false/);
  assert.match(repo, /revoked_reason=\$3/);
  assert.match(repo, /WHERE c\.is_active AND/);
  assert.match(repo, /AND c\.is_active/);

  const model = readBe("internal/domain/company/model.go");
  assert.match(model, /func RetiredSlug\(/);
  assert.match(model, /func \(c Company\) ConfirmDeleteSlug\(/);

  const guard = readBe("internal/adapter/http/router_guard_test.go");
  assert.match(guard, /DELETE \/v1\/platform\/companies\/\{id\}/);
}

console.log("selftest-company-delete: ok");
