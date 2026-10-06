/**
 * Self-test: missing documents screen — summary, filtering, priority sort, departure urgency,
 * spreadsheet-safe CSV, API mapping of the enriched rows and en/ar keys (pure, no I/O besides
 * reading sources).
 * Run: npm run test:missing-docs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CRITICAL_DAYS,
  SOON_DAYS,
  daysUntil,
  departureUrgency,
  filterMissing,
  missingDocsCsv,
  sortMissing,
  summarizeMissing,
} from "../src/entities/document/lib/missing-docs.ts";
import type { MissingDocsRow } from "../src/entities/document/model.ts";

function row(over: Partial<MissingDocsRow>): MissingDocsRow {
  return {
    bookingId: "b-" + Math.random().toString(16).slice(2, 8),
    participantId: null,
    customerId: "c1",
    missingKinds: [],
    refCode: "",
    customerName: "",
    customerNameAr: "",
    bookingStatus: "confirmed",
    paxCount: 1,
    ...over,
  };
}

const rows = [
  row({ bookingId: "b1", refCode: "BK-000002", customerName: "Ahmad Saleh", customerNameAr: "أحمد صالح", missingKinds: ["passport", "visa"], paxCount: 3 }),
  row({ bookingId: "b2", refCode: "BK-000001", customerName: "Lina Haddad", missingKinds: ["photo"], paxCount: 2 }),
  row({ bookingId: "b3", refCode: "BK-000003", customerName: "Omar Nasser", missingKinds: ["visa"], paxCount: 0 }),
];

function summary() {
  const s = summarizeMissing(rows);
  assert.equal(s.bookings, 3);
  assert.equal(s.travellers, 6); // 3 + 2 + max(0, 1)
  assert.equal(s.gaps, 4);
  assert.deepEqual(s.byKind, [
    { kind: "visa", count: 2 },
    { kind: "passport", count: 1 },
    { kind: "photo", count: 1 },
  ]);
  assert.deepEqual(summarizeMissing([]), { bookings: 0, travellers: 0, gaps: 0, byKind: [] });
  // Duplicate kinds on one booking count once per booking.
  assert.deepEqual(summarizeMissing([row({ missingKinds: ["visa", "visa"] })]).byKind, [{ kind: "visa", count: 1 }]);
}

function filtering() {
  assert.deepEqual(filterMissing(rows, { kind: "visa" }).map((r) => r.bookingId), ["b1", "b3"]);
  assert.deepEqual(filterMissing(rows, { query: "lina" }).map((r) => r.bookingId), ["b2"]);
  assert.deepEqual(filterMissing(rows, { query: "أحمد" }).map((r) => r.bookingId), ["b1"]);
  assert.deepEqual(filterMissing(rows, { query: "bk-000003" }).map((r) => r.bookingId), ["b3"]);
  assert.deepEqual(filterMissing(rows, { kind: "visa", query: "omar" }).map((r) => r.bookingId), ["b3"]);
  assert.equal(filterMissing(rows, { kind: " ", query: "  " }).length, 3);
  assert.equal(filterMissing(rows, { kind: "receipt" }).length, 0);
}

function sorting() {
  assert.deepEqual(sortMissing(rows).map((r) => r.bookingId), ["b1", "b2", "b3"]);
  const tie = [row({ bookingId: "x", refCode: "BK-9", missingKinds: ["a"], paxCount: 1 }), row({ bookingId: "y", refCode: "BK-1", missingKinds: ["a"], paxCount: 1 })];
  assert.deepEqual(sortMissing(tie).map((r) => r.bookingId), ["y", "x"]);
  assert.deepEqual(rows.map((r) => r.bookingId), ["b1", "b2", "b3"], "input untouched");
}

function urgency() {
  assert.equal(daysUntil("2026-10-13", "2026-10-06"), 7);
  assert.equal(daysUntil("2026-10-13T00:00:00Z", "2026-10-06"), 7);
  assert.equal(daysUntil("2026-10-01", "2026-10-06"), -5);
  assert.equal(daysUntil("", "2026-10-06"), null);
  assert.equal(departureUrgency(null), "planned");
  assert.equal(departureUrgency(-1), "past");
  assert.equal(departureUrgency(0), "critical");
  assert.equal(departureUrgency(CRITICAL_DAYS), "critical");
  assert.equal(departureUrgency(CRITICAL_DAYS + 1), "soon");
  assert.equal(departureUrgency(SOON_DAYS), "soon");
  assert.equal(departureUrgency(SOON_DAYS + 1), "planned");
}

function csv() {
  const out = missingDocsCsv(
    [
      row({ bookingId: "b1", refCode: "BK-000002", customerName: 'Ahmad "Abu Ali", Saleh', missingKinds: ["passport", "visa"], paxCount: 3 }),
      row({ bookingId: "b9", customerName: "=HYPERLINK(\"x\")", missingKinds: ["photo"], bookingStatus: "" }),
    ],
    {
      headers: ["Booking", "Customer", "Travellers", "Status", "Missing", "Booking ID"],
      kind: (k) => ({ passport: "Passport", visa: "Visa", photo: "Photo" })[k] ?? k,
      status: (s) => (s === "confirmed" ? "Confirmed" : s),
    },
  );
  assert.ok(out.startsWith("\uFEFF"), "BOM for Excel");
  const lines = out.slice(1).split("\r\n");
  assert.equal(lines[0], "Booking,Customer,Travellers,Status,Missing,Booking ID");
  assert.equal(lines[1], 'BK-000002,"Ahmad ""Abu Ali"", Saleh",3,Confirmed,"Passport; Visa",b1');
  assert.equal(lines[2], `b9,"'=HYPERLINK(""x"")",1,,Photo,b9`, "formula injection neutralised");
  assert.equal(lines.length, 3);
}

async function mapping() {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const src = fs.readFileSync(path.join(root, "src/entities/document/api.ts"), "utf8");
  for (const field of ["ref_code", "customer_name", "customer_name_ar", "booking_status", "pax_count"]) {
    assert.ok(src.includes(`raw.${field}`), `mapper reads ${field}`);
  }
}

function i18n() {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const load = (l: string) => JSON.parse(fs.readFileSync(path.join(root, `src/shared/i18n/messages/${l}.json`), "utf8"));
  const files = [
    "src/widgets/missing-docs-board/ui/missing-docs-board.tsx",
    "src/widgets/missing-docs-board/ui/departure-picker.tsx",
    "src/widgets/missing-docs-board/ui/missing-row.tsx",
  ];
  const keys = new Set<string>();
  for (const file of files) {
    // Translators are scoped per component, so scan each top-level function on its own.
    for (const text of fs.readFileSync(path.join(root, file), "utf8").split(/\n(?=(?:export )?function )/)) {
      const bindings = new Map<string, string>();
      for (const m of text.matchAll(/const (\w+) = useTranslations\("([^"]+)"\)/g)) bindings.set(m[1], m[2]);
      for (const [fn, ns] of bindings) {
        for (const m of text.matchAll(new RegExp(`\\b${fn}\\(\\s*"([^"]+)"`, "g"))) keys.add(`${ns}.${m[1]}`);
      }
    }
  }
  for (const u of ["past", "critical", "soon", "planned"]) keys.add(`missingDocs.banner.${u}`);
  assert.ok(keys.size > 35, `found ${keys.size} keys`);
  for (const locale of ["en", "ar"]) {
    const messages = load(locale);
    for (const key of keys) {
      const value = key.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)?.[p], messages);
      assert.equal(typeof value, "string", `[${locale}] ${key}`);
    }
  }
}

summary();
filtering();
sorting();
urgency();
csv();
await mapping();
i18n();
console.log("missing-docs selftest OK");
