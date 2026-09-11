import type {
  CloneDepartureInput,
  CreateDepartureInput,
  CreatePackageInput,
  Departure,
  TourPackage,
} from "./model";

export interface TourPackageRepository {
  listPackages(): Promise<TourPackage[]>;
  getPackage(id: string): Promise<TourPackage>;
  createPackage(input: CreatePackageInput): Promise<TourPackage>;
  listDepartures(packageId: string): Promise<Departure[]>;
  getDeparture(id: string): Promise<Departure>;
  createDeparture(input: CreateDepartureInput): Promise<Departure>;
  cloneDeparture(input: CloneDepartureInput): Promise<Departure>;
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
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

export class MemoryTourPackageRepository implements TourPackageRepository {
  async listPackages(): Promise<TourPackage[]> {
    return [...packages].sort((a, b) => a.code.localeCompare(b.code));
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
    return p;
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
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    departures.push(d);
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
    });
  }
}
