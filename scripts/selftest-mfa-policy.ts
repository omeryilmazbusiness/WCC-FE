/**
 * Self-test: production MFA enrollment is platform-admin only.
 * Company login pages stay password-only; the QR setup step is driven by
 * the API (`mfa_setup_required`), never by the page slug.
 * Run: pnpm test:mfa-policy
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const be = join(root, "../WCC-BE");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const readBe = (rel: string) => readFileSync(join(be, rel), "utf8");

{
  const policy = readBe("internal/platform/auth/mfa.go");
  assert.match(policy, /func ForcedMFARoles\(\) \[\]Role/);
  assert.match(policy, /return \[\]Role\{RoleAdmin\}/);
  assert.match(policy, /Company desks/);

  const wiring = readBe("internal/app/security_wiring.go");
  assert.match(wiring, /NewMFAPolicy\(platformauth\.ForcedMFARoles\(\)\.\.\.\)/);
  assert.doesNotMatch(wiring, /RoleGM,\s*platformauth\.RoleAdmin/);
}

{
  const login = read("src/features/auth-by-credentials/ui/login-form.tsx");
  assert.match(login, /company\?: string/);
  assert.match(login, /platform\?: boolean/);
  assert.match(login, /mfa_setup_required/);
  assert.match(login, /MfaSetupStep/);
  assert.doesNotMatch(login, /role === ["']gm["']/);
}

console.log("selftest-mfa-policy: ok");
