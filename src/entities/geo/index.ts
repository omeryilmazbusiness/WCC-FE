export type { City, Country, GeoCatalog, GeoOption } from "./model/types";
export { GEO_DATA_VERSION } from "./model/countries.generated";
export {
  buildSearchIndex,
  cityOptions,
  countryOptions,
  normalizeSearch,
  searchOptions,
  timezoneFor,
  type SearchIndex,
} from "./model/options";
export { useCities, type CitiesState } from "./model/use-cities";
export { createStaticGeoCatalog, parseCityFile, type CityFile, type StaticGeoSource } from "./api/static-catalog";
export { staticGeoCatalog } from "./api/default-catalog";
