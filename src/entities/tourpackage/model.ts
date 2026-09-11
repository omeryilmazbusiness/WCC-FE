export type TourPackage = {
  id: string;
  branchId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Departure = {
  id: string;
  packageId: string;
  code: string;
  departDate: string; // YYYY-MM-DD
  returnDate: string;
  capacityTotal: number;
  capacitySold: number;
  basePrice: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreatePackageInput = {
  code: string;
  nameEn: string;
  nameAr?: string;
  description?: string;
};

export type CreateDepartureInput = {
  packageId: string;
  code: string;
  departDate: string;
  returnDate: string;
  capacityTotal: number;
  basePrice: number;
  currency?: string;
};

export type CloneDepartureInput = {
  sourceId: string;
  code: string;
  departDate: string;
  returnDate: string;
};

export function departureRemaining(d: Departure): number {
  return Math.max(0, d.capacityTotal - d.capacitySold);
}
