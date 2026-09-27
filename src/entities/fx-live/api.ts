import { http, type HttpClient } from "@/shared/api/http-client";
import { createRepository } from "@/shared/api/repository";
import {
  EXCHANGE_RATE_API_SOURCE,
  mapLiveBoard,
  type FxLiveBoard,
  type FxLiveQuote,
  type FxLiveSide,
} from "./model";

export interface FxLiveRepository {
  /** `GET /v1/fx/live` — any authenticated user. */
  get(): Promise<FxLiveBoard>;
  /** `POST /v1/fx/live/refresh` — `fx.manage`; re-fetches the sources now. */
  refresh(): Promise<FxLiveBoard>;
}

export class ApiFxLiveRepository implements FxLiveRepository {
  constructor(private readonly http: HttpClient) {}

  async get(): Promise<FxLiveBoard> {
    return mapLiveBoard(await this.http.request<unknown>("/fx/live"));
  }

  async refresh(): Promise<FxLiveBoard> {
    return mapLiveBoard(await this.http.request<unknown>("/fx/live/refresh", { method: "POST" }));
  }
}

type DemoSide = [buy: string, sell: string, mid: string, derived?: boolean];

function side(values: DemoSide | null, observedAt: string): FxLiveSide | null {
  if (!values) return null;
  const [buy, sell, mid, derived = false] = values;
  return { buy, sell, mid, observedAt, derived, stale: false };
}

/** Damascus, new SYP (post 2026-01-01 redenomination), SYP per 1 unit. */
function demoBoard(): FxLiveBoard {
  const now = Date.now();
  const updatedAt = new Date(now - 4 * 60_000).toISOString();
  const quote = (
    currency: string,
    pinned: boolean,
    official: DemoSide | null,
    market: DemoSide | null,
    usdCross: string,
  ): FxLiveQuote => ({
    currency,
    pinned,
    official: side(official, updatedAt),
    market: side(market, updatedAt),
    usdCross,
  });
  return {
    localCurrency: "SYP",
    updatedAt,
    stale: false,
    quotes: [
      quote("USD", true, ["121.50000000", "122.50000000", "122.00000000"], ["137.25000000", "138.00000000", "137.62500000"], "1.00000000"),
      quote("EUR", true, ["138.46140000", "139.60100000", "139.03120000", true], ["154.80000000", "156.90000000", "155.85000000"], "0.87750600"),
      quote("SAR", true, ["32.40000041", "32.66666708", "32.53333374", true], ["36.14000000", "36.71000000", "36.42500000"], "3.75000000"),
      quote("TRY", false, ["2.46888000", "2.48920000", "2.47904000", true], ["2.78000000", "2.81000000", "2.79500000"], "49.21300000"),
      quote("AED", false, ["33.08373072", "33.35602480", "33.21987776", true], ["37.25000000", "37.55000000", "37.40000000"], "3.67250000"),
      quote("EGP", false, null, ["2.62000000", "2.66000000", "2.64000000"], "49.01960784"),
      quote("LBP", false, ["0.00135716", "0.00136833", "0.00136274", true], ["0.00148000", "0.00152000", "0.00150000"], "89526.40000000"),
      quote("GBP", false, ["162.81000000", "164.15000000", "163.48000000", true], ["183.91500000", "184.92000000", "184.41750000", true], "0.74626866"),
      quote("JOD", false, ["171.36812466", "172.77856190", "172.07334328", true], ["193.58251119", "194.64033912", "194.11142516", true], "0.70900000"),
    ],
    sources: [
      {
        id: "lirascope",
        name: "LiraScope",
        url: "https://lirascope.syria-cloud.sy",
        attribution: "",
        kinds: ["official", "market"],
        ok: true,
        fetchedAt: updatedAt,
        error: "",
      },
      { ...EXCHANGE_RATE_API_SOURCE, fetchedAt: updatedAt },
    ],
    disclaimer:
      "Indicative rates for information only. Parallel-market quotes vary between exchange offices; official rates are published by the Central Bank of Syria.",
  };
}

export class MemoryFxLiveRepository implements FxLiveRepository {
  async get(): Promise<FxLiveBoard> {
    return demoBoard();
  }

  async refresh(): Promise<FxLiveBoard> {
    throw new Error("Refreshing live FX rates requires the backend");
  }
}

export function createFxLiveRepository(): FxLiveRepository {
  return createRepository<FxLiveRepository>({
    api: new ApiFxLiveRepository(http),
    memory: new MemoryFxLiveRepository(),
    reads: ["get"],
  });
}
