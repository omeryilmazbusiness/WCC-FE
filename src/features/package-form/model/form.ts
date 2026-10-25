import { z } from "zod";
import {
  AGE_TIERS,
  COST_LINES,
  DEFAULT_PACKAGE_CURRENCY,
  applyKindOffer,
  isPersonalCategory,
  isPilgrimage,
  isValidCategory,
  isVisaKind,
  ROOM_TIERS,
  emptySpec,
  stayNights,
  stayPlanNights,
  type CostLine,
  type CreatePackageInput,
  type PackageKind,
  type PackageSpec,
  type PricingTier,
  type TierInput,
  type TourPackage,
} from "@/entities/tourpackage";
import { minorToInput, parseMoneyInput } from "@/shared/lib/money";

const CODE = /^[A-Z0-9][A-Z0-9-]{1,31}$/;
const ROUTE = /^[A-Z]{3}(-[A-Z]{3}){1,3}$/;

export const MATRIX_CODES = [...ROOM_TIERS.map((t) => t.code), ...AGE_TIERS.map((t) => t.code)] as const;
const ROOM_CODES = new Set<string>(ROOM_TIERS.map((t) => t.code));

export type PackageFormValues = {
  code: string;
  nameEn: string;
  nameAr: string;
  description: string;
  kind: PackageKind;
  category: string;
  durationDays: number;
  transportMode: string;
  capacityTotal: number;
  baseCurrency: string;
  salesOpen: boolean;
  customerId: string;
  customerName: string;
  spec: PackageSpec;
  /** Per-person price inputs (major units) keyed by tier code. */
  prices: Record<string, string>;
  /** Net cost inputs (major units) per cost line. */
  costs: Record<CostLine, string>;
  /** Bus seat price (major units). */
  busPrice: string;
  /** Visa desk types (prices in major units). */
  visaOffers: VisaOfferForm[];
};

export type VisaOfferForm = {
  type: string;
  net: string;
  sell: string;
  processingDays: number;
  healthInsurance: boolean;
  notes: string;
};

export function emptyVisaOfferForm(type = ""): VisaOfferForm {
  return { type, net: "", sell: "", processingDays: 7, healthInsurance: false, notes: "" };
}

const money = (v: unknown) => {
  if (v == null || v === "") return true;
  return parseMoneyInput(String(v)) !== null;
};

