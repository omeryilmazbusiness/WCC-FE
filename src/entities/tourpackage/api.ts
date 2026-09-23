import { env } from "@/shared/config/env";
import { FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import type {
  CloneDepartureInput,
  ClonePackageInput,
  CreateDepartureInput,
  CreatePackageInput,
  Departure,
  DepartureReadiness,
  PricingTier,
  TierInput,
  TourPackage,
  UpdatePackageInput,
} from "./model";

function tokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  const session = parseSession(raw ? decodeURIComponent(raw) : null);
  return session?.accessToken ?? null;
}

export interface TourPackageRepository {
  listPackages(activeOnly?: boolean): Promise<TourPackage[]>;
  getPackage(id: string): Promise<TourPackage>;
  createPackage(input: CreatePackageInput): Promise<TourPackage>;
  updatePackage(id: string, input: UpdatePackageInput): Promise<TourPackage>;
  clonePackage(input: ClonePackageInput): Promise<TourPackage>;
  listPackageTiers(packageId: string): Promise<PricingTier[]>;
  setPackageTiers(packageId: string, tiers: TierInput[]): Promise<PricingTier[]>;
  listDepartures(packageId: string): Promise<Departure[]>;
  getDeparture(id: string): Promise<Departure>;
  createDeparture(input: CreateDepartureInput): Promise<Departure>;
  cloneDeparture(input: CloneDepartureInput): Promise<Departure>;
  closeSales(departureId: string, closed: boolean): Promise<Departure>;
  markFull(departureId: string): Promise<Departure>;
  readiness(departureId: string): Promise<DepartureReadiness>;
  listDepartureTiers(departureId: string): Promise<PricingTier[]>;
}

type Raw = Record<string, unknown>;

function mapPackage(raw: Raw): TourPackage {
  return {
    id: String(raw.id),
    branchId: String(raw.branchId ?? raw.branch_id ?? ""),
    code: String(raw.code ?? ""),
    nameEn: String(raw.nameEn ?? raw.name_en ?? ""),
    nameAr: String(raw.nameAr ?? raw.name_ar ?? ""),
    description: String(raw.description ?? ""),
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),
  };
}

function mapDeparture(raw: Raw): Departure {
  return {
    id: String(raw.id),
    packageId: String(raw.packageId ?? raw.package_id ?? ""),
    code: String(raw.code ?? ""),
    departDate: String(raw.departDate ?? raw.depart_date ?? "").slice(0, 10),
    returnDate: String(raw.returnDate ?? raw.return_date ?? "").slice(0, 10),
    capacityTotal: Number(raw.capacityTotal ?? raw.capacity_total ?? 0),
    capacitySold: Number(raw.capacitySold ?? raw.capacity_sold ?? 0),
    remaining: Number(raw.remaining ?? NaN),
    fillPct: Number(raw.fillPct ?? raw.fill_pct ?? NaN),
    alert: String(raw.alert ?? "ok"),
    basePrice: Number(raw.basePrice ?? raw.base_price ?? 0),
    currency: String(raw.currency ?? "USD"),
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
    salesClosed: Boolean(raw.salesClosed ?? raw.sales_closed ?? false),
    softThresholdPct: Number(raw.softThresholdPct ?? raw.soft_threshold_pct ?? 80),
    allowOversell: Boolean(raw.allowOversell ?? raw.allow_oversell ?? false),
    pricingLocked: Boolean(raw.pricingLocked ?? raw.pricing_locked ?? false),
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),
  };
}

function mapTier(raw: Raw): PricingTier {
  return {
    id: String(raw.id),
    packageId: raw.package_id ? String(raw.package_id) : undefined,
    departureId: raw.departure_id ? String(raw.departure_id) : undefined,
    code: String(raw.code ?? ""),
    label: String(raw.label ?? ""),
    kind: String(raw.kind ?? "room"),
    amount: Number(raw.amount ?? 0),
    currency: String(raw.currency ?? "USD"),
    sortOrder: Number(raw.sortOrder ?? raw.sort_order ?? 0),
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
  };
}

