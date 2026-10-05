import { http, type HttpClient } from "@/shared/api/http-client";
import { createRepository } from "@/shared/api/repository";
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
import { DEFAULT_PACKAGE_CURRENCY, PACKAGE_KINDS, emptySpec, mapSpec, specPayload, type PackageKind } from "./spec";

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
  const stats = (raw.stats && typeof raw.stats === "object" ? raw.stats : {}) as Raw;
  const currency = String(raw.base_currency ?? raw.baseCurrency ?? DEFAULT_PACKAGE_CURRENCY);
  const kind = String(raw.kind ?? "umrah");
  return {
    id: String(raw.id),
    branchId: String(raw.branchId ?? raw.branch_id ?? ""),
    code: String(raw.code ?? ""),
    nameEn: String(raw.nameEn ?? raw.name_en ?? ""),
    nameAr: String(raw.nameAr ?? raw.name_ar ?? ""),
    description: String(raw.description ?? ""),
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
    salesOpen: Boolean(raw.sales_open ?? raw.salesOpen ?? true),
    kind: (PACKAGE_KINDS as readonly string[]).includes(kind) ? (kind as PackageKind) : "umrah",
    category: String(raw.category ?? ""),
    durationDays: Number(raw.duration_days ?? raw.durationDays ?? 0),
    transportMode: String(raw.transport_mode ?? raw.transportMode ?? "flight_scheduled"),
    capacityTotal: Number(raw.capacity_total ?? raw.capacityTotal ?? 0),
    baseCurrency: currency,
    spec: mapSpec(raw.spec, currency),
    stats: {
      departures: Number(stats.departures ?? 0),
      reserved: Number(stats.reserved ?? 0),
      departureSeats: Number(stats.departure_seats ?? 0),
      remaining: Number(stats.remaining ?? 0),
      nextDepartDate: stats.next_depart_date ? String(stats.next_depart_date).slice(0, 10) : null,
      fromPrice: Number(stats.from_price ?? 0),
      fromCurrency: String(stats.from_currency ?? "") || currency,
      costTotal: Number(stats.cost_total ?? 0),
      suggestedPrice: Number(stats.suggested_price ?? 0),
    },
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),
  };
}

function tiersPayload(tiers: TierInput[]) {
  return tiers.map((t) => ({
    code: t.code,
    label: t.label,
    kind: t.kind,
    amount: t.amount,
    currency: t.currency,
    is_active: t.isActive ?? true,
  }));
}

