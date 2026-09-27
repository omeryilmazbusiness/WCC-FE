/**
 * Self-test: audit `diffObjects`, passport masking / "never resend the masked value",
 * audit query building and the anonymize confirmation rules (pure, no I/O).
 * Run: npm run test:privacy
 */

import assert from "node:assert/strict";
import { deepEqual, diffObjects, formatDiffValue } from "../src/shared/lib/diff-objects.ts";
import {
  isMaskedSecret,
  maskedLast4,
  passportPatchValue,
  toMaskedSecret,
} from "../src/shared/lib/pii.ts";
import {
  auditSearchParams,
  endOfDayRfc3339,
  startOfDayRfc3339,
} from "../src/entities/audit/model.ts";
import {
  canSubmitAnonymize,
  isNameConfirmed,
  isReasonValid,
} from "../src/features/anonymize-customer/model/anonymize.ts";

function diff() {
  const d = diffObjects(
    { name: "Ahmed", phone: "1", tags: ["a", "b"], prefs: { lang: "ar", sms: true }, gone: 1 },
    { name: "Ahmed", phone: "2", tags: ["a", "b"], prefs: { sms: true, lang: "ar" }, email: "x@y" },
  );
  assert.deepEqual(d.added, ["email"]);
  assert.deepEqual(d.removed, ["gone"]);
  assert.deepEqual(d.changed, ["phone"]);
  assert.deepEqual(
    d.entries.map((e) => [e.key, e.kind]),
    [
      ["email", "added"],
      ["gone", "removed"],
      ["name", "unchanged"],
      ["phone", "changed"],
      ["prefs", "unchanged"],
      ["tags", "unchanged"],
    ],
  );
  const phone = d.entries.find((e) => e.key === "phone")!;
  assert.equal(phone.before, "1");
  assert.equal(phone.after, "2");
  const email = d.entries.find((e) => e.key === "email")!;
  assert.ok(!("before" in email));
  const gone = d.entries.find((e) => e.key === "gone")!;
  assert.ok(!("after" in gone));

  // create / delete snapshots
  assert.deepEqual(diffObjects(null, { a: 1, b: 2 }).added, ["a", "b"]);
  assert.deepEqual(diffObjects({ a: 1 }, null).removed, ["a"]);
  assert.deepEqual(diffObjects(null, null).entries, []);

  // null vs missing vs nested changes
  const n = diffObjects({ a: null, nested: { x: [1, 2] } }, { nested: { x: [1, 3] } });
  assert.deepEqual(n.removed, ["a"]);
  assert.deepEqual(n.changed, ["nested"]);
  assert.deepEqual(diffObjects({ a: null }, { a: undefined }).changed, ["a"]);

  assert.equal(deepEqual([1, { a: 1 }], [1, { a: 1 }]), true);
  assert.equal(deepEqual([1, 2], [2, 1]), false);
  assert.equal(deepEqual({ a: 1 }, { a: 1, b: undefined }), false);

  assert.equal(formatDiffValue(undefined), "");
  assert.equal(formatDiffValue(null), "null");
  assert.equal(formatDiffValue("x"), "x");
  assert.equal(formatDiffValue({ a: 1 }), '{"a":1}');
}

function passport() {
  assert.equal(isMaskedSecret("••••1234"), true);
  assert.equal(isMaskedSecret("A12****78"), true);
  assert.equal(isMaskedSecret("A1234567"), false);
  assert.equal(isMaskedSecret(""), false);
  assert.equal(isMaskedSecret(undefined), false);

  // server-masked values pass through; a plain value is never displayed in full
  assert.equal(toMaskedSecret("••••1234", "1234"), "••••1234");
  assert.equal(toMaskedSecret("A1234567"), "••••4567");
  assert.equal(toMaskedSecret("", "4321"), "••••4321");
  assert.equal(toMaskedSecret("A12"), "••••");
  assert.equal(toMaskedSecret(""), "");
  assert.equal(toMaskedSecret(null, null), "");

  assert.equal(maskedLast4("••••1234"), "1234");
  assert.equal(maskedLast4(""), "");

  // the edit form must never send the masked placeholder back as a new passport
  assert.equal(passportPatchValue(""), undefined);
  assert.equal(passportPatchValue("   "), undefined);
  assert.equal(passportPatchValue(undefined), undefined);
  assert.equal(passportPatchValue("••••1234"), undefined);
  assert.equal(passportPatchValue("A12****78"), undefined);
  assert.equal(passportPatchValue(" B7654321 "), "B7654321");
  assert.equal(JSON.stringify({ passport_no: passportPatchValue("••••1234") }), "{}");
}

function auditQuery() {
  assert.equal(auditSearchParams({}).toString(), "");
  assert.equal(
    auditSearchParams(
      { entityType: "customer", action: " customer.updated ", entityId: "", actorId: "u1" },
      { limit: 50, offset: 100 },
    ).toString(),
    "actor_id=u1&entity_type=customer&action=customer.updated&limit=50&offset=100",
  );

  const from = startOfDayRfc3339("2026-09-27")!;
  const to = endOfDayRfc3339("2026-09-27")!;
  assert.match(from, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.match(to, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.equal(Date.parse(to) - Date.parse(from), (24 * 3600 - 1) * 1000);
  assert.equal(startOfDayRfc3339("not-a-date"), undefined);
}

function anonymize() {
  assert.equal(isReasonValid("too short"), false);
  assert.equal(isReasonValid("  123456789  "), false);
  assert.equal(isReasonValid("KVKK request"), true);

  assert.equal(isNameConfirmed("ahmed  al-rashid ", "Ahmed Al-Rashid"), true);
  assert.equal(isNameConfirmed("Ahmed", "Ahmed Al-Rashid"), false);
  assert.equal(isNameConfirmed("", ""), false);
  assert.equal(isNameConfirmed("أحمد الراشد", "أحمد الراشد"), true);

  assert.equal(
    canSubmitAnonymize({ reason: "KVKK erasure request", typedName: "Ahmed Al-Rashid", customerName: "Ahmed Al-Rashid" }),
    true,
  );
  assert.equal(
    canSubmitAnonymize({ reason: "short", typedName: "Ahmed Al-Rashid", customerName: "Ahmed Al-Rashid" }),
    false,
  );
  assert.equal(
    canSubmitAnonymize({ reason: "KVKK erasure request", typedName: "Ahmed", customerName: "Ahmed Al-Rashid" }),
    false,
  );
}

diff();
passport();
auditQuery();
anonymize();
console.log("selftest-privacy: OK");
