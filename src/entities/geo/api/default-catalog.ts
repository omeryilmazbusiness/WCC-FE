import { COUNTRY_ROWS, GEO_DATA_VERSION } from "../model/countries.generated";
import type { GeoCatalog } from "../model/types";
import { createStaticGeoCatalog } from "./static-catalog";

export const staticGeoCatalog: GeoCatalog = createStaticGeoCatalog({ version: GEO_DATA_VERSION, rows: COUNTRY_ROWS });
