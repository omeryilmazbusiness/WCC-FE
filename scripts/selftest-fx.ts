/**
 * Self-test: accounting FX rates screen — exact change in basis points, exact inverse rates,
 * latest-per-pair snapshots, day grouping, freshness, and en/ar keys for every `t()` call in
 * the screen's components (pure, no I/O besides reading sources).
 * Run: npm run test:fx
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FX_TREND_POINTS,
  daysBetween,
  freshness,
  groupByDay,
  invertRate,
  localToday,
  pairOf,
  pairSnapshots,
  rateChangeBps,
  trendValues,
} from "../src/entities/fx/lib/insights.ts";
import type { FxRate } from "../src/entities/fx/model.ts";

let seq = 0;
function rate(base: string, quote: string, value: string, day: string, createdAt = ""): FxRate {
  seq += 1;
  return { id: `r${seq}`, base, quote, rate: value, effectiveDate: day, source: "", createdBy: "", createdAt: createdAt || `${day}T09:00:00Z` };
}

function change() {
  assert.equal(rateChangeBps("3.75", "3.76"), 27); // 26.67 → 27
  assert.equal(rateChangeBps("3.76", "3.75"), -27);
  assert.equal(rateChangeBps("100", "100.00000000"), 0);
  assert.equal(rateChangeBps("1", "2"), 10_000);
  assert.equal(rateChangeBps("2", "1"), -5_000);
  assert.equal(rateChangeBps("8", "8.0001"), 0); // 0.125 bps rounds to 0
  assert.equal(rateChangeBps("1", "1.00005"), 1); // exactly 0.5 bps → away from zero
  assert.equal(rateChangeBps("1", "0.99995"), -1);
  assert.equal(rateChangeBps("0", "1"), null);
  assert.equal(rateChangeBps("abc", "1"), null);
  assert.equal(rateChangeBps("1", "-1"), null);
  // Large SYP-style rates stay exact (no float drift).
  assert.equal(rateChangeBps("13800.12345678", "13938.12469134"), 100);
}

function inverse() {
  assert.equal(invertRate("3.75"), "0.266667");
  assert.equal(invertRate("3.75", 8), "0.26666667");
  assert.equal(invertRate("0.25", 2), "4.00");
  assert.equal(invertRate("2", 0), "1");
  assert.equal(invertRate("3", 0), "0");
  assert.equal(invertRate("138.375", 6), "0.007227");
  assert.equal(invertRate("0"), null);
  assert.equal(invertRate(""), null);
  assert.equal(invertRate("1.5e3"), null);
}

function snapshots() {
  const rows = [
    rate("USD", "SAR", "3.75", "2026-10-01"),
    rate("USD", "SAR", "3.76", "2026-10-05"),
    rate("EUR", "SAR", "4.10", "2026-10-03"),
    rate("USD", "SAR", "3.74", "2026-09-30"),
    rate("USD", "TRY", "34.1", "2026-10-05"),
  ];
  const out = pairSnapshots(rows);
  assert.deepEqual(out.map((s) => s.pair), ["USD/SAR", "USD/TRY", "EUR/SAR"]);
  const usd = out[0];
  assert.equal(usd.latest.rate, "3.76");
  assert.equal(usd.previous?.rate, "3.75");
  assert.equal(usd.changeBps, 27);
  assert.deepEqual(usd.trend.map((r) => r.effectiveDate), ["2026-09-30", "2026-10-01", "2026-10-05"]);
  assert.equal(out[2].previous, null);
  assert.equal(out[2].changeBps, null);
  assert.equal(pairOf(rows[0]), "USD/SAR");

  const many = Array.from({ length: 20 }, (_, i) =>
    rate("USD", "SYP", String(13000 + i), `2026-09-${String(i + 1).padStart(2, "0")}`),
  );
  const [syp] = pairSnapshots(many);
  assert.equal(syp.trend.length, FX_TREND_POINTS);
  assert.equal(syp.trend[syp.trend.length - 1].rate, "13019");
  assert.deepEqual(trendValues(syp.trend).slice(0, 2), [13008, 13009]);

  // Same day: the later createdAt wins.
  const sameDay = pairSnapshots([
    rate("USD", "SAR", "3.70", "2026-10-05", "2026-10-05T08:00:00Z"),
    rate("USD", "SAR", "3.80", "2026-10-05", "2026-10-05T10:00:00Z"),
  ]);
  assert.equal(sameDay[0].latest.rate, "3.80");
  assert.deepEqual(pairSnapshots([]), []);
}

function grouping() {
  const rows = [
    rate("USD", "SAR", "3.76", "2026-10-05"),
    rate("USD", "TRY", "34.1", "2026-10-05"),
    rate("EUR", "SAR", "4.10", "2026-10-03"),
  ];
  const groups = groupByDay(rows);
  assert.deepEqual(groups.map((g) => [g.day, g.items.length]), [["2026-10-05", 2], ["2026-10-03", 1]]);
  assert.deepEqual(groupByDay([]), []);
}

function dates() {
  assert.equal(daysBetween("2026-10-05", "2026-10-05"), 0);
  assert.equal(daysBetween("2026-10-01", "2026-10-05"), 4);
  assert.equal(daysBetween("2026-02-28", "2026-03-01"), 1);
  assert.equal(daysBetween("2026-10-06", "2026-10-05"), -1);
  assert.equal(daysBetween("junk", "2026-10-05"), Number.POSITIVE_INFINITY);
  assert.equal(freshness("2026-10-05", "2026-10-05"), "today");
  assert.equal(freshness("2026-10-06", "2026-10-05"), "today");
  assert.equal(freshness("2026-10-02", "2026-10-05"), "recent");
  assert.equal(freshness("2026-10-01", "2026-10-05"), "stale");
  assert.equal(freshness("junk", "2026-10-05"), "stale");
  assert.equal(localToday(new Date(2026, 0, 9, 23, 30)), "2026-01-09");
}

function i18n() {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const load = (l: string) =>
    JSON.parse(fs.readFileSync(path.join(root, `src/shared/i18n/messages/${l}.json`), "utf8"));
  const files = [
    "src/widgets/fx-rates-board/ui/fx-rates-board.tsx",
    "src/widgets/fx-rates-board/ui/pair-card.tsx",
    "src/widgets/fx-rates-board/ui/live-market-card.tsx",
    "src/widgets/fx-rates-board/ui/rate-history.tsx",
    "src/features/convert-currency/ui/fx-converter.tsx",
    "src/features/manage-fx-rates/ui/fx-rate-dialog.tsx",
    "src/features/manage-fx-rates/ui/delete-fx-rate-button.tsx",
  ];
  const keys = new Set<string>();
  for (const file of files) {
    const src = fs.readFileSync(path.join(root, file), "utf8");
    // Each `const x = useTranslations("ns")` binds a translator name to a namespace.
    const bindings = new Map<string, string>();
    for (const m of src.matchAll(/const (\w+) = useTranslations\("([^"]+)"\)/g)) bindings.set(m[1], m[2]);
    for (const [fn, ns] of bindings) {
      for (const m of src.matchAll(new RegExp(`\\b${fn}\\(\\s*"([^"]+)"`, "g"))) keys.add(`${ns}.${m[1]}`);
      for (const m of src.matchAll(new RegExp(`\\b${fn}\\(\\s*\`([^\`$]+)\\$\\{`, "g"))) keys.add(`${ns}.${m[1]}*`);
    }
  }
  assert.ok(keys.size > 40, `expected many keys, found ${keys.size}`);

  for (const locale of ["en", "ar"]) {
    const messages = load(locale);
    for (const key of keys) {
      const prefix = key.endsWith("*");
      const parts = (prefix ? key.slice(0, -1).replace(/\.$/, "") : key).split(".");
      const value = parts.reduce<unknown>((o, p) => (o as Record<string, unknown>)?.[p], messages);
      if (prefix) assert.equal(typeof value, "object", `[${locale}] ${key}`);
      else assert.equal(typeof value, "string", `[${locale}] ${key}`);
    }
    for (const d of ["up", "down", "flat"]) assert.equal(typeof messages.fx.pairs.direction[d], "string");
    for (const e of ["required", "format", "precision", "positive", "currency", "samePair"]) {
      assert.equal(typeof messages.fx.errors[e], "string", `[${locale}] fx.errors.${e}`);
    }
  }
}

change();
inverse();
snapshots();
grouping();
dates();
i18n();
console.log("fx selftest OK");
