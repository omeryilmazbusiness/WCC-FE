import type { PackageCategory, PackageKind, PackageSpec, TransportMode } from "./spec";

export type PackageStats = {
  departures: number;
  reserved: number;
  departureSeats: number;
  remaining: number;
  nextDepartDate: string | null;
  /** Cheapest active room price per person (minor units); 0 when none. */
  fromPrice: number;
  fromCurrency: string;
  costTotal: number;
  suggestedPrice: number;
};

export type TourPackage = {
  id: string;
  branchId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  description: string;
  isActive: boolean;
  salesOpen: boolean;
  kind: PackageKind;
  category: PackageCategory | string;
  durationDays: number;
  transportMode: TransportMode | string;
  capacityTotal: number;
  baseCurrency: string;
  spec: PackageSpec;
  stats: PackageStats;
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

export type PackageHeaderInput = {
  kind?: PackageKind;
  category?: string;
  durationDays?: number;
  transportMode?: string;
  capacityTotal?: number;
  baseCurrency?: string;
  salesOpen?: boolean;
};

export type CreatePackageInput = PackageHeaderInput & {
  code: string;
  nameEn: string;
  nameAr?: string;
  description?: string;
  spec?: PackageSpec;
  /** Replaces the pricing matrix in the same request. */
  tiers?: TierInput[];
};

export type UpdatePackageInput = PackageHeaderInput & {
  code?: string;
  nameEn?: string;
  nameAr?: string;
  description?: string;
  isActive?: boolean;
  spec?: PackageSpec;
  tiers?: TierInput[];
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

/** Seats still sellable: package quota when set, otherwise departure seats. */
export function packageRemaining(p: Pick<TourPackage, "capacityTotal" | "stats">): number {
  const total = p.capacityTotal > 0 ? p.capacityTotal : p.stats.departureSeats;
  return Math.max(0, total - p.stats.reserved);
}

/** Share of the quota already reserved, 0–100. */
export function packageFillPct(p: Pick<TourPackage, "capacityTotal" | "stats">): number {
  const total = p.capacityTotal > 0 ? p.capacityTotal : p.stats.departureSeats;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((p.stats.reserved / total) * 100));
}
