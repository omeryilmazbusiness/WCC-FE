import type { City, Country, GeoCatalog } from "../model/types";

/** Shape of `public/geo/<version>/cities/<CC>.json`, best-known first (see scripts/build-geo.py). */
export type CityFile = { tz: string[]; c: [value: string, ar: string, tz: number][] };

export type StaticGeoSource = {
  version: string;
  rows: readonly (readonly [code: string, timezone: string])[];
  load?: (url: string) => Promise<CityFile>;
};

export function parseCityFile(file: CityFile): City[] {
  return file.c.map(([value, ar, tz], rank) => ({ value, ar, timezone: file.tz[tz] ?? "", rank }));
}

async function fetchCityFile(url: string): Promise<CityFile> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`geo: ${res.status} ${url}`);
  return (await res.json()) as CityFile;
}

/**
 * Catalogue served as immutable static files: one small JSON per country, fetched on
 * first use and kept for the page's lifetime (the HTTP cache keeps it across visits).
 */
export function createStaticGeoCatalog({ version, rows, load = fetchCityFile }: StaticGeoSource): GeoCatalog {
  const countries: readonly Country[] = rows.map(([code, timezone]) => ({ code, timezone }));
  const known = new Set(countries.map((c) => c.code));
  const cache = new Map<string, Promise<readonly City[]>>();
  return {
    countries: () => countries,
    cities(country) {
      if (!known.has(country)) return Promise.resolve([]);
      let pending = cache.get(country);
      if (!pending) {
        pending = load(`/geo/${version}/cities/${country}.json`).then(parseCityFile);
        pending.catch(() => cache.delete(country));
        cache.set(country, pending);
      }
      return pending;
    },
  };
}
