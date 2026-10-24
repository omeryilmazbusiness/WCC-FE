/**
 * Self-test: company desk idle lock — allowed minutes, remaining-time math, watcher wiring.
 * Run: npm run test:idle-logout
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { idleLogoutChoices, isIdleLogoutMinutes } from "../src/entities/company-security/model.ts";
import { idleRemainingMs, idleShouldLogout, idleShouldWarn } from "../src/features/idle-logout/model/idle-clock.ts";
import { isSessionEndReason } from "../src/shared/api/session-end.ts";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

function policy() {
  for (const n of [0, 5, 15, 120]) assert.ok(isIdleLogoutMinutes(n), `${n} is allowed`);
  for (const n of [-1, 1, 4, 17.5, 121, "15"]) assert.ok(!isIdleLogoutMinutes(n), `${n} is rejected`);
  assert.deepEqual(idleLogoutChoices(15)[0], 0);
  assert.ok(idleLogoutChoices(17).includes(17), "a custom saved value stays selectable");
}

function clock() {
  assert.equal(idleRemainingMs(0, 0, 1_000), Number.POSITIVE_INFINITY);
  assert.equal(idleShouldLogout(Number.POSITIVE_INFINITY), false);
  const start = 1_000_000;
  assert.equal(idleRemainingMs(start, 15, start + 15 * 60_000), 0);
  assert.equal(idleShouldLogout(0), true);
  assert.equal(idleShouldLogout(1), false);
  assert.equal(idleShouldWarn(60_000), true);
  assert.equal(idleShouldWarn(60_001), false);
  assert.equal(idleShouldWarn(0), false);
}

function wiring() {
  assert.equal(isSessionEndReason("idle"), true);
  assert.match(read("src/widgets/app-shell/ui/app-shell.tsx"), /IdleLogoutWatcher/);
  assert.match(read("src/widgets/settings-sections/ui/settings-section-body.tsx"), /case "session":/);
  assert.match(read("src/shared/config/settings.ts"), /id: "session".*setup\.manage/);
  const en = JSON.parse(read("src/shared/i18n/messages/en.json"));
  const ar = JSON.parse(read("src/shared/i18n/messages/ar.json"));
  for (const key of ["signedOutIdle", "idleWarning"]) {
    assert.ok(en.auth[key] && ar.auth[key], `auth.${key}`);
  }
  for (const key of ["enabled", "duration", "saved"]) {
    assert.ok(en.settings.session[key] && ar.settings.session[key], `settings.session.${key}`);
  }
}

policy();
clock();
wiring();
console.log("idle-logout selftest OK");
