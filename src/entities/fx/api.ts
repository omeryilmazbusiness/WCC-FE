import { ApiError } from "@/shared/api/api-error";
import { http, type HttpClient } from "@/shared/api/http-client";
import { createRepository } from "@/shared/api/repository";
import {
  FX_RATE_NOT_FOUND_CODE,
  fxSearchParams,
  normalizeCurrency,
  normalizeFxRate,
  type FxAdoptLiveInput,
  type FxConversion,
  type FxFilters,
  type FxPage,
  type FxPageRequest,
  type FxRate,
  type FxRateCreateInput,
  type FxRateUpdateInput,
} from "./model";

export type ConvertParams = {
  /** Minor units in `from`. */
  amount: number;
  from: string;
  to: string;
  /** `YYYY-MM-DD`; latest rate when omitted. */
  on?: string;
};

export interface FxRepository {
  list(filters: FxFilters, page: FxPageRequest): Promise<FxPage>;
  create(input: FxRateCreateInput): Promise<FxRate>;
  update(id: string, input: FxRateUpdateInput): Promise<FxRate>;
  remove(id: string): Promise<void>;
  /** 404 `fx_rate_not_found` when no rate exists for the pair on or before `on`. */
  convert(params: ConvertParams): Promise<FxConversion>;
  /** 409 `fx_rate_exists` when today's rate is already set; 422 `live_quote_unavailable`. */
  adoptLive(input: FxAdoptLiveInput): Promise<FxRate>;
}

type Raw = Record<string, unknown>;

const str = (value: unknown) => (value == null ? "" : String(value));

function mapRate(raw: Raw): FxRate {
  return {
    id: str(raw.id),
    base: str(raw.base),
    quote: str(raw.quote),
    rate: str(raw.rate),
    effectiveDate: str(raw.effective_date ?? raw.effectiveDate).slice(0, 10),
    source: str(raw.source),
    createdBy: str(raw.created_by ?? raw.createdBy),
    createdAt: str(raw.created_at ?? raw.createdAt),
  };
}

function mapConversion(raw: Raw): FxConversion {
  return {
    amount: Number(raw.amount ?? 0),
    from: str(raw.from),
    to: str(raw.to),
    converted: Number(raw.converted ?? 0),
    rate: str(raw.rate),
    effectiveDate: str(raw.effective_date ?? raw.effectiveDate).slice(0, 10),
  };
}

function toPage(items: FxRate[], meta: Raw, page: FxPageRequest): FxPage {
  const total = Number(meta.total ?? items.length);
  const limit = Number(meta.limit ?? page.limit) || page.limit;
  const offset = Number(meta.offset ?? page.offset);
  return {
    items,
    total,
    limit,
    offset,
    page: Number(meta.page ?? Math.floor(offset / limit) + 1),
    totalPages: Number(meta.total_pages ?? Math.max(1, Math.ceil(total / limit))),
  };
}

export class ApiFxRepository implements FxRepository {
  constructor(private readonly http: HttpClient) {}

  async list(filters: FxFilters, page: FxPageRequest): Promise<FxPage> {
    const res = await this.http.raw(`/fx-rates?${fxSearchParams(filters, page)}`);
    const payload = (await res.json().catch(() => ({}))) as Raw;
    const data = Array.isArray(payload.data) ? (payload.data as Raw[]) : [];
    return toPage(data.map(mapRate), (payload.meta ?? {}) as Raw, page);
  }

  async create(input: FxRateCreateInput): Promise<FxRate> {
    return mapRate(
      await this.http.request<Raw>("/fx-rates", {
        method: "POST",
        body: JSON.stringify({
          base: normalizeCurrency(input.base),
          quote: normalizeCurrency(input.quote),
          rate: normalizeFxRate(input.rate),
          effective_date: input.effectiveDate,
          ...(input.source?.trim() ? { source: input.source.trim() } : {}),
        }),
      }),
    );
  }

