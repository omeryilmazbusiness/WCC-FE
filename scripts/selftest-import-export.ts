/**
 * Self-test: import/export screen — file gate, column options, mapping completeness, templates,
 * job phases/summary, the API contract (importable entities, upload cap) and en/ar keys
 * (pure, no I/O besides reading sources).
 * Run: npm run test:import-export
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  IMPORTABLE_ENTITY_TYPES,
  MAX_UPLOAD_BYTES,
  UNMAPPED,
  applyTemplate,
  cleanMapping,
  columnOptions,
  duplicateTargets,
  exportFileName,
  fileIssue,
  filterJobs,
  headerForValue,
  isImportable,
  jobPhase,
  mappingStatus,
  optionValueFor,
  resumeStep,
  sameMapping,
  sampleCsv,
  sampleFor,
  sortJobs,
  summarizeJobs,
} from "../src/entities/importexport/lib/import-plan.ts";
import type { FieldDef, ImportJob } from "../src/entities/importexport/model.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BE = path.join(root, "..", "WCC-BE");

const FIELDS: FieldDef[] = [
  { key: "full_name", label: "Full name", required: true, type: "string" },
  { key: "phone", label: "Phone", required: true, type: "phone" },
  { key: "email", label: "Email", required: false, type: "string" },
];

function job(over: Partial<ImportJob> = {}): ImportJob {
  return {
    id: "j1",
    branchId: "b",
    entityType: "customers",
    mode: "upsert",
    status: "completed",
    fileName: "c.csv",
    contentType: "text/csv",
    headers: ["Name", "Mobile", "Name", ""],
    mapping: {},
    previewRows: [
      ["", "", "x", ""],
      ["Alice", "+971501112233", "y", "z"],
    ],
    totalRows: 2,
    successCount: 2,
    failedCount: 0,
    skippedCount: 0,
    rollbackToken: "",
    errorMessage: "",
    createdAt: "2026-10-01T10:00:00Z",
    updatedAt: "2026-10-01T10:00:00Z",
    ...over,
  };
}

function files() {
  assert.equal(fileIssue("c.csv", 10), null);
  assert.equal(fileIssue(" C.XLSX ", 10), null);
  assert.equal(fileIssue("old.xls", 10), "type", "BIFF .xls is not parsed by the API");
  assert.equal(fileIssue("c.txt", 10), "type");
  assert.equal(fileIssue("c.csv", 0), "empty");
  assert.equal(fileIssue("c.csv", MAX_UPLOAD_BYTES), null);
  assert.equal(fileIssue("c.csv", MAX_UPLOAD_BYTES + 1), "size");
  assert.equal(exportFileName("payments", "2026-10-06"), "payments-2026-10-06.csv");
  const csv = sampleCsv(FIELDS);
  assert.ok(csv.startsWith("\uFEFF"), "BOM for Excel");
  assert.equal(csv.trim().replace("\uFEFF", ""), "full_name,phone,email");
}

function columns() {
  const opts = columnOptions(job().headers, (n) => `Column ${n}`);
  assert.deepEqual(
    opts.map((o) => o.label),
    ["Name", "Mobile", "Name (2)", "Column 4"],
  );
  assert.deepEqual(
    opts.map((o) => o.value),
    ["col:0", "col:1", "col:2", "col:3"],
  );
  assert.equal(optionValueFor(opts, "Mobile"), "col:1");
  assert.equal(optionValueFor(opts, undefined), UNMAPPED);
  assert.equal(optionValueFor(opts, "Missing"), UNMAPPED);
  assert.equal(headerForValue(opts, "col:1"), "Mobile");
  assert.equal(headerForValue(opts, UNMAPPED), "");
}

function mapping() {
  const headers = ["Name", "Mobile", "Mail"];
  assert.deepEqual(cleanMapping(FIELDS, { full_name: "Name", phone: "Gone", unknown: "Mail", email: "" }, headers), { full_name: "Name" });

  let s = mappingStatus(FIELDS, {}, headers);
  assert.equal(s.ready, false);
  assert.deepEqual(s.requiredMissing, ["full_name", "phone"]);

  s = mappingStatus(FIELDS, { full_name: "Name", email: "Mail" }, headers);
  assert.deepEqual(s.requiredMissing, ["phone"]);
  assert.equal(s.mapped, 2);
  assert.equal(s.total, 3);

  s = mappingStatus(FIELDS, { full_name: "Name", phone: "Mobile" }, headers);
  assert.equal(s.ready, true);

  assert.deepEqual([...duplicateTargets({ full_name: "Name", phone: "Name", email: "Mail" })], ["Name"]);
  assert.equal(duplicateTargets({ full_name: "Name", phone: "" }).size, 0);

  assert.equal(sampleFor(job(), "Name"), "Alice", "skips blank preview cells");
  assert.equal(sampleFor(job(), "Nope"), "");
  assert.equal(sampleFor(job(), undefined), "");

  const applied = applyTemplate(FIELDS, headers, { mapping: { full_name: "Name", phone: "Phone", email: "Mail" } });
  assert.deepEqual(applied.mapping, { full_name: "Name", email: "Mail" });
  assert.equal(applied.applied, 2);

  assert.ok(sameMapping({ a: "x", b: "" }, { a: "x" }));
  assert.ok(!sameMapping({ a: "x" }, { a: "y" }));
  assert.ok(!sameMapping({ a: "x" }, { a: "x", b: "z" }));
}

function jobs() {
  assert.equal(jobPhase(job()), "done");
  assert.equal(jobPhase(job({ failedCount: 1 })), "partial");
  assert.equal(jobPhase(job({ skippedCount: 1 })), "partial");
  assert.equal(jobPhase(job({ status: "failed" })), "failed");
  assert.equal(jobPhase(job({ status: "processing" })), "running");
  assert.equal(jobPhase(job({ status: "queued" })), "running");
  for (const s of ["uploaded", "mapped", "validated"] as const) assert.equal(jobPhase(job({ status: s })), "draft");

  assert.equal(resumeStep({ status: "uploaded" }), "match");
  assert.equal(resumeStep({ status: "mapped" }), "match");
  assert.equal(resumeStep({ status: "validated" }), "review");
  assert.equal(resumeStep({ status: "completed" }), null);

  const list = [
    job({ id: "a", createdAt: "2026-10-01T00:00:00Z", successCount: 5 }),
    job({ id: "b", createdAt: "2026-10-03T00:00:00Z", status: "failed", successCount: 0 }),
    job({ id: "c", createdAt: "2026-10-02T00:00:00Z", status: "mapped", successCount: 0, entityType: "bookings" }),
    job({ id: "d", createdAt: "2026-09-30T00:00:00Z", failedCount: 2, successCount: 3 }),
  ];
  assert.deepEqual(
    sortJobs(list).map((j) => j.id),
    ["b", "c", "a", "d"],
  );
  assert.deepEqual(
    filterJobs(list, "bookings").map((j) => j.id),
    ["c"],
  );
  assert.equal(filterJobs(list, "all").length, 4);
  const sum = summarizeJobs(list);
  assert.equal(sum.total, 4);
  assert.equal(sum.imported, 8);
  assert.equal(sum.attention, 2);
  assert.equal(sum.drafts, 1);
  assert.deepEqual(sum.byEntity, { customers: 3, bookings: 1 });
}

/** Constants that must match the API; skipped when the backend repo isn't checked out alongside. */
function contract() {
  const model = path.join(BE, "internal/domain/importexport/model.go");
  if (!fs.existsSync(model)) {
    console.warn("WCC-BE not found next to WCC-FE; skipping API contract checks");
    return;
  }
  const src = fs.readFileSync(model, "utf8");
  const importable = /func Importable\(e EntityType\) bool \{\s*return ([^\n]+)\n/.exec(src)?.[1] ?? "";
  const names: Record<string, string> = { EntityCustomers: "customers", EntityBookings: "bookings", EntityPayments: "payments", EntityDepartures: "departures" };
  const apiImportable = [...importable.matchAll(/Entity\w+/g)].map((m) => names[m[0]]).sort();
  assert.deepEqual([...IMPORTABLE_ENTITY_TYPES].sort(), apiImportable, "IMPORTABLE_ENTITY_TYPES mirrors importexport.Importable");
  assert.ok(isImportable("customers") && !isImportable("bookings"));

  const cap = /const MaxUploadBytes = (\d+) << (\d+)/.exec(src);
  assert.ok(cap, "MaxUploadBytes found");
  assert.equal(MAX_UPLOAD_BYTES, Number(cap[1]) * 2 ** Number(cap[2]), "MAX_UPLOAD_BYTES mirrors importexport.MaxUploadBytes");

  const catalog = fs.readFileSync(path.join(BE, "internal/domain/importexport/fields.go"), "utf8");
  const keys = new Set([...catalog.matchAll(/\{Key: "([a-z_]+)"/g)].map((m) => m[1]));
  for (const f of FIELDS) assert.ok(keys.has(f.key), `catalog has ${f.key}`);
  return keys;
}

function i18n(catalogKeys: Set<string> | undefined) {
  const load = (l: string) => JSON.parse(fs.readFileSync(path.join(root, `src/shared/i18n/messages/${l}.json`), "utf8"));
  const dir = path.join(root, "src/widgets/import-export-board/ui");
  const keys = new Set<string>();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
    for (const text of fs.readFileSync(path.join(dir, file), "utf8").split(/\n(?=(?:export )?function )/)) {
      const bindings = new Map<string, string>();
      for (const m of text.matchAll(/const (\w+) = useTranslations\("([^"]+)"\)/g)) bindings.set(m[1], m[2]);
      for (const [fn, ns] of bindings) {
        for (const m of text.matchAll(new RegExp(`\\b${fn}\\(\\s*"([^"]+)"`, "g"))) keys.add(`${ns}.${m[1]}`);
      }
    }
  }
  const ns = "importExport";
  for (const e of ["customers", "bookings", "payments", "departures"]) keys.add(`${ns}.entity.${e}`);
  for (const e of IMPORTABLE_ENTITY_TYPES) keys.add(`${ns}.entityHint.${e}`);
  for (const m of ["upsert", "create", "update"]) keys.add(`${ns}.mode.${m}`).add(`${ns}.modeHint.${m}`);
  for (const p of ["draft", "running", "done", "partial", "failed"]) {
    keys.add(`${ns}.phase.${p}`).add(`${ns}.resultTitle.${p}`).add(`${ns}.resultBody.${p}`);
  }
  for (const s of ["import", "export", "history"]) keys.add(`${ns}.section.${s}`).add(`${ns}.sectionHint.${s}`);
  keys.add(`${ns}.sectionHint.historyCount`).add(`${ns}.sample`);
  for (const s of ["label", "upload", "match", "review", "done"]) keys.add(`${ns}.steps.${s}`);
  for (const i of ["type", "size", "empty"]) keys.add(`${ns}.fileIssue.${i}`);
  for (const k of catalogKeys ?? []) keys.add(`${ns}.fields.${k}`);
  assert.ok(keys.size > 100, `found ${keys.size} keys`);

  for (const locale of ["en", "ar"]) {
    const messages = load(locale);
    for (const key of keys) {
      const value = key.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)?.[p], messages);
      assert.equal(typeof value, "string", `[${locale}] ${key}`);
    }
  }
}

files();
columns();
mapping();
jobs();
i18n(contract());
console.log("import-export selftest OK");
