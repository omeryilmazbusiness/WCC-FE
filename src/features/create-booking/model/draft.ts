import {
  SALES_CHANNELS,
  SERVICE_TYPES,
  type BookingCreateInput,
  type Gender,
  type LineCategory,
  type LineItemInput,
  type ParticipantInput,
  type SalesChannel,
  type ServiceType,
  type SupplierSource,
} from "@/entities/booking/model";
import { parseMoneyInput } from "@/shared/lib/money";
import type { HotelPick } from "./hotel-pick";

export const BOOKING_CREATE_STEPS = ["party", "trip", "travellers", "services", "review"] as const;
export type BookingCreateStep = (typeof BOOKING_CREATE_STEPS)[number];

export const BOOKING_SERVICE_KINDS = ["package", "hotel", "flight", "bus", "transfer", "visa", "tour", "extras"] as const;
export type BookingServiceKind = (typeof BOOKING_SERVICE_KINDS)[number];

export const BOOKING_CURRENCIES = ["USD", "SAR", "EUR", "TRY", "AED", "GBP"] as const;

export type TravellerDraft = {
  key: string;
  fullName: string;
  gender: Gender | "";
  dateOfBirth: string;
  nationality: string;
  passportNo: string;
  nationalId: string;
  healthOk: boolean;
};

export const BUS_CLASSES = ["standard", "vip", "sleeper"] as const;
export type BusClass = (typeof BUS_CLASSES)[number];

/** One desk-entered coach segment on the booking. */
export type BusRide = {
  key: string;
  company: string;
  companyPhone: string;
  origin: string;
  destination: string;
  pickup: string;
  dropoff: string;
  departDate: string;
  arriveDate: string;
  departTime: string;
  arriveTime: string;
  vehicleClass: BusClass | "";
  plateNo: string;
  seats: number;
  seatNumbers: string;
  driverName: string;
  driverPhone: string;
  confirmation: string;
  unitPrice: string;
  unitCost: string;
  notes: string;
};

/** Snapshot of a visa type chosen from a visa package. */
export type VisaPick = {
  packageId: string;
  departureId: string | null;
  type: string;
  label: string;
  sellMinor: number;
  netMinor: number;
  currency: string;
  processingDays: number;
};

/** Snapshot of a fare chosen in the flight picker — not an Aviasales ticket. */
export type FlightPick = {
  airline: string;
  airlineName: string;
  flightNumber: string;
  origin: string;
  destination: string;
  originAirport: string;
  destinationAirport: string;
  localDeparture: string;
  price: number;
  currency: string;
  bookingUrl: string;
};

export type ServiceDraft = {
  key: string;
  kind: BookingServiceKind;
  label: string;
  travellerKeys: string[];
  quantity: number;
  unitPrice: string;
  unitCost: string;
};

export type BookingDraft = {
  customerId: string;
  customerLabel: string;
  channel: SalesChannel;
  companyName: string;
  notes: string;
  serviceType: ServiceType;
  packageId: string;
  departureId: string;
  supplierSource: SupplierSource | "";
  pnr: string;
  summary: string;
  currency: string;
  discountAmt: string;
  flight: FlightPick | null;
  visa: VisaPick | null;
  hotel: HotelPick | null;
  buses: BusRide[];
  travellers: TravellerDraft[];
  services: ServiceDraft[];
};

export function newKey(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyTraveller(name = ""): TravellerDraft {
  return {
    key: newKey("pax"),
    fullName: name,
    gender: "",
    dateOfBirth: "",
    nationality: "",
    passportNo: "",
    nationalId: "",
    healthOk: false,
  };
}

export function emptyService(kind: BookingServiceKind = "package"): ServiceDraft {
  return { key: newKey("svc"), kind, label: "", travellerKeys: [], quantity: 1, unitPrice: "0", unitCost: "0" };
}

export function emptyBookingDraft(seed?: {
  customerId?: string;
  customerLabel?: string;
  packageId?: string;
  departureId?: string;
}): BookingDraft {
  return {
    customerId: seed?.customerId ?? "",
    customerLabel: seed?.customerLabel ?? "",
    channel: "agent",
    companyName: "",
    notes: "",
    serviceType: "package",
    packageId: seed?.packageId ?? "",
    departureId: seed?.departureId ?? "",
    supplierSource: "",
    pnr: "",
    summary: "",
    currency: "USD",
    discountAmt: "0",
    flight: null,
    visa: null,
    hotel: null,
    buses: [],
    travellers: [emptyTraveller()],
    services: [emptyService("package")],
  };
}

export function serviceLineCategory(kind: BookingServiceKind): LineCategory {
  if (kind === "transfer" || kind === "bus") return "transport";
  if (kind === "visa" || kind === "tour") return "extras";
  return kind;
}

export function serviceQuantity(svc: ServiceDraft): number {
  if (svc.quantity > 0) return svc.quantity;
  return Math.max(1, svc.travellerKeys.length);
}

export function serviceLineLabel(svc: ServiceDraft, travellers: TravellerDraft[]): string {
  const named = svc.travellerKeys
    .map((key) => travellers.find((p) => p.key === key)?.fullName.trim())
    .filter((name): name is string => Boolean(name));
  const base = svc.label.trim() || svc.kind;
  return named.length ? `${base} — ${named.join(", ")}` : base;
}

export function moneyMinor(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "0" || trimmed === "0.00") return 0;
  return parseMoneyInput(trimmed);
}

export function draftLineTotal(svc: ServiceDraft): number {
  return serviceQuantity(svc) * Math.max(0, moneyMinor(svc.unitPrice) ?? 0);
}