function headerPayload(input: CreatePackageInput | UpdatePackageInput): Raw {
  return {
    kind: input.kind,
    category: input.category,
    duration_days: input.durationDays,
    transport_mode: input.transportMode,
    capacity_total: input.capacityTotal,
    base_currency: input.baseCurrency,
    sales_open: input.salesOpen,
    spec: input.spec ? specPayload(input.spec) : undefined,
    tiers: input.tiers ? tiersPayload(input.tiers) : undefined,
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
          ...headerPayload(input),
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
          ...headerPayload(input),
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
        tiers: tiersPayload(tiers),
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

function memoryHeader(kind: PackageKind, category: string, durationDays: number, capacityTotal: number) {
  return {
    kind,
    category,
    durationDays,
    capacityTotal,
    salesOpen: true,
    transportMode: "flight_scheduled",
    baseCurrency: DEFAULT_PACKAGE_CURRENCY,
    spec: emptySpec(),
    stats: {
      departures: 0,
      reserved: 0,
      departureSeats: 0,
      remaining: capacityTotal,
      nextDepartDate: null,
      fromPrice: 0,
      fromCurrency: DEFAULT_PACKAGE_CURRENCY,
      costTotal: 0,
      suggestedPrice: 0,
    },
  };
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
    ...memoryHeader("umrah", "standard", 12, 40),
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
    ...memoryHeader("hajj", "long", 21, 20),
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

function withMemoryStats(p: TourPackage): TourPackage {
  const deps = departures.filter((d) => d.packageId === p.id && d.isActive);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = deps.map((d) => d.departDate).filter((d) => d >= today).sort();
  const rooms = (packageTiers[p.id] ?? []).filter((t) => t.kind === "room" && t.isActive && t.amount > 0);
  const cheapest = rooms.sort((a, b) => a.amount - b.amount)[0];
  const reserved = deps.reduce((n, d) => n + d.capacitySold, 0);
  const seats = deps.reduce((n, d) => n + d.capacityTotal, 0);
  const c = p.spec.costs;
  const cost = c.flight + c.hotel + c.visa + c.transfer + c.guidance + c.gifts;
  return {
    ...p,
    stats: {
      departures: deps.length,
      reserved,
      departureSeats: seats,
      remaining: Math.max(0, (p.capacityTotal || seats) - reserved),
      nextDepartDate: upcoming[0] ?? null,
      fromPrice: cheapest?.amount ?? 0,
      fromCurrency: cheapest?.currency ?? p.baseCurrency,
      costTotal: cost,
      suggestedPrice: Math.trunc((Math.trunc((cost * (100 + c.markupPct)) / 100) + 50) / 100) * 100,
    },
  };
}

export class MemoryTourPackageRepository implements TourPackageRepository {
  async listPackages(activeOnly = true): Promise<TourPackage[]> {
    return [...packages]
      .filter((p) => !activeOnly || p.isActive)
      .map(withMemoryStats)
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  async getPackage(id: string): Promise<TourPackage> {
    const found = packages.find((p) => p.id === id);
    if (!found) throw new Error("Package not found");
    return withMemoryStats(found);
  }

  async createPackage(input: CreatePackageInput): Promise<TourPackage> {
    const kind = input.kind ?? "umrah";
    const p: TourPackage = {
      id: crypto.randomUUID(),
      branchId: "11111111-1111-1111-1111-111111111111",
      code: input.code.trim().toUpperCase(),
      nameEn: input.nameEn.trim(),
      nameAr: input.nameAr?.trim() ?? "",
      description: input.description?.trim() ?? "",
      isActive: true,
      ...memoryHeader(kind, input.category ?? (kind === "hajj" ? "long" : "standard"), input.durationDays ?? 0, input.capacityTotal ?? 0),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    if (input.transportMode) p.transportMode = input.transportMode;
    if (input.baseCurrency) p.baseCurrency = input.baseCurrency;
    if (input.salesOpen !== undefined) p.salesOpen = input.salesOpen;
    if (input.spec) p.spec = structuredClone(input.spec);
    packages.unshift(p);
    packageTiers[p.id] = [];
    if (input.tiers) await this.setPackageTiers(p.id, input.tiers);
    return this.getPackage(p.id);
  }

  async updatePackage(id: string, input: UpdatePackageInput): Promise<TourPackage> {
    const p = packages.find((x) => x.id === id);
    if (!p) throw new Error("Package not found");
    if (input.code !== undefined) p.code = input.code.trim().toUpperCase();
    if (input.nameEn !== undefined) p.nameEn = input.nameEn;
    if (input.nameAr !== undefined) p.nameAr = input.nameAr;
    if (input.description !== undefined) p.description = input.description;
    if (input.isActive !== undefined) p.isActive = input.isActive;
    if (input.kind !== undefined) p.kind = input.kind;
    if (input.category !== undefined) p.category = input.category;
    if (input.durationDays !== undefined) p.durationDays = input.durationDays;
    if (input.transportMode !== undefined) p.transportMode = input.transportMode;
    if (input.capacityTotal !== undefined) p.capacityTotal = input.capacityTotal;
    if (input.baseCurrency !== undefined) p.baseCurrency = input.baseCurrency;
    if (input.salesOpen !== undefined) p.salesOpen = input.salesOpen;
    if (input.spec) p.spec = structuredClone(input.spec);
    if (input.tiers) await this.setPackageTiers(p.id, input.tiers);
    p.updatedAt = nowIso();
    return this.getPackage(p.id);
  }

  async clonePackage(input: ClonePackageInput): Promise<TourPackage> {
    const src = await this.getPackage(input.sourceId);
    const p = await this.createPackage({
      code: input.code,
      nameEn: input.nameEn || `${src.nameEn} (copy)`,
      nameAr: input.nameAr ?? src.nameAr,
      description: src.description,
      kind: src.kind,
      category: src.category,
      durationDays: src.durationDays,
      transportMode: src.transportMode,
      capacityTotal: src.capacityTotal,
      baseCurrency: src.baseCurrency,
      spec: src.spec,
    });
    packageTiers[p.id] = (packageTiers[src.id] ?? []).map((t) => ({
      ...t,
      id: crypto.randomUUID(),
      packageId: p.id,
    }));
    return this.getPackage(p.id);
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
      currency: t.currency ?? DEFAULT_PACKAGE_CURRENCY,
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
  const api = new ApiTourPackageRepository(http);
  const memory = new MemoryTourPackageRepository();
  return createRepository<TourPackageRepository>({
    api,
    memory,
    reads: [
      "listPackages",
      "getPackage",
      "listPackageTiers",
      "listDepartures",
      "getDeparture",
      "readiness",
      "listDepartureTiers",
    ],
  });
}
