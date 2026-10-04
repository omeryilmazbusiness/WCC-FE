import { http, type HttpClient } from "@/shared/api/http-client";
import { QueryCache } from "@/shared/lib/query-cache";
import {
  mapPlaces,
  mapSearchResult,
  searchQueryString,
  type FlightSearchParams,
  type FlightSearchResult,
  type Place,
} from "./model";

export interface FlightRepository {
  /** `GET /v1/flights/places` — cities and airports for an autocomplete term. */
  places(term: string, locale: string): Promise<Place[]>;
  /** `GET /v1/flights/search` — fares around the wanted departure, closest first. */
  search(params: FlightSearchParams): Promise<FlightSearchResult>;
}

export type PlaceCacheOptions = { maxEntries: number; maxAgeMs: number; now?: () => number };

const PLACE_CACHE: PlaceCacheOptions = { maxEntries: 200, maxAgeMs: 10 * 60_000 };

/**
 * Suggestions are remembered per locale and term (in flight too), so retyping or
 * backspacing over a term answers from memory instead of the network. Failures are
 * not remembered.
 */
export class ApiFlightRepository implements FlightRepository {
  private readonly placeCache: QueryCache;

  constructor(
    private readonly http: HttpClient,
    placeCache: PlaceCacheOptions = PLACE_CACHE,
  ) {
    this.placeCache = new QueryCache(placeCache);
  }

  places(term: string, locale: string): Promise<Place[]> {
    const key = QueryCache.keyOf(locale, [term.toLocaleLowerCase()]);
    const hit = this.placeCache.get<Promise<Place[]>>(key);
    if (hit) return hit;
    const qs = new URLSearchParams({ term, locale }).toString();
    const pending = this.http.request<unknown>(`/flights/places?${qs}`).then(mapPlaces);
    this.placeCache.set(key, pending);
    pending.catch(() => {
      if (this.placeCache.get(key) === pending) this.placeCache.delete(key);
    });
    return pending;
  }

  async search(params: FlightSearchParams): Promise<FlightSearchResult> {
    return mapSearchResult(await this.http.request<unknown>(`/flights/search?${searchQueryString(params)}`));
  }
}

export function createFlightRepository(): FlightRepository {
  return new ApiFlightRepository(http);
}