export function draftSubtotal(draft: BookingDraft): number {
  return draft.services.reduce((sum, svc) => sum + draftLineTotal(svc), 0);
}

export function draftDiscount(draft: BookingDraft): number {
  return Math.max(0, moneyMinor(draft.discountAmt) ?? 0);
}

export function draftGrandTotal(draft: BookingDraft): number {
  return Math.max(0, draftSubtotal(draft) - draftDiscount(draft));
}

export type DraftIssues = Partial<Record<BookingCreateStep, string[]>>;

export function draftIssues(draft: BookingDraft): DraftIssues {
  const out: DraftIssues = {};
  const party: string[] = [];
  if (!draft.customerId) party.push("customer");
  if (!SALES_CHANNELS.includes(draft.channel)) party.push("channel");
  if (draft.channel === "b2b_agency" && !draft.companyName.trim()) party.push("companyName");
  if (party.length) out.party = party;

  const trip: string[] = [];
  if (!SERVICE_TYPES.includes(draft.serviceType)) trip.push("serviceType");
  if (!draft.departureId) trip.push("departure");
  if (draft.serviceType === "flight" && !draft.flight) trip.push("flight");
  if (draft.serviceType === "visa" && !draft.visa) trip.push("visa");
  if (draft.serviceType === "hotel" && !draft.hotel) trip.push("hotel");
  if (draft.serviceType === "bus" && draft.buses.length === 0) trip.push("bus");
  if (draft.serviceType === "bus") {
    draft.buses.forEach((ride, i) => {
      if (ride.company.trim().length < 2) trip.push(`busCompany:${i}`);
      if (!ride.origin.trim() || !ride.destination.trim()) trip.push(`busRoute:${i}`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ride.departDate)) trip.push(`busDepart:${i}`);
    });
  }
  if (draft.pnr && !/^[A-Z0-9][A-Z0-9-]{0,31}$/.test(draft.pnr.trim().toUpperCase())) trip.push("pnr");
  if (trip.length) out.trip = trip;

  const travellers: string[] = [];
  if (draft.travellers.length === 0) travellers.push("empty");
  draft.travellers.forEach((p, i) => {
    if (p.fullName.trim().length < 2) travellers.push(`name:${i}`);
    if (p.nationalId.trim() && !/^[A-Za-z0-9]{5,20}$/.test(p.nationalId.trim())) travellers.push(`nationalId:${i}`);
  });
  if (travellers.length) out.travellers = travellers;

  const services: string[] = [];
  if (draft.services.length === 0) services.push("empty");
  draft.services.forEach((svc, i) => {
    if (!BOOKING_SERVICE_KINDS.includes(svc.kind)) services.push(`kind:${i}`);
    if (moneyMinor(svc.unitPrice) === null || moneyMinor(svc.unitCost) === null) services.push(`money:${i}`);
  });
  const discount = moneyMinor(draft.discountAmt);
  if (discount === null || discount < 0 || discount > draftSubtotal(draft)) services.push("discount");
  if (services.length) out.services = services;

  return out;
}

export function firstIssueStep(issues: DraftIssues): BookingCreateStep | null {
  return BOOKING_CREATE_STEPS.find((step) => (issues[step]?.length ?? 0) > 0) ?? null;
}

export function stepHasIssues(issues: DraftIssues, step: BookingCreateStep): boolean {
  return (issues[step]?.length ?? 0) > 0;
}

/** A later step opens only after every earlier step is complete. Party is always open. */
export function isStepUnlocked(step: BookingCreateStep, issues: DraftIssues): boolean {
  const i = BOOKING_CREATE_STEPS.indexOf(step);
  if (i <= 0) return true;
  return BOOKING_CREATE_STEPS.slice(0, i).every((s) => !stepHasIssues(issues, s));
}

export function isStepComplete(step: BookingCreateStep, issues: DraftIssues): boolean {
  return isStepUnlocked(step, issues) && !stepHasIssues(issues, step);
}

export function toCreateInput(draft: BookingDraft): BookingCreateInput {
  const travellers = draft.travellers.filter((p) => p.fullName.trim().length >= 2);
  const participants: ParticipantInput[] = travellers.map((p) => ({
    fullName: p.fullName.trim(),
    gender: p.gender,
    dateOfBirth: p.dateOfBirth || null,
    nationality: p.nationality.trim().toUpperCase(),
    passportNo: p.passportNo.trim(),
    nationalId: p.nationalId.trim(),
    healthOk: p.healthOk,
  }));
  const items: LineItemInput[] = draft.services.map((svc) => ({
    kind: "item",
    category: serviceLineCategory(svc.kind),
    label: serviceLineLabel(svc, travellers),
    quantity: serviceQuantity(svc),
    unitPrice: Math.max(0, moneyMinor(svc.unitPrice) ?? 0),
    unitCost: Math.max(0, moneyMinor(svc.unitCost) ?? 0),
  }));
  return {
    customerId: draft.customerId,
    departureId: draft.departureId,
    paxCount: Math.max(1, participants.length),
    totalAmount: draftGrandTotal(draft),
    discountAmt: draftDiscount(draft),
    currency: draft.currency || "USD",
    notes: draft.notes.trim(),
    participants,
    items,
    profile: {
      serviceType: draft.serviceType,
      channel: draft.channel,
      companyName: draft.companyName.trim(),
      supplierSource: draft.supplierSource,
      pnr: draft.pnr.trim().toUpperCase(),
      summary: draft.summary.trim(),
    },
  };
}