/** `t` resolves keys under `packages.form`. */
export function packageFormSchema(t: (key: string) => string) {
  return z
    .object({
      code: z.string().trim().toUpperCase().regex(CODE, t("errors.code")),
      nameEn: z.string().trim().min(3, t("errors.name")).max(160),
      nameAr: z.string().trim().max(160),
      description: z.string().trim().max(1000),
      kind: z.enum(["umrah", "hajj", "other", "visa"]),
      category: z.string(),
      durationDays: z.number(t("errors.duration")).int().min(1, t("errors.duration")).max(60, t("errors.duration")),
      transportMode: z.string(),
      capacityTotal: z.number(t("errors.capacity")).int().min(0, t("errors.capacity")).max(10000, t("errors.capacity")),
      baseCurrency: z.string().length(3),
      salesOpen: z.boolean(),
      customerId: z.string(),
      customerName: z.string(),
      spec: z.custom<PackageSpec>((v) => Boolean(v && typeof v === "object")),
      prices: z.record(z.string(), z.string()),
      costs: z.record(z.string(), z.string()),
      busPrice: z.string(),
      visaOffers: z
        .array(
          z.object({
            type: z.string().default(""),
            net: z.string().default(""),
            sell: z.string().default(""),
            processingDays: z.coerce.number().default(7),
            healthInsurance: z.boolean().default(false),
            notes: z.string().default(""),
          }),
        )
        .default([]),
    })
    .superRefine((v, ctx) => {
      const issue = (path: (string | number)[], key: string) => ctx.addIssue({ code: "custom", path, message: t(key) });
      if (!isValidCategory(v.kind, v.category)) issue(["category"], "errors.category");
      if (isPersonalCategory(v.category) && !v.customerId.trim()) issue(["customerId"], "errors.customer");

      const s = v.spec;
      if (isVisaKind(v.kind)) {
        const offers = v.visaOffers ?? [];
        if (!offers.some((o) => o.type && (parseMoneyInput(String(o.sell ?? "")) ?? 0) > 0)) {
          issue(["visaOffers"], "errors.visaOffer");
          if (offers.length) issue(["visaOffers", 0, "sell"], "errors.visaOffer");
        }
        const types = offers.map((o) => o.type).filter(Boolean);
        if (new Set(types).size !== types.length) issue(["visaOffers"], "errors.visaDuplicate");
        offers.forEach((o, i) => {
          if (!money(o.net) || !money(o.sell)) issue(["visaOffers", i, "sell"], "errors.money");
          if (o.processingDays < 0 || o.processingDays > 90) issue(["visaOffers", i, "processingDays"], "errors.processingDays");
        });
        const r = s?.requirements;
        if (r && (r.passportMonths < 0 || r.passportMonths > 24)) issue(["spec", "requirements", "passportMonths"], "errors.passportMonths");
        return;
      }
      if (v.kind === "other") {
        if (s.destination.country.trim().length < 2) issue(["spec", "destination", "country"], "errors.country");
        if (s.destination.districts.length === 0) issue(["spec", "destination", "districts"], "errors.districts");
        if (stayPlanNights(s) > v.durationDays) issue(["spec", "stays"], "errors.stayNights");
      }
      if (isPilgrimage(v.kind) && s.nights.makkah + s.nights.madinah > v.durationDays) issue(["spec", "nights", "makkah"], "errors.nights");
      for (const city of ["makkah", "madinah"] as const) {
        const h = s[city];
        if (!h) continue;
        if (h.checkIn && h.checkOut && h.checkOut <= h.checkIn) issue(["spec", city, "checkOut"], "errors.checkOut");
        else if (s.nights[city] > 0 && stayNights(h) !== null && stayNights(h) !== s.nights[city]) issue(["spec", city, "checkOut"], "errors.stay");
        if (h.distanceM < 0 || h.distanceM > 50000) issue(["spec", city, "distanceM"], "errors.distance");
      }
      if (!isVisaKind(v.kind) && v.transportMode !== "road") {
        for (const leg of ["outbound", "inbound"] as const) {
          const route = s.flights[leg].route.trim().toUpperCase();
          if (route && !ROUTE.test(route)) issue(["spec", "flights", leg, "route"], "errors.route");
        }
        const { outbound, inbound } = s.flights;
        if (outbound.date && inbound.date && inbound.date < outbound.date) issue(["spec", "flights", "inbound", "date"], "errors.inbound");
      }
      for (const [code, value] of Object.entries(v.prices)) if (!money(value)) issue(["prices", code], "errors.money");
      for (const [line, value] of Object.entries(v.costs)) if (!money(value)) issue(["costs", line], "errors.money");
      if (!money(v.busPrice)) issue(["busPrice"], "errors.money");
      if (s.costs && (s.costs.markupPct < 0 || s.costs.markupPct > 300)) issue(["spec", "costs", "markupPct"], "errors.markup");

      for (const field of ["services", "activities"] as const) {
        (s[field] ?? []).forEach((a, i) => {
          if (a.details.trim() && !a.title.trim()) issue(["spec", field, i, "title"], "errors.itemTitle");
        });
      }

      if (!isVisaKind(v.kind)) {
        const seen = new Set<number>();
        s.itinerary.forEach((d, i) => {
          if (!d.title.trim()) issue(["spec", "itinerary", i, "title"], "errors.dayTitle");
          if (d.day < 1 || d.day > v.durationDays) issue(["spec", "itinerary", i, "day"], "errors.dayRange");
          else if (seen.has(d.day)) issue(["spec", "itinerary", i, "day"], "errors.dayDuplicate");
          seen.add(d.day);
        });
      }
      const r = s.requirements;
      if (r.passportMonths < 0 || r.passportMonths > 24) issue(["spec", "requirements", "passportMonths"], "errors.passportMonths");
    });
}

