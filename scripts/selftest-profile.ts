/**
 * Self-test: the viewer's own profile — validators mirror the API, change detection, photo crop,
 * password meter, the BFF-only password route, endpoint parity with the backend router and en/ar copy.
 * Run: npm run test:profile
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  PROFILE_LIMITS,
  emailIssue,
  fullNameIssue,
  jobTitleIssue,
  personalInfoChanges,
  personalInfoIssues,
  phoneIssue,
  profileCompleteness,
  squareCrop,
} from "../src/entities/profile/model.ts";
import { passwordStrength } from "../src/features/edit-profile/lib/password-strength.ts";
import { AUTH_ENDPOINTS, PROXY_BLOCKED_PATHS } from "../src/shared/api/auth-contract.ts";

const root = (p: string) => new URL(`../${p}`, import.meta.url);
const read = (p: string) => readFileSync(root(p), "utf8");

function validators() {
  assert.equal(fullNameIssue("  Ömer   Yılmaz "), null);
  assert.equal(fullNameIssue(" A "), "required");
  assert.equal(fullNameIssue("x".repeat(PROFILE_LIMITS.fullNameMax)), null);
  assert.equal(fullNameIssue("x".repeat(PROFILE_LIMITS.fullNameMax + 1)), "tooLong");
  assert.equal(fullNameIssue("Bad\u0007Name"), "invalid");
  assert.equal(fullNameIssue("علي حسن"), null, "Arabic names count as characters, not bytes");

  assert.equal(jobTitleIssue(""), null, "the job title is optional");
  assert.equal(jobTitleIssue("é".repeat(80)), null);
  assert.equal(jobTitleIssue("é".repeat(81)), "tooLong");

  assert.equal(phoneIssue(""), null, "an empty phone clears it");
  for (const ok of ["+90 (555) 123-45.67", "0555 123 45 67", "+966501234567"]) assert.equal(phoneIssue(ok), null, ok);
  for (const bad of ["555", "12a4567", "1+2345678", "+1234567890123456", "phone"]) assert.equal(phoneIssue(bad), "invalid", bad);

  assert.equal(emailIssue(" GM@Wodi.Local "), null);
  assert.equal(emailIssue(""), "required");
  for (const bad of ["a@b", "no-at.example", "a b@c.io", "x@y.z<"]) assert.equal(emailIssue(bad), "invalid", bad);

  assert.deepEqual(personalInfoIssues({ fullName: "Ok Name", jobTitle: "", phone: "" }), {});
  assert.deepEqual(Object.keys(personalInfoIssues({ fullName: "", jobTitle: "x".repeat(99), phone: "12" })).sort(), ["fullName", "jobTitle", "phone"]);
}

function changes() {
  const saved = { fullName: "Ali Hasan", jobTitle: "GM", phone: "" };
  assert.deepEqual(personalInfoChanges(saved, { ...saved, fullName: "  Ali   Hasan " }), {}, "whitespace-only edits are no change");
  assert.deepEqual(personalInfoChanges(saved, { ...saved, jobTitle: "" }), { jobTitle: "" }, "clearing a field is sent");
  assert.deepEqual(personalInfoChanges(saved, { fullName: "Ali", jobTitle: "GM", phone: " +90 555 1234567 " }), { fullName: "Ali", phone: "+90 555 1234567" });

  assert.equal(profileCompleteness({ jobTitle: "", phone: "", avatarVersion: null, mfaEnabled: false }), 0);
  assert.equal(profileCompleteness({ jobTitle: "GM", phone: "1", avatarVersion: "abc", mfaEnabled: true }), 100);
  assert.equal(profileCompleteness({ jobTitle: "GM", phone: "", avatarVersion: null, mfaEnabled: true }), 50);
}

function photo() {
  assert.deepEqual(squareCrop(1200, 800), { sx: 200, sy: 0, size: 800 });
  assert.deepEqual(squareCrop(600, 1000), { sx: 0, sy: 200, size: 600 });
  assert.deepEqual(squareCrop(512, 512), { sx: 0, sy: 0, size: 512 });
  assert.equal(PROFILE_LIMITS.avatarMaxBytes, 1 << 20, "matches identity.MaxAvatarBytes");
  const prep = read("src/features/edit-profile/lib/prepare-avatar.ts");
  assert.match(prep, /image\/webp/);
  assert.doesNotMatch(prep, /svg/i, "SVG can carry script and is never accepted");
  assert.match(read("src/features/edit-profile/ui/profile-photo.tsx"), /uploadAvatar\(await prepareAvatar\(/, "photos are re-encoded before upload");
}

function strength() {
  assert.equal(passwordStrength(""), 0);
  assert.equal(passwordStrength("short1"), 1);
  assert.ok(passwordStrength("Tr0ub4dor&3xyz!") >= 3);
  assert.ok(passwordStrength("correcthorse12") < passwordStrength("Correct-Horse-12!"));
}

function bff() {
  assert.equal(AUTH_ENDPOINTS.password, "/auth/password");
  assert.ok(PROXY_BLOCKED_PATHS.includes(AUTH_ENDPOINTS.password), "token-issuing password change never goes through the proxy");
  const route = "src/app/api/auth/password/route.ts";
  assert.ok(existsSync(root(route)), "BFF route exists");
  assert.match(read(route), /POST = handleChangePassword/);
  const handler = read("src/shared/api/server/bff-handlers.ts");
  const body = handler.slice(handler.indexOf("export async function handleChangePassword"));
  assert.match(body, /csrfError\(req\)/, "CSRF checked");
  assert.match(body, /setTokenCookies\(res, tokens\)/, "new tokens land in HttpOnly cookies");
  assert.match(body, /setSessionCookie\(res, await signSession\(viewer\)\)/, "session snapshot re-signed");
  assert.doesNotMatch(body, /access_token|refresh_token/, "tokens are never echoed to the browser");
  assert.match(read("src/entities/profile/api.ts"), /bffHttp\.request<[^>]+>\(AUTH_ENDPOINTS\.password/);
}

function backendParity() {
  const router = new URL("../../WCC-BE/internal/adapter/http/router.go", import.meta.url);
  if (!existsSync(router)) return;
  const src = readFileSync(router, "utf8");
  for (const [method, path] of [
    ["Get", "/me/profile"],
    ["Patch", "/me/profile"],
    ["Put", "/me/email"],
    ["Get", "/me/avatar"],
    ["Put", "/me/avatar"],
    ["Delete", "/me/avatar"],
    ["Post", "/password"],
  ]) {
    assert.ok(src.includes(`r.${method}("${path}"`), `backend serves ${method.toUpperCase()} ${path}`);
  }
}

function messages() {
  const en = JSON.parse(read("src/shared/i18n/messages/en.json"));
  const ar = JSON.parse(read("src/shared/i18n/messages/ar.json"));
  const leaves = (o: unknown, p = ""): string[] =>
    o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => leaves(v, p ? `${p}.${k}` : k)) : [p];
  assert.deepEqual(leaves(ar.settings.profile).sort(), leaves(en.settings.profile).sort(), "profile copy matches in en and ar");
  const p = en.settings.profile;
  for (const field of ["fullName", "jobTitle", "phone"]) {
    for (const issue of ["required", "tooLong", "invalid"]) assert.ok(p.info.issue[field][issue], `info.issue.${field}.${issue}`);
  }
  for (const k of ["type", "tooLarge", "tooSmall", "unreadable"]) assert.ok(p.photo.problem[k], `photo.problem.${k}`);
  for (const k of ["required", "invalid", "unchanged", "taken"]) assert.ok(p.email.problem[k], `email.problem.${k}`);
  for (const k of ["weak", "fair", "good", "strong"]) assert.ok(p.password.strength[k], `password.strength.${k}`);
  for (const k of ["length", "mix", "common"]) assert.ok(p.password.rule[k], `password.rule.${k}`);
  assert.match(p.email.description, /\{email\}/);
  assert.match(ar.settings.profile.email.description, /\{email\}/);
}

function entryPoints() {
  const card = read("src/widgets/settings-hub/ui/profile-card.tsx");
  assert.match(card, /\$\{SETTINGS_ROOT\}\/profile/, "the profile card opens the profile");
  assert.match(card, /UserAvatar/, "the card shows the photo");
  assert.match(read("src/widgets/settings-sections/ui/settings-section-body.tsx"), /case "profile":/);
}

validators();
changes();
photo();
strength();
bff();
backendParity();
messages();
entryPoints();
console.log("profile self-test OK");
