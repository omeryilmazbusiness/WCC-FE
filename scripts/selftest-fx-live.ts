/**
 * Self-test: live FX board — exact decimal multiply / divide / rounding, significant-digit
 * rate formatting, board ordering (pinned first), derived / stale badges, board health,
 * footer attribution, mapper tolerance and adopt error classification (pure, no I/O).
 * Run: npm run test:fx-live
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  divideDecimal,
  formatDecimalString,
  formatRate,
  isPositiveDecimal,
  multiplyDecimal,
  normalizeDecimalInput,
  roundDecimal,
  roundSignificant,
} from "../src/entities/fx-live/lib/decimal.ts";
import {
  EXCHANGE_RATE_API_SOURCE,
  boardHealth,
  footerSources,
  headline,
  isOlderThan,
  mapLiveBoard,
  orderQuotes,
  quoteBadges,
  safeUrl,
  usableMid,
  type FxLiveQuote,
  type FxLiveSide,
} from "../src/entities/fx-live/model.ts";
import { baseCurrencyOptions, rebaseQuotes } from "../src/entities/fx-live/lib/rebase.ts";
import { classifyAdoptError } from "../src/features/adopt-live-fx-rate/model/adopt.ts";

function decimals() {
  assert.equal(multiplyDecimal("100", "137.62500000"), "13762.50");
  assert.equal(multiplyDecimal("1", "137.625"), "137.63", "half away from zero");
  assert.equal(multiplyDecimal("-1", "137.625"), "-137.63", "half away from zero (negative)");
  assert.equal(multiplyDecimal("0.1", "0.2", 2), "0.02");
  assert.equal(multiplyDecimal("0.1", "0.2", 4), "0.0200");
  assert.equal(multiplyDecimal("1000000", "0.00150000"), "1500.00");
  assert.equal(multiplyDecimal("3", "0.00150000"), "0.00", "tiny products round to zero");
  assert.equal(multiplyDecimal("123456789012345678.99", "137.625"), "16990740587824074071.00");
  assert.equal(multiplyDecimal("abc", "1"), null);
  assert.equal(multiplyDecimal("1e3", "1"), null);

  assert.equal(divideDecimal("100", "137.625"), "0.73");
  assert.equal(divideDecimal("13762.50", "137.625"), "100.00");
  assert.equal(divideDecimal("100", "0.0015"), "66666.67");
  assert.equal(divideDecimal("1", "8"), "0.13", "0.125 → 0.13");
  assert.equal(divideDecimal("-1", "8"), "-0.13");
  assert.equal(divideDecimal("1", "3", 4), "0.3333");
  assert.equal(divideDecimal("2", "3"), "0.67");
  assert.equal(divideDecimal("1", "0"), null);
  assert.equal(divideDecimal("1", "0.000"), null);

  assert.equal(roundDecimal("137.625"), "137.63");
  assert.equal(roundDecimal("137.624999"), "137.62");
  assert.equal(roundDecimal("2.795"), "2.80");
  assert.equal(roundDecimal("0.005"), "0.01");
  assert.equal(roundDecimal("0.004"), "0.00");
  assert.equal(roundDecimal("-0.005"), "-0.01");
  assert.equal(roundDecimal("12"), "12.00");
  assert.equal(roundDecimal("9.995"), "10.00");

  assert.equal(roundSignificant("0.00150000"), "0.0015");
  assert.equal(roundSignificant("0.00136274"), "0.001363");
  assert.equal(roundSignificant("0.00001117"), "0.00001117");
  assert.equal(roundSignificant("0.123456"), "0.1235");
  assert.equal(roundSignificant("0.99996"), "1");
  assert.equal(roundSignificant("123456", 4), "123500");
  assert.equal(roundSignificant("0"), "0");

  assert.equal(normalizeDecimalInput(" ١٢٣٫٥ "), "123.5");
  assert.equal(normalizeDecimalInput("۱۰۰"), "100");
  assert.equal(normalizeDecimalInput("1,234.50"), "1234.50");
  assert.equal(normalizeDecimalInput("١٬٢٣٤"), "1234");
  assert.ok(isPositiveDecimal("0.01"));
  assert.ok(!isPositiveDecimal("0"));
  assert.ok(!isPositiveDecimal("0.00"));
  assert.ok(!isPositiveDecimal("-5"));
  assert.ok(!isPositiveDecimal(""));
}

function formatting() {
  assert.equal(formatRate("1.1344858963", "en-US", 4), "1.1345", "cross rates keep 4 decimals");
  assert.equal(formatRate("0.0072793449", "en-US", 4), "0.007279", "small crosses stay at 4 significant digits");
  assert.equal(formatRate("137.62500000", "en-US"), "137.63");
  assert.equal(formatRate("121.5", "en-US"), "121.50");
  assert.equal(formatRate("1", "en-US"), "1.00");
  assert.equal(formatRate("2.64", "en-US"), "2.64");
  assert.equal(formatRate("1234.5", "en-US"), "1,234.50");
  assert.equal(formatRate("0.00150000", "en-US"), "0.0015");
  assert.equal(formatRate("0.00136274", "en-US"), "0.001363");
  assert.equal(formatRate("0.99996", "en-US"), "1.00");
  assert.equal(formatRate("0.5", "en-US"), "0.5");
  assert.equal(formatRate("", "en-US"), "—");
  assert.equal(formatRate("n/a", "en-US"), "—");

  assert.equal(formatRate("137.625", "ar-SA"), "١٣٧٫٦٣", "Arabic-Indic digits");
  assert.equal(formatRate("0.0015", "ar-SA"), "٠٫٠٠١٥");
  assert.equal(formatRate("13762.5", "ar-SA"), "١٣٬٧٦٢٫٥٠");

  assert.equal(formatDecimalString("16990740587824074071.00", "en-US"), "16,990,740,587,824,074,071.00");
  assert.equal(formatDecimalString("-0.73", "en-US"), "-0.73");
}

const q = (currency: string, pinned: boolean, extra: Partial<FxLiveQuote> = {}): FxLiveQuote => ({
  currency,
  pinned,
  official: null,
  market: null,
  usdCross: null,
  ...extra,
});

function ordering() {
  const { pinned, others } = orderQuotes([
    q("TRY", false),
    q("SAR", true),
    q("AED", false),
    q("GBP", true),
    q("USD", true),
    q("EUR", true),
    q("LBP", false),
  ]);
  assert.deepEqual(pinned.map((x) => x.currency), ["USD", "EUR", "SAR", "GBP"]);
  assert.deepEqual(others.map((x) => x.currency), ["TRY", "AED", "LBP"], "backend order kept");
  assert.deepEqual(orderQuotes([]), { pinned: [], others: [] });
  assert.deepEqual(
    orderQuotes([q("EUR", true), q("SAR", true), q("SYP", true)], "SYP").pinned.map((x) => x.currency),
    ["SYP", "EUR", "SAR"],
    "lead currency (local row after rebasing) comes first",
  );
}

function rebasing() {
  const s = (buy: string, sell: string, mid: string, over: Partial<FxLiveSide> = {}): FxLiveSide => ({
    buy, sell, mid, observedAt: "2026-09-27T07:58:31Z", derived: false, stale: false, ...over,
  });
  const board = [
    q("USD", true, { market: s("137", "137.75", "137.375"), official: s("121.5", "122.5", "122"), usdCross: "1" }),
    q("EUR", true, { market: s("154.8", "156.9", "155.85"), official: s("138.46", "139.60", "139.03", { derived: true, observedAt: "2026-09-27T00:02:31Z" }) }),
    q("SAR", true, { market: s("36.14", "36.71", "36.425") }),
    q("GBP", false, { market: s("183", "185", "184", { stale: true }) }),
  ];

  assert.deepEqual(rebaseQuotes(board, "SYP", "SYP", divideDecimal), board, "local base is identity");
  assert.deepEqual(rebaseQuotes(board, "SYP", "JPY", divideDecimal), board, "unknown base is identity");

  const usd = rebaseQuotes(board, "SYP", "USD", divideDecimal);
  assert.deepEqual(usd.map((x) => x.currency), ["SYP", "EUR", "SAR", "GBP"], "base row dropped, local row first");
  const syp = usd[0];
  assert.equal(syp.pinned, true);
  assert.equal(syp.market?.mid, "0.0072793449", "1 SYP = 1 / 137.375 USD");
  assert.equal(syp.market?.buy, "0.0072595281", "SYP buy uses 1 / USD sell");
  assert.equal(syp.market?.sell, "0.0072992701", "SYP sell uses 1 / USD buy");
  assert.equal(syp.official?.mid, "0.0081967213");

  const eur = usd.find((x) => x.currency === "EUR")!;
  assert.equal(eur.market?.mid, "1.1344858963", "EUR/USD cross = 155.85 / 137.375");
  assert.equal(eur.market?.buy, "1.1237749546", "dealer cross: EUR buy / USD sell");
  assert.equal(eur.market?.sell, "1.1452554745", "dealer cross: EUR sell / USD buy");
  assert.equal(eur.official?.derived, true, "derived input keeps the flag");
  assert.equal(eur.official?.observedAt, "2026-09-27T00:02:31Z", "older observation wins");
  assert.equal(eur.usdCross, null);

  const sar = usd.find((x) => x.currency === "SAR")!;
  assert.equal(sar.market?.mid, "0.2651501365", "SAR/USD ≈ 1 / 3.7714");
  assert.equal(sar.official, null, "no SAR official quote → no cross");
  assert.equal(usd.find((x) => x.currency === "GBP")!.market?.stale, true, "stale input stays stale");

  const sarBase = rebaseQuotes(board, "SYP", "SAR", divideDecimal);
  assert.equal(sarBase[0].official, null, "base without an official quote → no official cross");
  assert.equal(sarBase.find((x) => x.currency === "USD")!.market?.mid, "3.7714481812");

  assert.deepEqual(baseCurrencyOptions(board, "SYP"), ["SYP", "USD", "EUR", "SAR", "GBP"]);
  assert.deepEqual(baseCurrencyOptions([q("KWD", false)], "SYP"), ["SYP"], "quotes without a mid are not offered");
}

function badges() {
  const side = (over: Record<string, unknown> = {}) => ({
    buy: "1",
    sell: "2",
    mid: "1.5",
    observedAt: "2026-09-27T10:00:00Z",
    derived: false,
    stale: false,
    ...over,
  });
  const gbp = q("GBP", false, {
    official: side({ derived: true }),
    market: side({ derived: true, stale: true, observedAt: "2026-03-02T09:00:00Z" }),
  });
  assert.deepEqual(quoteBadges(gbp, "market"), {
    missing: false,
    derived: true,
    stale: true,
    observedAt: "2026-03-02T09:00:00Z",
  });
  assert.deepEqual(quoteBadges(gbp, "official"), {
    missing: false,
    derived: true,
    stale: false,
    observedAt: "2026-09-27T10:00:00Z",
  });
  assert.deepEqual(quoteBadges(q("EGP", false), "official"), {
    missing: true,
    derived: false,
    stale: false,
    observedAt: "",
  });

  assert.equal(usableMid(gbp, "market"), "1.5");
  assert.equal(usableMid(q("EGP", false), "market"), null);
  assert.equal(usableMid(q("X", false, { market: side({ mid: "" }) }), "market"), null);
  assert.equal(usableMid(q("X", false, { market: side({ mid: "0.000" }) }), "market"), null);
  assert.equal(usableMid(undefined, "market"), null);
}

const SAMPLE = {
  local_currency: "SYP",
  updated_at: "2026-09-27T10:23:33Z",
  stale: false,
  quotes: [
    {
      currency: "SAR",
      pinned: true,
      official: null,
      market: { buy: "36.14000000", sell: "36.71000000", mid: "36.42500000", observed_at: "2026-09-27T10:20:00Z", derived: false, stale: false },
      usd_cross: "0.26666667",
    },
    {
      currency: "USD",
      pinned: true,
      official: { buy: "121.50000000", sell: "122.50000000", mid: "122.00000000", observed_at: "2026-09-27T08:00:00Z", derived: false },
      market: { buy: "137.25000000", sell: "138.00000000", mid: "137.62500000", observed_at: "2026-09-27T10:20:00Z", derived: false, stale: false },
      usd_cross: "1.00000000",
    },
    {
      currency: "GBP",
      pinned: false,
      official: null,
      market: { buy: "183.91500000", sell: "184.92000000", mid: "184.41750000", observed_at: "2026-03-02T09:00:00Z", derived: true, stale: true },
      usd_cross: null,
    },
  ],
  sources: [
    { id: "lirascope", name: "LiraScope", url: "https://lirascope.syria-cloud.sy", kinds: ["official", "market"], ok: true, fetched_at: "2026-09-27T10:23:33Z", error: "" },
    { id: "exchangerate-api", name: "ExchangeRate-API", url: "https://www.exchangerate-api.com", attribution: "Rates By Exchange Rate API", kinds: ["reference"], ok: true, fetched_at: "2026-09-27T10:23:33Z", error: "" },
  ],
  disclaimer: "Indicative only.",
};

function mapper() {
  const board = mapLiveBoard(SAMPLE);
  assert.equal(board.localCurrency, "SYP");
  assert.equal(board.updatedAt, "2026-09-27T10:23:33Z");
  assert.equal(board.quotes.length, 3);
  const usd = board.quotes.find((x) => x.currency === "USD")!;
  assert.equal(usd.market?.mid, "137.62500000");
  assert.equal(usd.official?.stale, false, "official has no stale flag → false");
  assert.equal(board.quotes.find((x) => x.currency === "SAR")!.official, null);
  assert.equal(board.sources[1].attribution, "Rates By Exchange Rate API");
  assert.equal(board.sources[0].attribution, "");
  assert.equal(board.disclaimer, "Indicative only.");

  const loose = mapLiveBoard({
    updated_at: null,
    quotes: [
      null,
      "USD",
      { currency: "x" },
      { currency: "usd", official: { buy: "abc" }, market: { mid: 137.5 } },
      { currency: "EUR" },
      { currency: "LBP", market: { buy: "0.00148", sell: "-1", mid: "" } },
    ],
    sources: [null, { id: "evil", name: "Evil", url: "javascript:alert(1)", ok: false, error: "timeout" }, {}],
  });
  assert.equal(loose.localCurrency, "SYP", "defaults to SYP");
  assert.equal(loose.updatedAt, null);
  assert.equal(loose.stale, false);
  assert.deepEqual(loose.quotes.map((x) => x.currency), ["USD", "EUR", "LBP"]);
  assert.equal(loose.quotes[0].official, null, "no valid rate → null side");
  assert.equal(loose.quotes[0].market?.mid, "137.5", "numeric rates tolerated");
  assert.equal(loose.quotes[0].pinned, true, "pinned falls back to the default list");
  assert.equal(loose.quotes[1].market, null);
  assert.equal(loose.quotes[2].pinned, false);
  assert.deepEqual(loose.quotes[2].market && [loose.quotes[2].market.buy, loose.quotes[2].market.sell, loose.quotes[2].market.mid], ["0.00148", "", ""]);
  assert.equal(loose.sources.length, 1);
  assert.equal(loose.sources[0].url, "", "non-http urls dropped");
  assert.equal(loose.sources[0].ok, false);

  for (const empty of [null, undefined, "x", 42, [], {}]) {
    const b = mapLiveBoard(empty);
    assert.deepEqual([b.quotes, b.sources, b.updatedAt, b.localCurrency], [[], [], null, "SYP"]);
  }

  assert.equal(safeUrl("https://www.exchangerate-api.com"), "https://www.exchangerate-api.com");
  assert.equal(safeUrl("http://x.sy/a"), "http://x.sy/a");
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl("//evil.com"), "");
}

function health() {
  const board = mapLiveBoard(SAMPLE);
  assert.deepEqual(boardHealth(board), { degraded: false, failedSources: [] });
  assert.deepEqual(headline(board), { mid: "137.62500000", stale: false });
  assert.deepEqual(headline(null), { mid: null, stale: false });

  const stale = mapLiveBoard({ ...SAMPLE, stale: true });
  assert.equal(boardHealth(stale).degraded, true);
  assert.equal(headline(stale).stale, true);

  const failed = mapLiveBoard({
    ...SAMPLE,
    sources: [{ ...SAMPLE.sources[0], ok: false, error: "timeout" }, SAMPLE.sources[1]],
  });
  assert.equal(boardHealth(failed).degraded, true);
  assert.deepEqual(boardHealth(failed).failedSources.map((s) => s.id), ["lirascope"]);

  const noUsdMarket = mapLiveBoard({
    ...SAMPLE,
    quotes: SAMPLE.quotes.map((x) => (x.currency === "USD" ? { ...x, market: null } : x)),
  });
  assert.deepEqual(headline(noUsdMarket), { mid: null, stale: false });

  const usdStale = mapLiveBoard({
    ...SAMPLE,
    quotes: SAMPLE.quotes.map((x) =>
      x.currency === "USD" ? { ...x, market: { ...x.market!, stale: true } } : x,
    ),
  });
  assert.equal(headline(usdStale).stale, true);

  assert.ok(isOlderThan(0, 60_000, 1_000));
  assert.ok(isOlderThan(1_000, 60_000, 61_000));
  assert.ok(!isOlderThan(1_000, 60_000, 60_999));
}

function attribution() {
  assert.equal(EXCHANGE_RATE_API_SOURCE.attribution, "Rates By Exchange Rate API");
  assert.equal(EXCHANGE_RATE_API_SOURCE.url, "https://www.exchangerate-api.com");

  const board = mapLiveBoard(SAMPLE);
  assert.deepEqual(footerSources(board.sources).map((s) => s.id), ["lirascope", "exchangerate-api"]);

  const withoutEra = footerSources(board.sources.filter((s) => s.id !== "exchangerate-api"));
  assert.equal(withoutEra.at(-1)?.attribution, "Rates By Exchange Rate API", "always shown");

  const bare = footerSources([{ ...board.sources[1], attribution: "", url: "", ok: false }]);
  assert.equal(bare.length, 1);
  assert.equal(bare[0].attribution, "Rates By Exchange Rate API");
  assert.equal(bare[0].url, "https://www.exchangerate-api.com");
  assert.equal(bare[0].ok, false, "backend health kept");

  assert.equal(footerSources([]).length, 1);
}

function adoptErrors() {
  assert.equal(classifyAdoptError({ status: 409, code: "fx_rate_exists" }), "exists");
  assert.equal(classifyAdoptError({ status: 422, code: "live_quote_unavailable" }), "unavailable");
  assert.equal(classifyAdoptError({ status: 409, code: "conflict" }), "other");
  assert.equal(classifyAdoptError({ status: 403, code: "forbidden" }), "other");
  assert.equal(classifyAdoptError(new Error("x")), "other");
  assert.equal(classifyAdoptError(null), "other");
}

function i18n() {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const load = (l: string) =>
    JSON.parse(fs.readFileSync(path.join(root, `src/shared/i18n/messages/${l}.json`), "utf8"));
  const files = [
    "src/widgets/app-shell/ui/fx-live-indicator.tsx",
    "src/widgets/app-shell/ui/fx-live-panel.tsx",
    "src/entities/fx-live/ui/live-fx-quote-table.tsx",
    "src/entities/fx-live/ui/live-fx-sources.tsx",
    "src/features/refresh-live-fx/ui/refresh-live-fx-button.tsx",
    "src/features/adopt-live-fx-rate/ui/adopt-live-rate-button.tsx",
  ];
  const keys = new Set<string>(["kindShort.market", "kindShort.official"]);
  for (const file of files) {
    const src = fs.readFileSync(path.join(root, file), "utf8");
    for (const m of src.matchAll(/\bt\(\s*"([^"]+)"/g)) keys.add(m[1]);
  }
  const converter = fs.readFileSync(
    path.join(root, "src/features/convert-currency/ui/live-fx-converter.tsx"),
    "utf8",
  );
  for (const m of converter.matchAll(/\bt\(\s*"([^"]+)"/g)) keys.add(`converter.${m[1]}`);
  for (const k of ["converter.invalid", "converter.unavailable", "triggerLabel", "triggerLabelStale"]) keys.add(k);

  for (const locale of ["en", "ar"]) {
    const ns = load(locale).fxLive;
    for (const key of keys) {
      const value = key.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)?.[p], ns);
      assert.equal(typeof value, "string", `[${locale}] fxLive.${key}`);
    }
  }
  assert.match(load("ar").fxLive.location, /دمشق/);
}

decimals();
formatting();
ordering();
rebasing();
badges();
mapper();
health();
attribution();
adoptErrors();
i18n();
console.log("fx-live selftest OK");
