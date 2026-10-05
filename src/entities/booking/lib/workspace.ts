import type { Booking } from "../model";
import type { BookingListParams } from "../workspace-model";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** Server cap on one list page. */
export const BOOKING_LIST_LIMIT = 200;

/** List params → query string in the API's snake_case vocabulary (empty values dropped). */
export function bookingListQuery(params: BookingListParams = {}): string {
  const sp = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "") return;
    sp.set(key, String(value));
  };
  set("q", params.q?.trim());
  set("status", params.status);
  set("customer_id", params.customerId);
  set("departure_id", params.departureId);
  set("package_id", params.packageId);
  set("owner_id", params.ownerId);
  set("service_type", params.serviceType);
  set("channel", params.channel);
  set("segment", params.segment);
  if (params.from || params.to) set("date_field", params.dateField ?? "created");
  set("from", params.from);
  set("to", params.to);
  set("sort", params.sort);
  set("day_end", params.dayEnd);
  set("limit", Math.min(BOOKING_LIST_LIMIT, Math.max(1, params.limit ?? BOOKING_LIST_LIMIT)));
  return sp.toString();
}

/** RFC 3339 instant of the last second of `now`'s local day. */
export function endOfLocalDay(now: Date = new Date()): string {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return end.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** B2B bookings show the agency; everyone else the lead customer. */
export function bookingPartyName(b: Pick<Booking, "channel" | "companyName" | "info">, locale: string): string {
  if (b.channel === "b2b_agency" && b.companyName) return b.companyName;
  if (locale === "ar" && b.info.customerNameAr) return b.info.customerNameAr;
  return b.info.customerName || b.info.customerNameAr || b.companyName;
}

/** Travellers beyond the lead ("Ahmet Yılmaz (+2 Pax)"). */
export function extraPax(paxCount: number): number {
  return Math.max(0, Math.trunc(paxCount) - 1);
}

/** Whole nights between two `YYYY-MM-DD` days; 0 when either is missing or out of order. */
export function stayNights(from: string | null, to: string | null): number {
  if (!from || !to) return 0;
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 0;
  return Math.round((b - a) / DAY_MS);
}

/** Free-text summary, else the package hotels, else the package name. */
export function bookingSummary(b: Pick<Booking, "summary" | "info">, locale: string): string {
  if (b.summary.trim()) return b.summary.trim();
  const hotels = [b.info.makkahHotel, b.info.madinahHotel].filter(Boolean).join(" · ");
  if (hotels) return hotels;
  return (locale === "ar" && b.info.packageNameAr) || b.info.packageName || b.info.packageNameAr;
}

export type BookingProfit = {
  net: number;
  gross: number;
  profit: number;
  /** Profit over cost; null without a cost basis. */
  markupPct: number | null;
  /** Profit over the sale; null for a zero sale. */
  marginPct: number | null;
};

export function bookingProfit(b: Pick<Booking, "totalAmount" | "costAmt">): BookingProfit {
  const profit = b.totalAmount - b.costAmt;
  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);
  return {
    net: b.costAmt,
    gross: b.totalAmount,
    profit,
    markupPct: pct(profit, b.costAmt),
    marginPct: pct(profit, b.totalAmount),
  };
}

/** Share of the total already collected, clamped to 0–100. */
export function collectedPct(b: Pick<Booking, "totalAmount" | "collectedAmt">): number {
  if (b.totalAmount <= 0) return b.collectedAmt > 0 ? 100 : 0;
  return Math.min(100, Math.max(0, Math.round((b.collectedAmt / b.totalAmount) * 100)));
}

export type TtlUrgency = "none" | "ok" | "soon" | "urgent" | "expired";

/** Option deadline urgency: urgent under 2 h, soon under 24 h. */
export function ttlUrgency(holdExpiresAt: string | null, now: number = Date.now()): TtlUrgency {
  if (!holdExpiresAt) return "none";
  const at = Date.parse(holdExpiresAt);
  if (Number.isNaN(at)) return "none";
  const left = at - now;
  if (left <= 0) return "expired";
  if (left < 2 * HOUR_MS) return "urgent";
  if (left < 24 * HOUR_MS) return "soon";
  return "ok";
}

/** Digits wa.me accepts ("+90 (532) 111-22-33" → "905321112233"); "" when too short. */
export function dialablePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^00/, "");
  return digits.length >= 8 ? digits : "";
}

export function whatsappUrl(phone: string, text: string): string {
  const to = dialablePhone(phone);
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

export function mailtoUrl(email: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Payment-link amount in minor units: blank / zero means the whole balance, never more. */
export function clampPaymentAmount(amount: number, balance: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return balance;
  return Math.min(Math.trunc(amount), balance);
}
