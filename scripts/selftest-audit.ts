/**
 * Self-test: activity list — everyday titles, no technical IDs, EN/AR copy.
 * Run: pnpm test:audit
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  KNOWN_ACTIONS,
  auditArea,
  entityTypeForArea,
  fallbackActionTitle,
  hasReadableDetails,
  isKnownAction,
  readableChanges,
  readableFacts,
} from "../src/entities/audit/story.ts";
import type { AuditEvent } from "../src/entities/audit/model.ts";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

function event(patch: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: "e1",
    actor_id: "u1",
    actor_name: "Sara Ahmad",
    actor_type: "user",
    action: "auth.login",
    entity_type: "user",
    entity_id: "u1",
    branch_id: "b1",
    before: null,
    after: null,
    extra: { method: "password", session_id: "11111111-1111-4111-8111-111111111111" },
    ip: "10.0.0.4",
    user_agent: "Mozilla/5.0",
    session_id: "s1",
    request_id: "r1",
    created_at: "2026-10-26T08:00:00Z",
    ...patch,
  };
}

function story() {
  assert.equal(auditArea(event()), "auth");
  assert.equal(auditArea(event({ action: "booking.created", entity_type: "booking" })), "booking");
  assert.equal(entityTypeForArea("auth"), "user");
  assert.ok(isKnownAction("auth.login"));
  assert.ok(!isKnownAction("ops.encrypt_backfill"));
  assert.equal(fallbackActionTitle("ops.encrypt_backfill"), "Encrypt backfill");

  const login = event();
  assert.deepEqual(readableFacts(login.extra), [{ key: "method", value: "password" }]);
  assert.equal(readableChanges(login).length, 0);
  assert.ok(hasReadableDetails(login), "method is worth opening");
  assert.ok(!hasReadableDetails(event({ extra: { session_id: "11111111-1111-4111-8111-111111111111" } })));

  const booking = event({
    action: "booking.status_changed",
    entity_type: "booking",
    before: { status: "draft", owner_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", pax_count: 2 },
    after: { status: "confirmed", owner_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", pax_count: 2 },
    extra: {},
  });
  const changes = readableChanges(booking);
  assert.deepEqual(
    changes.map((c) => c.key),
    ["status"],
  );
  assert.ok(!changes.some((c) => c.key === "owner_id"));
  assert.ok(!changes.some((c) => c.key === "pax_count"), "unchanged fields stay off the list");
}

function wiring() {
  const section = read("src/widgets/settings-sections/ui/audit/audit-section.tsx");
  assert.match(section, /data-testid="audit-log"/);
  assert.doesNotMatch(section, /event\.ip/);
  assert.doesNotMatch(section, /listActions/);
  assert.doesNotMatch(section, /filters\.action/);
  assert.match(section, /hasReadableDetails/);
  const details = read("src/entities/audit/ui/audit-event-details.tsx");
  assert.doesNotMatch(details, /request_id|session_id|user_agent|entity_id/);
  assert.doesNotMatch(details, /JSON\.stringify/);
}

function messages() {
  const load = (l: string) =>
    JSON.parse(readFileSync(new URL(`../src/shared/i18n/messages/${l}.json`, import.meta.url), "utf8"));
  const leaves = (o: unknown, p = ""): string[] =>
    o && typeof o === "object"
      ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => leaves(v, p ? `${p}.${k}` : k))
      : [p];
  const en = load("en");
  const ar = load("ar");
  assert.deepEqual(leaves(ar.audit).sort(), leaves(en.audit).sort());
  assert.equal(en.audit.actions.auth.login, "Signed in");
  assert.equal(ar.audit.actions.auth.login, "سجّل الدخول");
  for (const action of KNOWN_ACTIONS) {
    const [domain, verb] = action.split(".");
    assert.ok(en.audit.actions[domain]?.[verb], `missing EN ${action}`);
    assert.ok(ar.audit.actions[domain]?.[verb], `missing AR ${action}`);
  }
  assert.equal(en.audit.filters.entityType, undefined);
  assert.equal(en.audit.details.requestId, undefined);
  assert.equal(en.settings.sections.audit.title, "Activity");
}

story();
wiring();
messages();
console.log("audit selftest OK");
