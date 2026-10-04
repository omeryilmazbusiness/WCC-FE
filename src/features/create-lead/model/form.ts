import { z } from "zod";
import {
  BOARD_TYPES,
  CABIN_CLASSES,
  FLIGHT_PREFERENCES,
  LEAD_INTENTS,
  LEAD_PRIORITIES,
  LEAD_SEGMENTS,
  LEAD_SERVICES,
  MAX_CHILDREN,
  MAX_FLEX_DAYS,
  TRIP_PREFERENCES,
  emptyLeadProfile,
  emptyTripInterest,
  type Lead,
  type LeadProfile,
  type LeadService,
  type TripInterest,
} from "@/entities/lead";

/** Values a caller can prefill; interest amounts are in minor units. */
export type LeadPrefill = {
  fullName?: string;
  phone?: string;
  source?: string;
  notes?: string;
  interest?: Partial<TripInterest>;
};

const MAX_PAX = 500;
const TAX_NUMBER = /^[A-Z0-9-]{4,20}$/;
/** Services whose quote depends on a hotel board type. */
const BOARD_SERVICES: readonly LeadService[] = ["hotel", "tour"];

export const needsCabin = (services: readonly string[]) => services.includes("flight");
export const needsBoard = (services: readonly string[]) => services.some((s) => BOARD_SERVICES.includes(s as LeadService));

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) => z.union([z.enum(values), z.literal("")]);

export function makeLeadSchema(t: (key: string) => string, creating: boolean) {
  return z
    .object({
      fullName: z.string().trim().min(2, t("errors.fullName")).max(200),
      phone: z.string().trim().min(6, t("errors.phone")).max(40),
      email: z.string().trim().max(254),
      segment: z.enum(LEAD_SEGMENTS),
      companyName: z.string().trim().max(200),
      taxNumber: z.string(),
      taxOffice: z.string().trim().max(120),
      source: z.string().max(120),
      ownerId: creating ? z.string().min(1, t("errors.owner")) : z.string(),
      customerId: z.string(),
      notes: z.string().max(2000),
      services: z.array(z.enum(LEAD_SERVICES)),
      origin: z.string().trim().max(80),
      destination: z.string().trim().max(80),
      travelDate: z.string(),
      returnDate: z.string(),
      flexDays: z.number().int().min(0).max(MAX_FLEX_DAYS),
      travelWindow: z.string().max(80),
      adults: z.number().int().min(0),
      childAges: z.array(z.number().int()).max(MAX_CHILDREN),
      infants: z.number().int().min(0),
      cabinClass: optionalEnum(CABIN_CLASSES),
      boardType: optionalEnum(BOARD_TYPES),
      preferences: z.array(z.enum(TRIP_PREFERENCES)),
      budgetAmount: z
        .string()
        .refine((v) => v === "" || /^\d{1,10}([.,]\d{1,2})?$/.test(v.trim()), t("errors.budget")),
      budgetCurrency: z
        .string()
        .refine((v) => v === "" || /^[A-Za-z]{3}$/.test(v.trim()), t("errors.currency")),
      packageId: z.string(),
      packageInterest: z.string().max(200),
      priority: z.enum(LEAD_PRIORITIES),
      intent: optionalEnum(LEAD_INTENTS),
      /** Local "YYYY-MM-DDTHH:mm" from a datetime-local input. */
      nextFollowUpAt: z.string(),
    })
    .superRefine((v, ctx) => {
      const issue = (path: string, key: string) => ctx.addIssue({ code: "custom", path: [path], message: t(key) });
      if (v.budgetAmount.trim() && !v.budgetCurrency.trim()) issue("budgetCurrency", "errors.currencyRequired");
      if (v.email && !z.email().safeParse(v.email).success) issue("email", "errors.email");
      if (v.segment === "b2b") {
        if (!v.companyName) issue("companyName", "errors.companyName");
        const tax = normalizeTaxNumber(v.taxNumber);
        if (tax && !TAX_NUMBER.test(tax)) issue("taxNumber", "errors.taxNumber");
      }
      if (v.travelDate && v.returnDate && v.returnDate < v.travelDate) issue("returnDate", "errors.returnDate");
      const party = v.adults + v.childAges.length + v.infants;
      if (party > 0 && v.adults === 0) issue("adults", "errors.adults");
      if (party > MAX_PAX) issue("adults", "errors.pax");
      if (v.infants > v.adults) issue("infants", "errors.infants");
      if (v.childAges.some((age) => age < 0)) issue("childAges", "errors.childAge");
    });
}

export type LeadFormValues = z.infer<ReturnType<typeof makeLeadSchema>>;