export function packageFormDefaults(pkg?: TourPackage | null, tiers: readonly PricingTier[] = []): PackageFormValues {
  const prices: Record<string, string> = Object.fromEntries(MATRIX_CODES.map((c) => [c, ""]));
  for (const tier of tiers) if (tier.code in prices && tier.amount > 0) prices[tier.code] = minorToInput(tier.amount);
  if (!pkg) {
    const spec = emptySpec();
    spec.visa.type = "UMRAH_VISA";
    spec.transfers = { ...spec.transfers, intercity: "haramain_train", airportMeet: true, hotelTransfers: true };
    spec.kit = ["ihram", "prayer_book", "zamzam"];
    return {
      code: "",
      nameEn: "",
      nameAr: "",
      description: "",
      kind: "umrah",
      category: "standard",
      durationDays: 14,
      transportMode: "flight_scheduled",
      capacityTotal: 45,
      baseCurrency: DEFAULT_PACKAGE_CURRENCY,
      salesOpen: true,
      customerId: "",
      customerName: "",
      spec,
      prices,
      costs: Object.fromEntries(COST_LINES.map((l) => [l, ""])) as Record<CostLine, string>,
      busPrice: "",
      visaOffers: [],
    };
  }
  const spec = structuredClone(pkg.spec);
  return {
    code: pkg.code,
    nameEn: pkg.nameEn,
    nameAr: pkg.nameAr,
    description: pkg.description,
    kind: pkg.kind,
    category: pkg.category,
    durationDays: pkg.durationDays || 1,
    transportMode: pkg.transportMode,
    capacityTotal: pkg.capacityTotal,
    baseCurrency: pkg.baseCurrency,
    salesOpen: pkg.salesOpen,
    customerId: pkg.customerId ?? "",
    customerName: pkg.customerName || pkg.customerNameAr || "",
    spec,
    prices,
    costs: Object.fromEntries(COST_LINES.map((l) => [l, spec.costs[l] ? minorToInput(spec.costs[l]) : ""])) as Record<CostLine, string>,
    busPrice: spec.bus.price ? minorToInput(spec.bus.price) : "",
    visaOffers: spec.visaOffers.map((o) => ({
      type: o.type,
      net: o.net ? minorToInput(o.net) : "",
      sell: o.sell ? minorToInput(o.sell) : "",
      processingDays: o.processingDays,
      healthInsurance: o.healthInsurance,
      notes: o.notes,
    })),
  };
}

/**
 * Builds the API input. Matrix rows with a price become tiers; tiers with codes this form
 * does not know (e.g. a VIP suite added elsewhere) are kept as they are.
 */
export function toPackageInput(
  v: PackageFormValues,
  tierLabel: (code: string) => string,
  existing: readonly PricingTier[] = [],
): CreatePackageInput {
  const spec: PackageSpec = structuredClone(v.spec);
  for (const line of COST_LINES) spec.costs[line] = parseMoneyInput(v.costs[line] ?? "") ?? 0;
  spec.costs.currency = v.baseCurrency;
  spec.bus.price = parseMoneyInput(v.busPrice ?? "") ?? 0;
  spec.visaOffers = isVisaKind(v.kind)
    ? v.visaOffers
        .filter((o) => o.type)
        .map((o) => ({
          type: o.type as PackageSpec["visaOffers"][number]["type"],
          net: parseMoneyInput(o.net) ?? 0,
          sell: parseMoneyInput(o.sell) ?? 0,
          processingDays: o.processingDays,
          healthInsurance: o.healthInsurance,
          notes: o.notes.trim(),
        }))
    : [];
  spec.flights.outbound.route = spec.flights.outbound.route.trim().toUpperCase();
  spec.flights.inbound.route = spec.flights.inbound.route.trim().toUpperCase();
  spec.itinerary = [...spec.itinerary].sort((a, b) => a.day - b.day);
  applyKindOffer(spec, v.kind);

  const tiers: TierInput[] = [];
  for (const code of MATRIX_CODES) {
    const amount = parseMoneyInput(v.prices[code] ?? "");
    if (!amount) continue;
    tiers.push({ code, label: tierLabel(code), kind: ROOM_CODES.has(code) ? "room" : "age", amount, currency: v.baseCurrency, isActive: true });
  }
  const known = new Set<string>(MATRIX_CODES);
  for (const t of existing) {
    if (known.has(t.code)) continue;
    tiers.push({ code: t.code, label: t.label, kind: t.kind, amount: t.amount, currency: t.currency, isActive: t.isActive });
  }

  return {
    code: v.code.trim().toUpperCase(),
    nameEn: v.nameEn.trim(),
    nameAr: v.nameAr.trim(),
    description: v.description.trim(),
    kind: v.kind,
    category: v.category,
    durationDays: v.durationDays,
    transportMode: v.transportMode,
    capacityTotal: v.capacityTotal,
    baseCurrency: v.baseCurrency,
    salesOpen: v.salesOpen,
    customerId: isPersonalCategory(v.category) ? v.customerId.trim() || null : null,
    spec,
    tiers,
  };
}