export class ApiTourPackageRepository implements TourPackageRepository {
  constructor(private readonly http: HttpClient) {}

  async listPackages(activeOnly = true): Promise<TourPackage[]> {
    const q = activeOnly ? "" : "?active=false";
    const data = await this.http.request<Raw[]>(`/packages${q}`);
    return (Array.isArray(data) ? data : []).map(mapPackage);
  }

  async getPackage(id: string): Promise<TourPackage> {
    return mapPackage(await this.http.request<Raw>(`/packages/${id}`));
  }

  async createPackage(input: CreatePackageInput): Promise<TourPackage> {
    return mapPackage(
      await this.http.request<Raw>("/packages", {
        method: "POST",
        body: JSON.stringify({
          code: input.code,
          name_en: input.nameEn,
          name_ar: input.nameAr ?? "",
          description: input.description ?? "",
        }),
      }),
    );
  }

  async updatePackage(id: string, input: UpdatePackageInput): Promise<TourPackage> {
    return mapPackage(
      await this.http.request<Raw>(`/packages/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          code: input.code,
          name_en: input.nameEn,
          name_ar: input.nameAr,
          description: input.description,
          is_active: input.isActive,
        }),
      }),
    );
  }

  async clonePackage(input: ClonePackageInput): Promise<TourPackage> {
    return mapPackage(
      await this.http.request<Raw>(`/packages/${input.sourceId}/clone`, {
        method: "POST",
        body: JSON.stringify({
          code: input.code,
          name_en: input.nameEn ?? "",
          name_ar: input.nameAr ?? "",
        }),
      }),
    );
  }

  async listPackageTiers(packageId: string): Promise<PricingTier[]> {
    const data = await this.http.request<Raw[]>(`/packages/${packageId}/tiers`);
    return (Array.isArray(data) ? data : []).map(mapTier);
  }

  async setPackageTiers(packageId: string, tiers: TierInput[]): Promise<PricingTier[]> {
    const data = await this.http.request<Raw[]>(`/packages/${packageId}/tiers`, {
      method: "PUT",
      body: JSON.stringify({
        tiers: tiers.map((t) => ({
          code: t.code,
          label: t.label,
          kind: t.kind,
          amount: t.amount,
          currency: t.currency ?? "USD",
          is_active: t.isActive ?? true,
        })),
      }),
    });
    return (Array.isArray(data) ? data : []).map(mapTier);
  }

  async listDepartures(packageId: string): Promise<Departure[]> {
    const data = await this.http.request<Raw[]>(`/packages/${packageId}/departures`);
    return (Array.isArray(data) ? data : []).map(mapDeparture);
  }

  async getDeparture(id: string): Promise<Departure> {
    const raw = await this.http.request<Raw>(`/departures/${id}`);
    // legacy envelope { departure, remaining }
    if (raw.departure && typeof raw.departure === "object") {
      return mapDeparture({
        ...(raw.departure as Raw),
        remaining: raw.remaining,
      });
    }
    return mapDeparture(raw);
  }

  async createDeparture(input: CreateDepartureInput): Promise<Departure> {
    return mapDeparture(
      await this.http.request<Raw>(`/packages/${input.packageId}/departures`, {
        method: "POST",
        body: JSON.stringify({
          code: input.code,
          depart_date: input.departDate,
          return_date: input.returnDate,
          capacity_total: input.capacityTotal,
          base_price: input.basePrice,
          currency: input.currency ?? "USD",
          soft_threshold_pct: input.softThresholdPct ?? 80,
          allow_oversell: input.allowOversell ?? false,
        }),
      }),
    );
  }

  async cloneDeparture(input: CloneDepartureInput): Promise<Departure> {
    return mapDeparture(
      await this.http.request<Raw>(`/departures/${input.sourceId}/clone`, {
        method: "POST",
        body: JSON.stringify({
          code: input.code,
          depart_date: input.departDate,
          return_date: input.returnDate,
        }),
      }),
    );
  }

  async closeSales(departureId: string, closed: boolean): Promise<Departure> {
    return mapDeparture(
      await this.http.request<Raw>(`/departures/${departureId}/close-sales`, {
        method: "POST",
        body: JSON.stringify({ closed }),
      }),
    );
  }

  async markFull(departureId: string): Promise<Departure> {
    return mapDeparture(
      await this.http.request<Raw>(`/departures/${departureId}/mark-full`, {
        method: "POST",
      }),
    );
  }

  async readiness(departureId: string): Promise<DepartureReadiness> {
    return this.http.request<DepartureReadiness>(
      `/departures/${departureId}/readiness`,
    );
  }

  async listDepartureTiers(departureId: string): Promise<PricingTier[]> {
    const data = await this.http.request<Raw[]>(`/departures/${departureId}/tiers`);
    return (Array.isArray(data) ? data : []).map(mapTier);
  }
}

function nowIso() {
  return new Date().toISOString();
}

const PKG_ID = "pkg-umrah-standard";
const PKG_ID_2 = "pkg-hajj-premium";

const packages: TourPackage[] = [
  {
    id: PKG_ID,
    branchId: "11111111-1111-1111-1111-111111111111",
    code: "UMR-STD",
    nameEn: "Standard Umrah",
    nameAr: "عمرة قياسية",
    description: "4★ Madinah + Makkah · shared transport",
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: PKG_ID_2,
    branchId: "11111111-1111-1111-1111-111111111111",
    code: "HAJ-PREM",
    nameEn: "Premium Hajj",
    nameAr: "حج مميز",
    description: "5★ proximity packages · private guide",
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const departures: Departure[] = [
  {
    id: "dep-1",
    packageId: PKG_ID,
    code: "UMR-RAM-26",
    departDate: "2026-03-01",
    returnDate: "2026-03-14",
    capacityTotal: 40,
    capacitySold: 28,
    basePrice: 420000,
    currency: "USD",
    isActive: true,
    salesClosed: false,
    softThresholdPct: 80,
    allowOversell: false,
    alert: "low",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "dep-2",
    packageId: PKG_ID,
    code: "UMR-SHA-26",
    departDate: "2026-05-10",
    returnDate: "2026-05-20",
    capacityTotal: 35,
    capacitySold: 35,
    basePrice: 390000,
    currency: "USD",
    isActive: true,
    salesClosed: true,
    softThresholdPct: 80,
    allowOversell: false,
    alert: "full",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "dep-3",
    packageId: PKG_ID_2,
    code: "HAJ-26-A",
    departDate: "2026-05-28",
    returnDate: "2026-06-18",
    capacityTotal: 20,
    capacitySold: 12,
    basePrice: 1250000,
    currency: "USD",
    isActive: true,
    salesClosed: false,
    softThresholdPct: 80,
    allowOversell: false,
    alert: "ok",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

const packageTiers: Record<string, PricingTier[]> = {
  [PKG_ID]: [
    {
      id: "tier-1",
      packageId: PKG_ID,
      code: "DBL",
      label: "Double room",
      kind: "room",
      amount: 420000,
      currency: "USD",
      sortOrder: 0,
      isActive: true,
    },
    {
      id: "tier-2",
      packageId: PKG_ID,
      code: "CHILD",
      label: "Child 2-11",
      kind: "age",
      amount: 280000,
      currency: "USD",
      sortOrder: 1,
      isActive: true,
    },
  ],
};

const departureTiers: Record<string, PricingTier[]> = {
  "dep-1": [
    {
      id: "dt-1",
      departureId: "dep-1",
      code: "DBL",
      label: "Double room",
      kind: "room",
      amount: 420000,
      currency: "USD",
      sortOrder: 0,
      isActive: true,
    },
  ],
};

export class MemoryTourPackageRepository implements TourPackageRepository {
  async listPackages(activeOnly = true): Promise<TourPackage[]> {
    return [...packages]
      .filter((p) => !activeOnly || p.isActive)
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  async getPackage(id: string): Promise<TourPackage> {
    const found = packages.find((p) => p.id === id);
    if (!found) throw new Error("Package not found");
    return found;
  }

  async createPackage(input: CreatePackageInput): Promise<TourPackage> {
    const p: TourPackage = {
      id: crypto.randomUUID(),
      branchId: "11111111-1111-1111-1111-111111111111",
      code: input.code.trim(),
      nameEn: input.nameEn.trim(),
      nameAr: input.nameAr?.trim() ?? "",
      description: input.description?.trim() ?? "",
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    packages.unshift(p);
    packageTiers[p.id] = [];
    return p;
  }

  async updatePackage(id: string, input: UpdatePackageInput): Promise<TourPackage> {
    const p = await this.getPackage(id);
    if (input.code !== undefined) p.code = input.code;
    if (input.nameEn !== undefined) p.nameEn = input.nameEn;
    if (input.nameAr !== undefined) p.nameAr = input.nameAr;
    if (input.description !== undefined) p.description = input.description;
    if (input.isActive !== undefined) p.isActive = input.isActive;
    p.updatedAt = nowIso();
    return p;
  }

  async clonePackage(input: ClonePackageInput): Promise<TourPackage> {
    const src = await this.getPackage(input.sourceId);
    const p = await this.createPackage({
      code: input.code,
      nameEn: input.nameEn || `${src.nameEn} (copy)`,
      nameAr: input.nameAr ?? src.nameAr,
      description: src.description,
    });
    packageTiers[p.id] = (packageTiers[src.id] ?? []).map((t) => ({
      ...t,
      id: crypto.randomUUID(),
      packageId: p.id,
    }));
    return p;
  }

  async listPackageTiers(packageId: string): Promise<PricingTier[]> {
    return [...(packageTiers[packageId] ?? [])];
  }

  async setPackageTiers(packageId: string, tiers: TierInput[]): Promise<PricingTier[]> {
    await this.getPackage(packageId);
    packageTiers[packageId] = tiers.map((t, i) => ({
      id: crypto.randomUUID(),
      packageId,
      code: t.code,
      label: t.label,
      kind: t.kind,
      amount: t.amount,
      currency: t.currency ?? "USD",
      sortOrder: i,
      isActive: t.isActive ?? true,
    }));
    return packageTiers[packageId];
  }

  async listDepartures(packageId: string): Promise<Departure[]> {
    return departures
      .filter((d) => d.packageId === packageId)
      .sort((a, b) => a.departDate.localeCompare(b.departDate));
  }

  async getDeparture(id: string): Promise<Departure> {
    const found = departures.find((d) => d.id === id);
    if (!found) throw new Error("Departure not found");
    return found;
  }

  async createDeparture(input: CreateDepartureInput): Promise<Departure> {
    await this.getPackage(input.packageId);
    const d: Departure = {
      id: crypto.randomUUID(),
      packageId: input.packageId,
      code: input.code.trim(),
      departDate: input.departDate,
      returnDate: input.returnDate,
      capacityTotal: input.capacityTotal,
      capacitySold: 0,
      basePrice: input.basePrice,
      currency: input.currency?.trim() || "USD",
      isActive: true,
      salesClosed: false,
      softThresholdPct: input.softThresholdPct ?? 80,
      allowOversell: input.allowOversell ?? false,
      alert: "ok",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    departures.push(d);
    departureTiers[d.id] = (packageTiers[input.packageId] ?? []).map((t) => ({
      ...t,
      id: crypto.randomUUID(),
      departureId: d.id,
      packageId: undefined,
    }));
    return d;
  }

  async cloneDeparture(input: CloneDepartureInput): Promise<Departure> {
    const src = await this.getDeparture(input.sourceId);
    return this.createDeparture({
      packageId: src.packageId,
      code: input.code,
      departDate: input.departDate,
      returnDate: input.returnDate,
      capacityTotal: src.capacityTotal,
      basePrice: src.basePrice,
      currency: src.currency,
      softThresholdPct: src.softThresholdPct,
      allowOversell: src.allowOversell,
    });
  }

  async closeSales(departureId: string, closed: boolean): Promise<Departure> {
    const d = await this.getDeparture(departureId);
    d.salesClosed = closed;
    d.alert = closed || d.capacitySold >= d.capacityTotal ? "full" : d.alert;
    d.updatedAt = nowIso();
    return d;
  }

  async markFull(departureId: string): Promise<Departure> {
    return this.closeSales(departureId, true);
  }

  async readiness(departureId: string): Promise<DepartureReadiness> {
    const d = await this.getDeparture(departureId);
    return {
      departure_id: d.id,
      bookings_total: d.capacitySold > 0 ? 2 : 0,
      bookings_draft: 0,
      bookings_confirmed: d.capacitySold > 0 ? 1 : 0,
      bookings_cancelled: 0,
      pax_confirmed: d.capacitySold,
      capacity_total: d.capacityTotal,
      capacity_sold: d.capacitySold,
      remaining: Math.max(0, d.capacityTotal - d.capacitySold),
      alert: d.alert ?? "ok",
      sales_closed: d.salesClosed,
      pricing_locked: d.capacitySold > 0,
    };
  }

  async listDepartureTiers(departureId: string): Promise<PricingTier[]> {
    return [...(departureTiers[departureId] ?? [])];
  }
}

export function createTourPackageRepository(): TourPackageRepository {
  const http = new FetchHttpClient(env.apiBaseUrl, tokenFromCookie);
  const api = new ApiTourPackageRepository(http);
  const memory = new MemoryTourPackageRepository();
  const wrap = <A extends unknown[], R>(
    fn: (...args: A) => Promise<R>,
    fallback: (...args: A) => Promise<R>,
  ) =>
    async (...args: A) => {
      try {
        return await fn(...args);
      } catch {
        return fallback(...args);
      }
    };

  return {
    listPackages: wrap(api.listPackages.bind(api), memory.listPackages.bind(memory)),
    getPackage: wrap(api.getPackage.bind(api), memory.getPackage.bind(memory)),
    createPackage: wrap(api.createPackage.bind(api), memory.createPackage.bind(memory)),
    updatePackage: wrap(api.updatePackage.bind(api), memory.updatePackage.bind(memory)),
    clonePackage: wrap(api.clonePackage.bind(api), memory.clonePackage.bind(memory)),
    listPackageTiers: wrap(
      api.listPackageTiers.bind(api),
      memory.listPackageTiers.bind(memory),
    ),
    setPackageTiers: wrap(api.setPackageTiers.bind(api), memory.setPackageTiers.bind(memory)),
    listDepartures: wrap(api.listDepartures.bind(api), memory.listDepartures.bind(memory)),
    getDeparture: wrap(api.getDeparture.bind(api), memory.getDeparture.bind(memory)),
    createDeparture: wrap(api.createDeparture.bind(api), memory.createDeparture.bind(memory)),
    cloneDeparture: wrap(api.cloneDeparture.bind(api), memory.cloneDeparture.bind(memory)),
    closeSales: wrap(api.closeSales.bind(api), memory.closeSales.bind(memory)),
    markFull: wrap(api.markFull.bind(api), memory.markFull.bind(memory)),
    readiness: wrap(api.readiness.bind(api), memory.readiness.bind(memory)),
    listDepartureTiers: wrap(
      api.listDepartureTiers.bind(api),
      memory.listDepartureTiers.bind(memory),
    ),
  };
}