/** Form fields the backend may report errors for (snake_case keys map to these). */
export const LEAD_FORM_FIELDS = [
  "fullName", "phone", "email", "segment", "companyName", "taxNumber", "taxOffice", "source", "ownerId",
  "customerId", "notes", "services", "origin", "destination", "travelDate", "returnDate", "flexDays",
  "travelWindow", "adults", "childAges", "infants", "cabinClass", "boardType", "preferences",
  "budgetAmount", "budgetCurrency", "packageId", "packageInterest", "priority", "intent", "nextFollowUpAt",
] as const satisfies readonly (keyof LeadFormValues)[];

function normalizeTaxNumber(v: string): string {
  return v.replace(/\s+/g, "").toUpperCase();
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO timestamp → local "YYYY-MM-DDTHH:mm" for a datetime-local input. */
export function toLocalDateTime(iso: string | null | Date): string {
  if (!iso) return "";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toLeadFormValues(lead: Lead | null | undefined, prefill: LeadPrefill | undefined): LeadFormValues {
  const interest: TripInterest = { ...emptyTripInterest(), ...lead?.interest, ...prefill?.interest };
  const profile: LeadProfile = lead?.profile ?? emptyLeadProfile();
  const hasBreakdown = interest.adults + interest.childAges.length + interest.infants > 0;
  const adults = hasBreakdown ? interest.adults : (interest.paxCount ?? (lead ? 0 : 1));
  return {
    fullName: prefill?.fullName ?? lead?.fullName ?? "",
    phone: prefill?.phone ?? lead?.phone ?? "",
    email: profile.email,
    segment: profile.segment,
    companyName: profile.companyName,
    taxNumber: profile.taxNumber,
    taxOffice: profile.taxOffice,
    source: prefill?.source ?? lead?.source ?? "",
    ownerId: "",
    customerId: "",
    notes: prefill?.notes ?? lead?.notes ?? "",
    services: [...interest.services],
    origin: interest.origin,
    destination: interest.destination,
    travelDate: interest.travelDate ?? "",
    returnDate: interest.returnDate ?? "",
    flexDays: interest.flexDays,
    travelWindow: interest.travelWindow,
    adults,
    childAges: [...interest.childAges],
    infants: interest.infants,
    cabinClass: interest.cabinClass,
    boardType: interest.boardType,
    preferences: [...interest.preferences],
    budgetAmount: interest.budgetAmount != null ? String(interest.budgetAmount / 100) : "",
    budgetCurrency: interest.budgetCurrency,
    packageId: interest.packageId ?? "",
    packageInterest: interest.packageInterest,
    priority: profile.priority,
    intent: profile.intent,
    nextFollowUpAt: toLocalDateTime(profile.nextFollowUpAt),
  };
}

const IATA = /^[A-Za-z]{3}$/;

function place(v: string, flight: boolean): string {
  const s = v.trim().replace(/\s+/g, " ");
  return flight && IATA.test(s) ? s.toUpperCase() : s;
}

export function toLeadProfile(v: LeadFormValues): LeadProfile {
  const corporate = v.segment === "b2b";
  return {
    email: v.email.trim().toLowerCase(),
    segment: v.segment,
    companyName: corporate ? v.companyName.trim() : "",
    taxNumber: corporate ? normalizeTaxNumber(v.taxNumber) : "",
    taxOffice: corporate ? v.taxOffice.trim() : "",
    priority: v.priority,
    intent: v.intent,
    nextFollowUpAt: v.nextFollowUpAt ? new Date(v.nextFollowUpAt).toISOString() : null,
  };
}

export function toTripInterest(v: LeadFormValues): TripInterest {
  const flight = needsCabin(v.services);
  const budget = v.budgetAmount.trim();
  const party = v.adults + v.childAges.length + v.infants;
  return {
    services: LEAD_SERVICES.filter((s) => v.services.includes(s)),
    origin: place(v.origin, flight),
    destination: place(v.destination, flight),
    travelDate: v.travelDate || null,
    returnDate: v.returnDate || null,
    flexDays: v.flexDays,
    travelWindow: v.travelWindow.trim(),
    adults: v.adults,
    childAges: v.childAges,
    infants: v.infants,
    paxCount: party > 0 ? party : null,
    cabinClass: flight ? v.cabinClass : "",
    boardType: needsBoard(v.services) ? v.boardType : "",
    preferences: TRIP_PREFERENCES.filter(
      (p) => v.preferences.includes(p) && (flight || !FLIGHT_PREFERENCES.includes(p)),
    ),
    budgetAmount: budget ? Math.round(Number(budget.replace(",", ".")) * 100) : null,
    budgetCurrency: v.budgetCurrency.trim().toUpperCase(),
    packageId: v.packageId || null,
    packageInterest: v.packageInterest.trim(),
  };
}
