/**
 * Self-test: help requests from Settings to the platform team — draft rules that mirror the API,
 * response mapping, request shapes, who can send / answer, settings wiring and en/ar coverage.
 * Run: npm run test:support
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  SUPPORT_LIMITS,
  SUPPORT_STATUSES,
  draftIssues,
  isSupportStatus,
  normalizeDraft,
} from "../src/entities/support/model.ts";
import { SUPPORT_ENDPOINTS, createSupportApi, inboxPath, parseInbound, parseInbox, parseSupportRequest } from "../src/entities/support/api.ts";
import type { HttpClient, HttpRequestInit } from "../src/shared/api/http-client.ts";
import { DEMO_ROLE_PERMISSIONS, PERMISSIONS } from "../src/shared/config/permissions.ts";
import { findSettingsSection, visibleSettings } from "../src/shared/config/settings.ts";

const root = (p: string) => new URL(`../${p}`, import.meta.url);
const read = (p: string) => readFileSync(root(p), "utf8");

function drafts() {
  assert.deepEqual(normalizeDraft({ title: "  Export \t fails\n now ", description: "\n Steps:\n1. open\n " }), {
    title: "Export fails now",
    description: "Steps:\n1. open",
  });
  assert.deepEqual(draftIssues({ title: "", description: "" }), { title: "short", description: "short" });
  assert.deepEqual(draftIssues({ title: "Help", description: "0123456789" }), {}, "limits are inclusive");
  assert.deepEqual(draftIssues({ title: "   Hi    ", description: "   short   " }), { title: "short", description: "short" }, "spaces don't count");
  assert.equal(draftIssues({ title: "x".repeat(SUPPORT_LIMITS.titleMax + 1), description: "long enough text" }).title, "long");
  assert.equal(draftIssues({ title: "fine title", description: "y".repeat(SUPPORT_LIMITS.descriptionMax + 1) }).description, "long");
  assert.deepEqual(draftIssues({ title: "😀😀😀😀", description: "😀".repeat(10) }), {}, "characters, not UTF-16 units");
  assert.ok(isSupportStatus("in_progress") && !isSupportStatus("closed") && !isSupportStatus(3));
  assert.deepEqual([...SUPPORT_STATUSES], ["open", "in_progress", "resolved"]);
}

function mapping() {
  const r = parseSupportRequest({
    id: "a1", number: "7", title: "T", description: "D", status: "resolved", page: "/x",
    admin_note: "done", created_at: "2026-10-07T10:00:00Z", updated_at: "2026-10-07T11:00:00Z", resolved_at: "2026-10-07T11:00:00Z",
  });
  assert.equal(r.number, 7);
  assert.equal(r.adminNote, "done");
  assert.equal(r.resolvedAt, "2026-10-07T11:00:00Z");
  const junk = parseSupportRequest(null);
  assert.equal(junk.status, "open", "unknown status falls back to open");
  assert.equal(junk.resolvedAt, null);
  assert.equal(junk.adminNote, "");

  const inbound = parseInbound({ id: "b", status: "weird", requester: { name: "Gm", email: "gm@x", role: "gm" }, company: "Acme", locale: "fr" });
  assert.equal(inbound.status, "open");
  assert.equal(inbound.locale, "en");
  assert.deepEqual(inbound.requester, { name: "Gm", email: "gm@x", role: "gm" });

  const inbox = parseInbox({ items: [{ id: "1" }, { id: "2" }], total: 9, counts: { open: 4, resolved: "5" } });
  assert.equal(inbox.items.length, 2);
  assert.equal(inbox.total, 9);
  assert.deepEqual(inbox.counts, { open: 4, in_progress: 0, resolved: 5 }, "counts are zero-filled");
  assert.deepEqual(parseInbox(undefined), { items: [], total: 0, counts: { open: 0, in_progress: 0, resolved: 0 } });

  assert.equal(inboxPath({}), SUPPORT_ENDPOINTS.inbox);
  assert.equal(inboxPath({ status: "open", q: "  50% & co ", limit: 50, offset: 0 }), `${SUPPORT_ENDPOINTS.inbox}?status=open&q=50%25+%26+co&limit=50`);
}

async function requests() {
  const calls: { path: string; init?: HttpRequestInit }[] = [];
  const replies: unknown[] = [];
  const client: HttpClient = {
    async request<T>(path: string, init?: HttpRequestInit) {
      calls.push({ path, init });
      return replies.shift() as T;
    },
  } as HttpClient;
  const api = createSupportApi(client);

  replies.push({ id: "n", number: 3, title: "Export fails", status: "open" });
  const created = await api.submit({ title: "  Export   fails ", description: "  It breaks every time.  " }, "ar");
  assert.equal(created.number, 3);
  assert.equal(calls[0].path, "/support/requests");
  assert.equal(calls[0].init?.method, "POST");
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
    title: "Export fails",
    description: "It breaks every time.",
    context: { locale: "ar" },
  }, "the draft is normalized before sending");

  replies.push([{ id: "1" }, { id: "2" }]);
  assert.equal((await api.mine()).length, 2);
  assert.equal(calls[1].path, "/support/requests/mine");
  replies.push(null);
  assert.deepEqual(await api.mine(), [], "a non-list reply is empty, never a crash");

  replies.push({ items: [], total: 0, counts: {} });
  await api.inbox({ status: "resolved", q: "acme" });
  assert.equal(calls[3].path, "/platform/support/requests?status=resolved&q=acme");

  replies.push({ id: "x/1", status: "resolved", admin_note: "Fixed" });
  const updated = await api.update("x/1", "resolved", "  Fixed  ");
  assert.equal(updated.adminNote, "Fixed");
  assert.equal(calls[4].path, "/platform/support/requests/x%2F1", "ids are path-encoded");
  assert.equal(calls[4].init?.method, "PATCH");
  assert.deepEqual(JSON.parse(String(calls[4].init?.body)), { status: "resolved", note: "Fixed" });

  replies.push({ id: "y", status: "in_progress" });
  await api.update("y", "in_progress");
  assert.deepEqual(JSON.parse(String(calls[5].init?.body)), { status: "in_progress" }, "no note means the note is kept");
}

function access() {
  assert.ok(PERMISSIONS.includes("support.write") && PERMISSIONS.includes("support.manage"));
  for (const role of ["gm", "manager", "employee", "finance", "operations"] as const) {
    const perms = DEMO_ROLE_PERMISSIONS[role];
    assert.ok(perms.includes("support.write"), `${role} can send help requests`);
    assert.ok(!perms.includes("support.manage"), `${role} never sees other companies' requests`);
  }
  assert.ok(DEMO_ROLE_PERMISSIONS.admin.includes("support.manage"));
  assert.ok(!DEMO_ROLE_PERMISSIONS.admin.includes("support.write"), "the platform team answers, it doesn't ask");

  const ids = (role: keyof typeof DEMO_ROLE_PERMISSIONS) => visibleSettings(DEMO_ROLE_PERMISSIONS[role]).flatMap((g) => g.sections.map((s) => s.id));
  assert.ok(ids("employee").includes("support"));
  assert.ok(ids("admin").includes("supportInbox") && !ids("admin").includes("support"));
  assert.equal(findSettingsSection("support")?.group, "support");
  assert.equal(findSettingsSection("supportInbox")?.group, "support");
}

function wiring() {
  const body = read("src/widgets/settings-sections/ui/settings-section-body.tsx");
  assert.match(body, /case "support":\s*return <SupportSection \/>/);
  assert.match(body, /case "supportInbox":\s*return <SupportInboxSection \/>/);
  const look = read("src/widgets/settings-hub/ui/section-look.ts");
  assert.match(look, /support: \{ icon: LifeBuoy/);
  assert.match(look, /supportInbox: \{ icon: Inbox/);
  for (const f of [
    "src/features/submit-support-request/index.ts",
    "src/features/manage-support-request/index.ts",
    "src/entities/support/index.ts",
  ]) assert.ok(existsSync(root(f)), f);

  const form = read("src/features/submit-support-request/ui/support-request-form.tsx");
  assert.match(form, /draftIssues\(draft\)/, "the form uses the shared draft rules");
  assert.match(form, /if \(!valid \|\| sending\) return;/, "no double submits, no invalid submits");
  assert.match(form, /feedback\.error\(err/, "API errors (incl. rate limits) reach the user");
  const section = read("src/widgets/settings-sections/ui/support/support-section.tsx");
  assert.match(section, /cacheKey: \["support-mine"\]/, "revisits show the list instantly");
  assert.match(section, /query\.setData/, "a sent request appears without a refetch");
  const inbox = read("src/widgets/settings-sections/ui/support/support-inbox-section.tsx");
  assert.match(inbox, /useDebouncedValue\(search\.trim\(\), 300\)/, "search waits for a typing pause before calling the API");
  assert.match(inbox, /Math\.min\(l \+ PAGE, 100\)/, "pages stay within the API limit");
}

function messages() {
  const en = JSON.parse(read("src/shared/i18n/messages/en.json"));
  const ar = JSON.parse(read("src/shared/i18n/messages/ar.json"));
  const leaves = (o: unknown, p = ""): string[] =>
    o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => leaves(v, p ? `${p}.${k}` : k)) : [p];
  assert.deepEqual(leaves(ar.support).sort(), leaves(en.support).sort(), "support messages match in en and ar");
  for (const lang of [en, ar]) {
    for (const s of SUPPORT_STATUSES) assert.ok(lang.support.status[s], `support.status.${s}`);
    for (const field of ["title", "description"]) {
      for (const issue of ["short", "long"]) assert.ok(lang.support.form.issues[field][issue], `issues.${field}.${issue}`);
    }
    assert.match(lang.support.form.sent, /\{number\}/);
    assert.match(lang.settings.supportInbox.footer, /\{shown\}.*\{total\}/);
    assert.ok(lang.settings.roles.domains.support);
  }
}

drafts();
mapping();
await requests();
access();
wiring();
messages();
console.log("support selftest OK");
