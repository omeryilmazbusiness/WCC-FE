import type { City, Country, GeoOption } from "./types";

const ISO_COUNTRY = /^[A-Z]{2}$/;

/** ISO 3166-1 alpha-2; `Intl.DisplayNames({type:"region"})` only accepts these. */
export function isIsoCountryCode(value: string): boolean {
  return ISO_COUNTRY.test(value);
}

function sortByLabel(options: GeoOption[], locale: string): GeoOption[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  return options.sort((a, b) => collator.compare(a.label, b.label));
}

/** Localized region label; never throws on a country name or unknown token. */
function regionLabel(names: Intl.DisplayNames, code: string): string {
  if (!isIsoCountryCode(code)) return code;
  try {
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * Map a stored country (ISO code or a typed display name such as "Syria") onto a
 * catalogue code when the name matches English or the active locale.
 */
export function resolveCountryCode(countries: readonly Country[], value: string, locale: string): string {
  const raw = value.trim();
  if (!raw) return "";
  const asCode = /^[A-Za-z]{2}$/.test(raw) ? raw.toUpperCase() : raw;
  if (countries.some((c) => c.code === asCode)) return asCode;
  const names = new Intl.DisplayNames([locale], { type: "region" });
  const english = new Intl.DisplayNames(["en"], { type: "region" });
  const needle = normalizeSearch(raw);
  for (const { code } of countries) {
    if (normalizeSearch(regionLabel(names, code)) === needle || normalizeSearch(regionLabel(english, code)) === needle) {
      return code;
    }
  }
  return raw;
}

function countryOption(code: string, names: Intl.DisplayNames, english: Intl.DisplayNames): GeoOption {
  if (!isIsoCountryCode(code)) return { value: code, label: code };
  const label = regionLabel(names, code);
  const en = regionLabel(english, code);
  return { value: code, label, alt: `${code} ${en}` };
}

/** Countries by localized name (code and English name stay searchable); a saved code or name outside the catalogue stays. */
export function countryOptions(countries: readonly Country[], locale: string, current = ""): GeoOption[] {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  const english = new Intl.DisplayNames(["en"], { type: "region" });
  const codes = countries.map((c) => c.code);
  const saved = current.trim();
  const resolved = saved ? resolveCountryCode(countries, saved, locale) : "";
  if (saved && !codes.includes(saved) && !codes.includes(resolved)) codes.push(saved);
  return sortByLabel(codes.map((code) => countryOption(code, names, english)), locale);
}

/** Cities by localized name (Arabic when available); a saved city outside the catalogue stays. */
export function cityOptions(cities: readonly City[], locale: string, current = ""): GeoOption[] {
  const arabic = locale === "ar";
  const options: GeoOption[] = cities.map((city) =>
    arabic && city.ar
      ? { value: city.value, label: city.ar, alt: city.value, rank: city.rank }
      : { value: city.value, label: city.value, rank: city.rank },
  );
  if (current && !cities.some((city) => city.value === current)) options.push({ value: current, label: current });
  return sortByLabel(options, locale);
}

/** IANA zone of a location: the city's, else the country's, else `fallback`. */
export function timezoneFor(
  countries: readonly Country[],
  cities: readonly City[],
  country: string,
  city: string,
  fallback: string,
): string {
  const code = countries.some((c) => c.code === country) ? country : resolveCountryCode(countries, country, "en");
  return (
    (city && cities.find((c) => c.value === city)?.timezone) ||
    countries.find((c) => c.code === code)?.timezone ||
    fallback
  );
}

const ARABIC_FOLD: Record<string, string> = { "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ة": "ه", "ى": "ي", "ؤ": "و", "ئ": "ي" };

/** Case-, accent- and Arabic-diacritic-insensitive form used for matching. */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[أإآٱةىؤئ]/g, (ch) => ARABIC_FOLD[ch] ?? ch)
    .replace(/ı/g, "i")
    .trim();
}

type SearchEntry = { option: GeoOption; label: string; text: string; rank: number };
export type SearchIndex = readonly SearchEntry[];

/** `options` in display (alphabetical) order. */
export function buildSearchIndex(options: readonly GeoOption[]): SearchIndex {
  return options.map((option) => {
    const label = normalizeSearch(option.label);
    return {
      option,
      label,
      text: option.alt ? `${label} ${normalizeSearch(option.alt)}` : label,
      rank: option.rank ?? Number.POSITIVE_INFINITY,
    };
  });
}

const byRank = (a: SearchEntry, b: SearchEntry) => a.rank - b.rank;

/**
 * Without a query: the `suggest` best-ranked options (ranks are 0-based and contiguous),
 * or the first `suggest` when nothing is ranked, in display order.
 * With a query: matches best first (label prefix, word prefix, substring; then rank,
 * then display order), at most `limit`. `total` counts every option the query reaches.
 */
export function searchOptions(
  index: SearchIndex,
  query: string,
  limit: number,
  suggest = limit,
): { options: GeoOption[]; total: number } {
  const q = normalizeSearch(query);
  if (!q) {
    const ranked = index.filter((e) => e.rank < suggest);
    return { options: (ranked.length ? ranked : index.slice(0, suggest)).map((e) => e.option), total: index.length };
  }
  const buckets: SearchEntry[][] = [[], [], []];
  for (const entry of index) {
    if (entry.label.startsWith(q)) buckets[0].push(entry);
    else if (entry.text.startsWith(q) || entry.text.includes(` ${q}`) || entry.text.includes(`-${q}`)) buckets[1].push(entry);
    else if (entry.text.includes(q)) buckets[2].push(entry);
  }
  const all = buckets.flatMap((bucket) => bucket.sort(byRank));
  return { options: all.slice(0, limit).map((e) => e.option), total: all.length };
}
