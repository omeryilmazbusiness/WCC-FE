/**
 * Self-test: iOS-style settings hub — own profile, team, roles, audit and help; per-role visibility and route
 * guards, permission grouping, the persistent list layout, en/ar coverage and the redirects.
 * Run: npm run test:settings
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  SETTINGS_GROUPS,
  SETTINGS_HUB_PERMISSIONS,
  SETTINGS_ROOT,
  SETTINGS_SECTIONS,
  findSettingsSection,
  isSettingsDetail,
  settingsPath,
  visibleSettings,
} from "../src/shared/config/settings.ts";
import { DEMO_ROLE_PERMISSIONS, PERMISSIONS, canAccessPath, grants, homeFor } from "../src/shared/config/permissions.ts";
import { groupPermissions, humanize } from "../src/widgets/settings-sections/model/permission-groups.ts";

const root = (p: string) => new URL(`../${p}`, import.meta.url);
const read = (p: string) => readFileSync(root(p), "utf8");

function registry() {
  const ids = SETTINGS_SECTIONS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "section ids are unique");
  for (const g of SETTINGS_GROUPS) assert.ok(SETTINGS_SECTIONS.some((s) => s.group === g), `group ${g} has sections`);
  assert.ok(isSettingsDetail("roles") && isSettingsDetail("audit"), "roles and audit open inside settings");
  assert.ok(!isSettingsDetail("team"), "team links to its own page");
  assert.ok(!isSettingsDetail("nope"));
  assert.equal(settingsPath(findSettingsSection("audit")!), `${SETTINGS_ROOT}/audit`);
  assert.equal(settingsPath(findSettingsSection("team")!), "/team");
  assert.deepEqual(ids, ["profile", "team", "roles", "audit", "faq", "ai", "support", "supportInbox"], "settings keeps only the essentials");
  assert.ok(isSettingsDetail("profile"), "the profile opens inside settings");
  assert.equal(findSettingsSection("profile")!.permission, undefined, "the own profile needs no extra permission");
  assert.deepEqual([...SETTINGS_HUB_PERMISSIONS].sort(), ["ai.read", "audit.read", "roles.read", "support.manage", "support.write"]);
  assert.equal(findSettingsSection("support")!.permission, "support.write", "help requests need support.write");
  assert.equal(findSettingsSection("supportInbox")!.permission, "support.manage", "the inbox is for the platform team");
  assert.equal(findSettingsSection("ai")!.permission, "ai.read", "the AI protocol follows the assistant permission");
}

function visibility() {
  const ids = (role: keyof typeof DEMO_ROLE_PERMISSIONS) =>
    visibleSettings(DEMO_ROLE_PERMISSIONS[role]).flatMap((g) => g.sections.map((s) => s.id));
  assert.deepEqual(ids("gm"), SETTINGS_SECTIONS.map((s) => s.id).filter((id) => id !== "supportInbox"), "the GM sees every company section");
  assert.deepEqual(ids("admin"), ["profile", "team", "audit", "faq", "supportInbox"], "platform operators: profile, team, audit, help and the support inbox");
  assert.deepEqual(ids("employee"), ["profile", "faq", "ai", "support"], "agents get their profile, help, the AI protocol and help requests");
  for (const role of ["gm", "manager", "employee", "finance", "operations"] as const) {
    assert.ok(ids(role).includes("support") && !ids(role).includes("supportInbox"), `${role} sends requests but has no inbox`);
  }
  assert.ok(ids("finance").includes("audit") && !ids("finance").includes("roles"));
  assert.ok(visibleSettings(DEMO_ROLE_PERMISSIONS.admin).every((g) => g.sections.length > 0), "empty groups are dropped");
}

function guards() {
  const can = (role: keyof typeof DEMO_ROLE_PERMISSIONS, path: string) => canAccessPath(DEMO_ROLE_PERMISSIONS[role], path);
  assert.ok(can("admin", SETTINGS_ROOT), "audit.read alone opens the hub");
  assert.ok(can("admin", `${SETTINGS_ROOT}/audit`));
  assert.ok(!can("admin", `${SETTINGS_ROOT}/roles`), "sections keep their own permission");
  assert.ok(can("manager", `${SETTINGS_ROOT}/roles`));
  assert.ok(!can("operations", `${SETTINGS_ROOT}/audit`));
  assert.ok(can("operations", SETTINGS_ROOT), "ai.read opens the hub for the AI protocol");
  assert.ok(!can("operations", `${SETTINGS_ROOT}/roles`));
  for (const gone of ["sla", "escalation", "lost-reasons", "templates", "fields", "documents", "thresholds", "events"]) {
    assert.ok(!isSettingsDetail(gone), `${gone} was removed`);
  }
  assert.ok(can("employee", `${SETTINGS_ROOT}/ai`), "agents can read the AI protocol");
  assert.ok(!can("employee", `${SETTINGS_ROOT}/audit`));
  assert.ok(can("gm", `${SETTINGS_ROOT}/profile`), "the GM edits their own profile");
  assert.ok(can("admin", `${SETTINGS_ROOT}/profile`), "the profile follows the hub rule");
  assert.ok(can("employee", `${SETTINGS_ROOT}/profile`), "agents with the hub edit their own profile");
  assert.ok(!can("admin", `${SETTINGS_ROOT}/ai`), "operators without ai.read don't see it");
  assert.ok(can("admin", `${SETTINGS_ROOT}/supportInbox`) && !can("admin", `${SETTINGS_ROOT}/support`), "operators answer, they don't ask");
  assert.ok(!can("gm", `${SETTINGS_ROOT}/supportInbox`), "company users never open the inbox");
  assert.ok(grants(["roles.read"], ["audit.read", "roles.read"]));
  assert.ok(!grants([], ["audit.read"]));
  assert.equal(homeFor("admin", DEMO_ROLE_PERMISSIONS.admin), "/admin/companies", "landing pages unchanged");
}

function permissionGroups() {
  const groups = groupPermissions(["users.write", "custom.thing", "users.read", "audit.read", "users.read"], ["users.read", "custom.thing"]);
  assert.deepEqual(groups.map((g) => g.domain), ["users", "audit", "custom"], "catalog order, unknown last");
  assert.deepEqual(groups[0].entries.map((e) => e.permission), ["users.read", "users.write"]);
  assert.equal(groups[0].granted, 1);
  assert.equal(groups[2].granted, 1);
  assert.equal(humanize("security_cleanup"), "Security cleanup");
}

function messages() {
  const en = JSON.parse(read("src/shared/i18n/messages/en.json"));
  const ar = JSON.parse(read("src/shared/i18n/messages/ar.json"));
  const leaves = (o: unknown, p = ""): string[] =>
    o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => leaves(v, p ? `${p}.${k}` : k)) : [p];
  assert.deepEqual(leaves(ar.settings).sort(), leaves(en.settings).sort(), "settings messages match in en and ar");
  for (const s of SETTINGS_SECTIONS) {
    for (const key of ["title", "hint", "description"]) assert.ok(en.settings.sections[s.id]?.[key], `settings.sections.${s.id}.${key}`);
  }
  for (const g of SETTINGS_GROUPS) assert.ok(en.settings.groups[g], `settings.groups.${g}`);
  for (const p of PERMISSIONS) {
    const [domain, action] = p.split(".");
    assert.ok(en.settings.roles.domains[domain], `domain label for ${domain}`);
    assert.ok(en.settings.roles.actions[action], `action label for ${action}`);
  }
  assert.equal(en.nav.roles, undefined, "Roles left the sidebar");
  assert.equal(en.nav.audit, undefined, "Audit left the sidebar");
  assert.equal(en.adminSettings, undefined, "removed sections left no messages behind");
}

function routesMoved() {
  const app = "src/app/[locale]/(shell)/admin";
  assert.ok(existsSync(root(`${app}/settings/[section]/page.tsx`)), "detail route exists");
  for (const [old, target] of [["roles", "/roles"], ["audit", "/audit"]] as const) {
    const src = read(`${app}/${old}/page.tsx`);
    assert.match(src, /redirect\(/, `/admin/${old} redirects`);
    assert.ok(src.includes(target), `/admin/${old} lands on settings${target}`);
  }
  const layout = read(`${app}/settings/layout.tsx`);
  assert.match(layout, /SettingsShellView/, "the list lives in a layout so it keeps its scroll between sections");
  assert.doesNotMatch(read(`${app}/settings/[section]/page.tsx`), /SettingsShellView|SettingsLayout/, "pages render only the detail");
  assert.ok(!existsSync(root("src/entities/adminconfig")), "unused settings API removed");
  assert.doesNotMatch(read("src/widgets/app-shell/model/nav.ts"), /label: "(roles|audit)"/, "no sidebar entries for roles/audit");
}

registry();
visibility();
guards();
permissionGroups();
messages();
routesMoved();
console.log("settings selftest OK");
