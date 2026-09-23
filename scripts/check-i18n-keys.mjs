#!/usr/bin/env node
/**
 * Self-test: static next-intl keys for the Targets board (and EN/AR parity)
 * must resolve. Exit 1 on missing keys.
 *
 * Usage: node scripts/check-i18n-keys.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MSG_DIR = path.join(ROOT, "src/shared/i18n/messages");

function loadMessages(locale) {
  return JSON.parse(
    fs.readFileSync(path.join(MSG_DIR, `${locale}.json`), "utf8"),
  );
}

function hasPath(obj, dotted) {
  const parts = dotted.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object" || !(p in cur)) return false;
    cur = cur[p];
  }
  return typeof cur === "string" || typeof cur === "number";
}

function flatten(obj, prefix = "", out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, p, out);
    else out.add(p);
  }
  return out;
}

const en = loadMessages("en");
const ar = loadMessages("ar");
const missing = [];

if (!en.targets || !ar.targets) {
  missing.push("namespace targets missing in en and/or ar");
}

if (!hasPath(en, "nav.targets") || !hasPath(ar, "nav.targets")) {
  missing.push("nav.targets missing in en and/or ar");
}

const board = path.join(
  ROOT,
  "src/widgets/target-performance/ui/target-performance-board.tsx",
);

if (!fs.existsSync(board)) {
  console.error("Targets board not found — skip strict audit");
  process.exit(1);
}

const src = fs.readFileSync(board, "utf8");
const keys = [...src.matchAll(/\bt\(\s*["']([^"'`]+)["']\s*\)/g)].map(
  (m) => m[1],
);

for (const key of keys) {
  const full = `targets.${key}`;
  if (!hasPath(en, full)) missing.push(`[en] ${full}`);
  if (!hasPath(ar, full)) missing.push(`[ar] ${full}`);
}

for (const st of ["ahead", "on_track", "behind", "placeholder"]) {
  const full = `targets.status.${st}`;
  if (!hasPath(en, full)) missing.push(`[en] ${full}`);
  if (!hasPath(ar, full)) missing.push(`[ar] ${full}`);
}

const enT = flatten(en.targets || {}, "targets");
const arT = flatten(ar.targets || {}, "targets");
for (const k of enT) {
  if (!arT.has(k)) missing.push(`[parity-ar] ${k}`);
}
for (const k of arT) {
  if (!enT.has(k)) missing.push(`[parity-en] ${k}`);
}

const uniq = [...new Set(missing)];
if (uniq.length) {
  console.error("i18n key check FAILED:");
  for (const m of uniq) console.error(`  ${m}`);
  process.exit(1);
}

console.log(
  `i18n key check OK — ${keys.length} board keys, ${enT.size} targets leaves, en/ar parity`,
);