  async update(id: string, input: FxRateUpdateInput): Promise<FxRate> {
    return mapRate(
      await this.http.request<Raw>(`/fx-rates/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          rate: normalizeFxRate(input.rate),
          ...(input.source !== undefined ? { source: input.source.trim() } : {}),
        }),
      }),
    );
  }

  async remove(id: string): Promise<void> {
    await this.http.request(`/fx-rates/${id}`, { method: "DELETE" });
  }

  async convert(params: ConvertParams): Promise<FxConversion> {
    const sp = new URLSearchParams({
      amount: String(params.amount),
      from: normalizeCurrency(params.from),
      to: normalizeCurrency(params.to),
    });
    if (params.on) sp.set("on", params.on);
    return mapConversion(await this.http.request<Raw>(`/fx-rates/convert?${sp}`));
  }

  async adoptLive(input: FxAdoptLiveInput): Promise<FxRate> {
    return mapRate(
      await this.http.request<Raw>("/fx-rates/adopt", {
        method: "POST",
        body: JSON.stringify({
          currency: normalizeCurrency(input.currency),
          kind: input.kind,
          side: input.side,
        }),
      }),
    );
  }
}

const today = () => new Date().toISOString().slice(0, 10);

const DEMO_RATES: FxRate[] = [
  { base: "USD", quote: "SAR", rate: "3.75000000", source: "SAMA" },
  { base: "EUR", quote: "SAR", rate: "4.07120000", source: "ECB" },
  { base: "TRY", quote: "SAR", rate: "0.10950000", source: "manual" },
  { base: "EGP", quote: "SAR", rate: "0.07710000", source: "manual" },
].map((r, i) => ({
  ...r,
  id: `fx-demo-${i + 1}`,
  effectiveDate: today(),
  createdBy: "Finance",
  createdAt: new Date().toISOString(),
}));

const DECIMAL_SCALE = 8;

/** Exact `minor × rate` for the demo converter via BigInt fixed-point (half-up to minor units). */
function multiplyMinor(minor: number, rate: string): number {
  const [whole, fraction = ""] = normalizeFxRate(rate).split(".");
  const scaled = BigInt(whole + fraction.padEnd(DECIMAL_SCALE, "0"));
  const unit = BigInt(10) ** BigInt(DECIMAL_SCALE);
  const product = BigInt(Math.trunc(minor)) * scaled;
  return Number((product + unit / BigInt(2)) / unit);
}

export class MemoryFxRepository implements FxRepository {
  async list(filters: FxFilters, page: FxPageRequest): Promise<FxPage> {
    const base = filters.base && normalizeCurrency(filters.base);
    const quote = filters.quote && normalizeCurrency(filters.quote);
    const rows = DEMO_RATES.filter(
      (r) =>
        (!base || r.base === base) &&
        (!quote || r.quote === quote) &&
        (!filters.from || r.effectiveDate >= filters.from) &&
        (!filters.to || r.effectiveDate <= filters.to),
    );
    return toPage(rows.slice(page.offset, page.offset + page.limit), { total: rows.length }, page);
  }

  async create(): Promise<FxRate> {
    throw new Error("FX rates require the backend");
  }

  async update(): Promise<FxRate> {
    throw new Error("FX rates require the backend");
  }

  async remove(): Promise<void> {
    throw new Error("FX rates require the backend");
  }

  async adoptLive(): Promise<FxRate> {
    throw new Error("FX rates require the backend");
  }

  async convert(params: ConvertParams): Promise<FxConversion> {
    const from = normalizeCurrency(params.from);
    const to = normalizeCurrency(params.to);
    const rate =
      from === to
        ? "1"
        : DEMO_RATES.find((r) => r.base === from && r.quote === to)?.rate;
    if (!rate) {
      throw new ApiError({ status: 404, code: FX_RATE_NOT_FOUND_CODE, message: "FX rate not found" });
    }
    return {
      amount: params.amount,
      from,
      to,
      converted: multiplyMinor(params.amount, rate),
      rate,
      effectiveDate: params.on ?? today(),
    };
  }
}

export function createFxRepository(): FxRepository {
  return createRepository<FxRepository>({
    api: new ApiFxRepository(http),
    memory: new MemoryFxRepository(),
    reads: ["list", "convert"],
  });
}
