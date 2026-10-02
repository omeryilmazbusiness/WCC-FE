import type { FlightSearchParams, Passengers } from "@/entities/flight";

/** Mirrors `internal/domain/flight` validation. */
export const FLIGHT_CURRENCIES = ["USD", "EUR", "SAR", "AED", "TRY", "GBP", "QAR", "KWD", "JOD", "EGP"] as const;
export type FlightCurrency = (typeof FLIGHT_CURRENCIES)[number];
export const MAX_TRAVELLERS = 9;
/** How far ahead the provider has fares. */
export const MAX_ADVANCE_DAYS = 365;

export function isFlightCurrency(value: unknown): value is FlightCurrency {
  return typeof value === "string" && (FLIGHT_CURRENCIES as readonly string[]).includes(value);
}

/** A chosen place: the IATA code sent to the API plus what the field shows. */
export type PlaceChoice = { code: string; label: string };

export type FlightSearchForm = {
  origin: PlaceChoice | null;
  destination: PlaceChoice | null;
  /** `YYYY-MM-DD` */
  date: string;
  /** `HH:MM`, wall clock at the origin; "" searches the whole day. */
  time: string;
  passengers: Passengers;
  currency: FlightCurrency;
  direct: boolean;
};

export type FormField = "origin" | "destination" | "date" | "time" | "passengers";
export type FormErrorCode = "required" | "sameAsOrigin" | "past" | "tooFar" | "invalid" | "infants" | "tooMany";
export type FormErrors = Partial<Record<FormField, FormErrorCode>>;

export type PassengerKind = keyof Passengers;

export const DEFAULT_CURRENCY: FlightCurrency = "USD";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const IATA = /^[A-Z]{3}$/;

const pad = (n: number) => String(n).padStart(2, "0");

/** The viewer's calendar day, `YYYY-MM-DD`. */
export function localDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return localDay(new Date(y, m - 1, d + days));
}

function isRealDay(day: string): boolean {
  if (!DAY.test(day)) return false;
  return addDays(day, 0) === day;
}

export function defaultForm(today: string): FlightSearchForm {
  return {
    origin: null,
    destination: null,
    date: addDays(today, 1),
    time: "",
    passengers: { adults: 1, children: 0, infants: 0 },
    currency: DEFAULT_CURRENCY,
    direct: false,
  };
}

export function totalTravellers(p: Passengers): number {
  return p.adults + p.children + p.infants;
}

/** Whether one step of `delta` on `kind` keeps the party bookable. */
export function canStep(p: Passengers, kind: PassengerKind, delta: 1 | -1): boolean {
  const next = { ...p, [kind]: p[kind] + delta };
  if (delta > 0) {
    if (totalTravellers(next) > MAX_TRAVELLERS) return false;
    return kind !== "infants" || next.infants <= next.adults;
  }
  return kind === "adults" ? next.adults >= 1 : next[kind] >= 0;
}

/** One step; dropping adults below the infants takes infants down with them (one lap each). */
export function stepPassengers(p: Passengers, kind: PassengerKind, delta: 1 | -1): Passengers {
  if (!canStep(p, kind, delta)) return p;
  const next = { ...p, [kind]: p[kind] + delta };
  if (next.infants > next.adults) next.infants = next.adults;
  return next;
}

export function validateForm(form: FlightSearchForm, today: string): FormErrors {
  const errors: FormErrors = {};
  if (!form.origin || !IATA.test(form.origin.code)) errors.origin = "required";
  if (!form.destination || !IATA.test(form.destination.code)) errors.destination = "required";
  else if (form.origin && form.origin.code === form.destination.code) errors.destination = "sameAsOrigin";

  if (!form.date) errors.date = "required";
  else if (!isRealDay(form.date)) errors.date = "invalid";
  else if (form.date < today) errors.date = "past";
  else if (form.date > addDays(today, MAX_ADVANCE_DAYS)) errors.date = "tooFar";

  if (form.time && !TIME.test(form.time)) errors.time = "invalid";

  const p = form.passengers;
  const counts = [p.adults, p.children, p.infants];
  if (counts.some((n) => !Number.isInteger(n) || n < 0) || p.adults < 1) errors.passengers = "invalid";
  else if (p.infants > p.adults) errors.passengers = "infants";
  else if (totalTravellers(p) > MAX_TRAVELLERS) errors.passengers = "tooMany";
  return errors;
}

