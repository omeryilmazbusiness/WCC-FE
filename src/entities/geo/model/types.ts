/** A country of the catalogue: ISO 3166-1 alpha-2 code and its default IANA time zone. */
export type Country = { code: string; timezone: string };

/**
 * A city: `value` is what the company profile stores (English / Latin name, with the
 * region when the name repeats in the country); `ar` is the Arabic display name, if any;
 * `rank` is its prominence in the country (0 = best known: population and fame).
 */
export type City = { value: string; ar: string; timezone: string; rank: number };

/** Read-only location catalogue (DIP): the UI depends on this, not on where data lives. */
export interface GeoCatalog {
  countries(): readonly Country[];
  /** Cities of a country; an unknown code resolves to an empty list. */
  cities(country: string): Promise<readonly City[]>;
}

/**
 * Option shown in a picker; `alt` is extra searchable text (e.g. the English name);
 * `rank` orders matches and picks the suggestions shown before typing (0 = first).
 */
export type GeoOption = { value: string; label: string; alt?: string; rank?: number };
