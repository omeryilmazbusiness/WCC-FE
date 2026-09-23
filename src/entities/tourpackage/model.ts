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
  departDate: string;
  returnDate: string;
  capacityTotal: number;
  capacitySold: number;
  remaining?: number;
  fillPct?: number;
  alert?: "ok" | "low" | "full" | "oversold" | string;
  basePrice: number;
  currency: string;
  isActive: boolean;
  salesClosed: boolean;
  softThresholdPct: number;
  allowOversell: boolean;
  pricingLocked?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PricingTier = {
  id: string;
  packageId?: string;
  departureId?: string;
  code: string;
  label: string;
  kind: "room" | "occupancy" | "age" | string;
  amount: number;
  currency: string;
  sortOrder: number;
  isActive: boolean;
};

export type DepartureReadiness = {
  departure_id: string;
  bookings_total: number;
  bookings_draft: number;
  bookings_confirmed: number;
  bookings_cancelled: number;
  pax_confirmed: number;
  capacity_total: number;
  capacity_sold: number;
  remaining: number;
  alert: string;
  sales_closed: boolean;
  pricing_locked: boolean;
};

export type CreatePackageInput = {
  code: string;
  nameEn: string;
  nameAr?: string;
  description?: string;
};

export type UpdatePackageInput = {
  code?: string;
  nameEn?: string;
  nameAr?: string;
  description?: string;
  isActive?: boolean;
};

export type CreateDepartureInput = {
  packageId: string;
  code: string;
  departDate: string;
  returnDate: string;
  capacityTotal: number;
  basePrice: number;
  currency?: string;
  softThresholdPct?: number;
  allowOversell?: boolean;
};

export type CloneDepartureInput = {
  sourceId: string;
  code: string;
  departDate: string;
  returnDate: string;
};

export type ClonePackageInput = {
  sourceId: string;
  code: string;
  nameEn?: string;
  nameAr?: string;
};

export type TierInput = {
  code: string;
  label: string;
  kind: string;
  amount: number;
  currency?: string;
  isActive?: boolean;
};

export function departureRemaining(d: Departure): number {
  if (typeof d.remaining === "number") return d.remaining;
  return Math.max(0, d.capacityTotal - d.capacitySold);
}
