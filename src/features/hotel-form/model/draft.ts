import {
  bpsToPercentInput,
  emptyHotelInput,
  hotelToInput,
  parsePercentInput,
  type Hotel,
  type HotelInput,
  type Landmark,
  type MarkupKind,
  type MealPlan,
  type RoomType,
} from "@/entities/hotel";
import { minorToInput, parseMoneyInput } from "@/shared/lib/money";

/** Form state: numbers stay strings until submit so partial typing never jumps. */
export type HotelDraft = {
  name: string;
  nameAr: string;
  stars: number;
  city: string;
  country: string;
  district: string;
  landmark: Landmark | "";
  distance: string;
  latitude: string;
  longitude: string;
  salesName: string;
  salesPhone: string;
  salesEmail: string;
  reservationsEmail: string;
  roomTypes: RoomType[];
  mealPlans: MealPlan[];
  currency: string;
  markupKind: MarkupKind;
  markupValue: string;
  notes: string;
  isActive: boolean;
};

export type HotelDraftField =
  | "name"
  | "city"
  | "country"
  | "distance"
  | "latitude"
  | "longitude"
  | "salesPhone"
  | "salesEmail"
  | "reservationsEmail"
  | "roomTypes"
  | "mealPlans"
  | "markupValue";

export type HotelDraftErrors = Partial<Record<HotelDraftField, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9][0-9 ()-]{5,19}$/;
const COUNTRY = /^[A-Za-z]{2}$/;
const MAX_MARKUP_BPS = 50_000;

function inputToDraft(i: HotelInput): HotelDraft {
  return {
    name: i.name,
    nameAr: i.nameAr,
    stars: i.stars,
    city: i.location.city,
    country: i.location.country,
    district: i.location.district,
    landmark: i.location.landmark,
    distance: i.location.distanceM ? String(i.location.distanceM) : "",
    latitude: i.location.latitude != null ? String(i.location.latitude) : "",
    longitude: i.location.longitude != null ? String(i.location.longitude) : "",
    salesName: i.contact.salesName,
    salesPhone: i.contact.salesPhone,
    salesEmail: i.contact.salesEmail,
    reservationsEmail: i.contact.reservationsEmail,
    roomTypes: [...i.roomTypes],
    mealPlans: [...i.mealPlans],
    currency: i.currency,
    markupKind: i.markup.kind,
    markupValue: i.markup.kind === "percent" ? bpsToPercentInput(i.markup.value) : minorToInput(i.markup.value),
    notes: i.notes,
    isActive: i.isActive ?? true,
  };
}

export function newDraft(): HotelDraft {
  return inputToDraft(emptyHotelInput());
}

export function draftFromHotel(h: Hotel): HotelDraft {
  return inputToDraft(hotelToInput(h));
}

function parseCoord(v: string): number | null | undefined {
  const s = v.trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function parseMarkup(d: HotelDraft): number | null {
  if (!d.markupValue.trim()) return 0;
  const v = d.markupKind === "percent" ? parsePercentInput(d.markupValue) : parseMoneyInput(d.markupValue);
  if (v == null) return null;
  if (d.markupKind === "percent" && v > MAX_MARKUP_BPS) return null;
  return v;
}

/** Instant hints keyed by draft field; values are i18n keys under `hotels.form.errors`. */
export function draftErrors(d: HotelDraft): HotelDraftErrors {
  const e: HotelDraftErrors = {};
  if (d.name.trim().length < 2) e.name = "name";
  if (!d.city.trim()) e.city = "city";
  if (d.country.trim() && !COUNTRY.test(d.country.trim())) e.country = "country";
  if (d.distance.trim() && !/^\d{1,6}$/.test(d.distance.trim())) e.distance = "distance";
  else if (Number(d.distance || 0) > 100_000) e.distance = "distance";
  const lat = parseCoord(d.latitude);
  const lng = parseCoord(d.longitude);
  if (lat === undefined || (lat != null && Math.abs(lat) > 90)) e.latitude = "latitude";
  if (lng === undefined || (lng != null && Math.abs(lng) > 180)) e.longitude = "longitude";
  if (!e.latitude && !e.longitude && (lat == null) !== (lng == null)) e.longitude = "coordsPair";
  if (d.salesPhone.trim() && !PHONE.test(d.salesPhone.trim())) e.salesPhone = "phone";
  if (d.salesEmail.trim() && !EMAIL.test(d.salesEmail.trim())) e.salesEmail = "email";
  if (d.reservationsEmail.trim() && !EMAIL.test(d.reservationsEmail.trim())) e.reservationsEmail = "email";
  if (d.roomTypes.length === 0) e.roomTypes = "roomTypes";
  if (d.mealPlans.length === 0) e.mealPlans = "mealPlans";
  if (parseMarkup(d) == null) e.markupValue = d.markupKind === "percent" ? "markupPercent" : "markupFixed";
  return e;
}

/** Valid draft → API input; policies are kept from `base` so profile edits never reset them. */
export function draftToInput(d: HotelDraft, base?: Hotel): HotelInput {
  return {
    name: d.name.trim(),
    nameAr: d.nameAr.trim(),
    stars: d.stars,
    location: {
      city: d.city.trim(),
      country: d.country.trim().toUpperCase(),
      district: d.district.trim(),
      latitude: parseCoord(d.latitude) ?? null,
      longitude: parseCoord(d.longitude) ?? null,
      landmark: d.landmark,
      distanceM: Number(d.distance.trim() || 0),
    },
    contact: {
      salesName: d.salesName.trim(),
      salesPhone: d.salesPhone.trim(),
      salesEmail: d.salesEmail.trim(),
      reservationsEmail: d.reservationsEmail.trim(),
    },
    roomTypes: d.roomTypes,
    mealPlans: d.mealPlans,
    currency: d.currency,
    markup: { kind: d.markupKind, value: parseMarkup(d) ?? 0 },
    childPolicy: base?.childPolicy,
    cancellation: base?.cancellation,
    notes: d.notes.trim(),
    isActive: d.isActive,
  };
}

/** Backend field keys (snake_case) → draft fields, for server-side validation errors. */
export const SERVER_FIELD: Record<string, HotelDraftField> = {
  name: "name",
  city: "city",
  country: "country",
  distance_m: "distance",
  latitude: "latitude",
  longitude: "longitude",
  sales_phone: "salesPhone",
  sales_email: "salesEmail",
  reservations_email: "reservationsEmail",
  room_types: "roomTypes",
  meal_plans: "mealPlans",
  markup: "markupValue",
};
