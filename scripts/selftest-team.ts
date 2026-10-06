/**
 * Self-test: Team page helpers — status, filters, sorting, summary, the password policy mirror
 * (kept in step with the API's auth.ValidatePassword) and en/ar message coverage (pure).
 * Run: npm run test:team
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  filterMembers,
  generatePassword,
  isEmail,
  memberStatus,
  passwordIssues,
  sortMembers,
  summarizeTeam,
} from "../src/entities/identity/lib/team.ts";
import type { ApiUser } from "../src/entities/identity/api.ts";

const NOW = Date.parse("2026-10-06T12:00:00Z");
const FUTURE = "2026-10-06T12:15:00Z";
const PAST = "2026-10-06T11:00:00Z";

function user(id: string, patch: Partial<ApiUser>): ApiUser {
  return { id, email: `${id}@wodi.local`, full_name: id, role: "employee", is_active: true, ...patch } as ApiUser;
}

const team = [
  user("zeynep", { full_name: "Zeynep Çelik", role: "employee", mfa_enabled: true }),
  user("ali", { full_name: "Ali Kaya", role: "manager" }),
  user("omar", { full_name: "Omar Haddad", role: "gm", mfa_enabled: true }),
  user("sara", { full_name: "Sara Nour", role: "finance", locked_until: FUTURE }),
  user("old", { full_name: "Old Lock", role: "operations", locked_until: PAST }),
  user("gone", { full_name: "Gone Away", role: "employee", is_active: false, locked_until: FUTURE }),
];

function status() {
  assert.equal(memberStatus(team[0], NOW), "active");
  assert.equal(memberStatus(team[3], NOW), "locked");
  assert.equal(memberStatus(team[4], NOW), "active", "an expired lock no longer counts");
  assert.equal(memberStatus(team[5], NOW), "inactive", "deactivated wins over locked");
}

function filters() {
  const all = { query: "", role: "all", status: "all" } as const;
  assert.equal(filterMembers(team, all, NOW).length, team.length);
  assert.deepEqual(filterMembers(team, { ...all, query: "celik" }, NOW).map((u) => u.id), ["zeynep"], "diacritics-insensitive");
  assert.deepEqual(filterMembers(team, { ...all, query: "SARA@" }, NOW).map((u) => u.id), ["sara"], "matches email, any case");
  assert.deepEqual(filterMembers(team, { ...all, status: "locked" }, NOW).map((u) => u.id), ["sara"]);
  assert.deepEqual(filterMembers(team, { ...all, role: "employee", status: "active" }, NOW).map((u) => u.id), ["zeynep"]);
}

function sorting() {
  assert.deepEqual(sortMembers(team).map((u) => u.id), ["omar", "ali", "old", "sara", "gone", "zeynep"], "seniority, then name");
}

function summary() {
  const s = summarizeTeam(team, NOW);
  assert.equal(s.total, 6);
  assert.equal(s.active, 4);
  assert.equal(s.locked, 1);
  assert.equal(s.inactive, 1);
  assert.equal(s.active + s.locked + s.inactive, s.total);
  assert.equal(s.mfa, 2);
  assert.equal(s.byRole.employee, 2);
  assert.equal(s.byRole.admin, undefined);
}

function passwords() {
  assert.deepEqual(passwordIssues("Abcdef1234"), []);
  assert.deepEqual(passwordIssues("Abc123"), ["length"]);
  assert.deepEqual(passwordIssues("abcdefghijk"), ["mix"]);
  assert.deepEqual(passwordIssues("1234567890"), ["mix", "common"]);
  assert.deepEqual(passwordIssues("password123"), ["common"]);
  assert.deepEqual(passwordIssues("ChangeMe123"), ["common"]);
  assert.deepEqual(passwordIssues("abcdefghij²"), ["mix"], "only decimal digits count, like Go's unicode.IsDigit");
  assert.deepEqual(passwordIssues("a1".repeat(64)), [], "128 bytes is the limit");
  assert.deepEqual(passwordIssues("a1".repeat(64) + "x"), ["tooLong"]);
  assert.deepEqual(passwordIssues("كلمةمرور".repeat(8) + "1"), ["tooLong"], "the API counts UTF-8 bytes");

  let seed = 7;
  const lcg = (n: number) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % n;
  };
  for (let i = 0; i < 200; i++) {
    const pw = generatePassword(lcg);
    assert.equal(pw.length, 14);
    assert.deepEqual(passwordIssues(pw), [], `generated password passes: ${pw}`);
    assert.match(pw, /[a-z]/);
    assert.match(pw, /[A-Z]/);
    assert.match(pw, /[!@#$%*?]/);
    assert.doesNotMatch(pw, /[0O1lI]/, "no look-alike characters");
  }
}

/** The API's common-password list must stay identical to the mirror. */
function backendPolicy() {
  const path = new URL("../../WCC-BE/internal/platform/auth/password.go", import.meta.url);
  if (!existsSync(path)) {
    console.log("  (backend checkout not found; policy mirror check skipped)");
    return;
  }
  const go = readFileSync(path, "utf8");
  assert.match(go, /len\(password\) < 10/);
  assert.match(go, /len\(password\) > 128/);
  const list = /case ((?:"[^"]*",?\s*)+):/.exec(go)?.[1];
  assert.ok(list, "common password switch found");
  for (const pw of [...list.matchAll(/"([^"]*)"/g)].map((m) => m[1])) {
    assert.ok(passwordIssues(pw).includes("common"), `common password mirrored: ${pw}`);
  }
}

function emails() {
  assert.ok(isEmail(" gm@wodi.local "));
  assert.ok(!isEmail("gm@wodi"));
  assert.ok(!isEmail("g m@wodi.local"));
}

function messages() {
  const load = (l: string) => JSON.parse(readFileSync(new URL(`../src/shared/i18n/messages/${l}.json`, import.meta.url), "utf8"));
  const leaves = (o: unknown, p = ""): string[] =>
    o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => leaves(v, p ? `${p}.${k}` : k)) : [p];
  const en = load("en");
  const ar = load("ar");
  assert.deepEqual(leaves(ar.team).sort(), leaves(en.team).sort(), "team messages match in en and ar");
  for (const role of ["gm", "manager", "operations", "finance", "employee", "admin"]) {
    assert.ok(en.team.roles[role] && en.team.roleHint[role], `role ${role} labelled`);
  }
  assert.equal(en.nav.team, "Team");
  assert.equal(en.nav.users, undefined, "old Users nav label removed");
}

status();
filters();
sorting();
summary();
passwords();
backendPolicy();
emails();
messages();
console.log("team selftest OK");
