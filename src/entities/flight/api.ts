import { http, type HttpClient } from "@/shared/api/http-client";
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
  places(term: string, locale: string, signal?: AbortSignal): Promise<Place[]>;
  /** `GET /v1/flights/search` — fares around the wanted departure, closest first. */
  search(params: FlightSearchParams): Promise<FlightSearchResult>;
}

export class ApiFlightRepository implements FlightRepository {
  constructor(private readonly http: HttpClient) {}

  async places(term: string, locale: string, signal?: AbortSignal): Promise<Place[]> {
    const qs = new URLSearchParams({ term, locale }).toString();
    return mapPlaces(await this.http.request<unknown>(`/flights/places?${qs}`, { signal }));
  }

  async search(params: FlightSearchParams): Promise<FlightSearchResult> {
    return mapSearchResult(await this.http.request<unknown>(`/flights/search?${searchQueryString(params)}`));
  }
}

export function createFlightRepository(): FlightRepository {
  return new ApiFlightRepository(http);
}