export function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** API parameters for a form that passed `validateForm`. */
export function toSearchParams(form: FlightSearchForm): FlightSearchParams | null {
  if (!form.origin || !form.destination) return null;
  return {
    origin: form.origin.code,
    destination: form.destination.code,
    date: form.date,
    time: form.time,
    passengers: { ...form.passengers },
    currency: form.currency,
    direct: form.direct,
  };
}

export function swapPlaces(form: FlightSearchForm): FlightSearchForm {
  return { ...form, origin: form.destination, destination: form.origin };
}

// URL: the submitted search lives in the query string so it survives reloads and can be shared.

const LABEL_MAX = 80;

function readCount(sp: URLSearchParams, key: string, fallback: number): number {
  const raw = sp.get(key);
  if (raw === null || !/^\d{1,2}$/.test(raw)) return fallback;
  return Number(raw);
}

function readPlace(sp: URLSearchParams, codeKey: string, labelKey: string): PlaceChoice | null {
  const code = (sp.get(codeKey) ?? "").trim().toUpperCase();
  if (!IATA.test(code)) return null;
  const label = (sp.get(labelKey) ?? "").trim().slice(0, LABEL_MAX);
  return { code, label: label || code };
}

export function readFormParams(sp: URLSearchParams, today: string): FlightSearchForm {
  const base = defaultForm(today);
  const currency = (sp.get("currency") ?? "").toUpperCase();
  return {
    origin: readPlace(sp, "from", "fromName"),
    destination: readPlace(sp, "to", "toName"),
    date: sp.get("date") ?? base.date,
    time: sp.get("time") ?? base.time,
    passengers: {
      adults: readCount(sp, "adults", base.passengers.adults),
      children: readCount(sp, "children", base.passengers.children),
      infants: readCount(sp, "infants", base.passengers.infants),
    },
    currency: isFlightCurrency(currency) ? currency : base.currency,
    direct: sp.get("direct") === "1",
  };
}

export const FORM_PARAM_KEYS = [
  "from", "fromName", "to", "toName", "date", "time", "adults", "children", "infants", "currency", "direct",
] as const;

/** Replaces the search keys in `sp`, leaving unrelated parameters alone. */
export function writeFormParams(sp: URLSearchParams, form: FlightSearchForm): URLSearchParams {
  const out = new URLSearchParams(sp);
  for (const key of FORM_PARAM_KEYS) out.delete(key);
  if (form.origin) {
    out.set("from", form.origin.code);
    if (form.origin.label !== form.origin.code) out.set("fromName", form.origin.label.slice(0, LABEL_MAX));
  }
  if (form.destination) {
    out.set("to", form.destination.code);
    if (form.destination.label !== form.destination.code) out.set("toName", form.destination.label.slice(0, LABEL_MAX));
  }
  out.set("date", form.date);
  if (form.time) out.set("time", form.time);
  out.set("adults", String(form.passengers.adults));
  if (form.passengers.children) out.set("children", String(form.passengers.children));
  if (form.passengers.infants) out.set("infants", String(form.passengers.infants));
  out.set("currency", form.currency);
  if (form.direct) out.set("direct", "1");
  return out;
}

/** The search the URL asks for, or null when it names no complete, valid search. */
export function submittedSearch(sp: URLSearchParams, today: string): FlightSearchParams | null {
  if (!sp.has("from") || !sp.has("to")) return null;
  const form = readFormParams(sp, today);
  return hasErrors(validateForm(form, today)) ? null : toSearchParams(form);
}
