export type Customer = {
  id: string;
  branchId: string;
  fullName: string;
  fullNameAr: string;
  phone: string;
  email: string;
  nationality: string;
  /** Always masked by the API ("••••1234"); the full value only via `revealPassport`. */
  passportNo: string;
  passportLast4: string;
  dateOfBirth?: string | null;
  /** `YYYY-MM-DD`; drives the expiry warnings (most countries require 6 months). */
  passportExpiresAt?: string | null;
  preferences?: Record<string, unknown>;
  specialRequirements?: string;
  notes: string;
  mergedIntoId?: string | null;
  isActive?: boolean;
  anonymizedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerCreateInput = {
  fullName: string;
  fullNameAr?: string;
  phone: string;
  email?: string;
  nationality?: string;
  passportNo?: string;
  dateOfBirth?: string;
  passportExpiresAt?: string;
  specialRequirements?: string;
  notes?: string;
};

/** KVKK export bundle — opaque JSON, downloaded as-is. */
export type CustomerDataExport = Record<string, unknown>;

/** A blank or masked `passportNo` keeps the stored passport. */
export type CustomerUpdateInput = Partial<CustomerCreateInput> & {
  clearDob?: boolean;
  clearPassportExpiry?: boolean;
  preferences?: Record<string, unknown>;
};

export type CompanionLink = {
  id: string;
  customer_id: string;
  companion_id: string;
  relation: string;
  notes: string;
  Companion?: Customer;
  companion?: {
    id: string;
    full_name?: string;
    fullName?: string;
    phone?: string;
  };
};

export type TimelineItem = {
  kind: string;
  id: string;
  title: string;
  status?: string;
  occurred_at: string;
  meta?: Record<string, unknown>;
};

export type DuplicateMatch = {
  customer: Customer;
  reasons: string[];
  score: number;
};

export type PassportStatus = "missing" | "valid" | "expiring" | "expired";

/** Most destinations refuse entry with less than six months of passport validity left. */
export const PASSPORT_WARNING_MONTHS = 6;

/** Calendar months later, clamped to the month's last day (Aug 31 + 6 → Feb 28). */
function addMonths(day: string, months: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, lastDay))).toISOString().slice(0, 10);
}

/** Passport validity relative to `today` (`YYYY-MM-DD`, the viewer's local day). */
export function passportStatus(c: Pick<Customer, "passportLast4" | "passportExpiresAt">, today: string): PassportStatus {
  const expires = c.passportExpiresAt?.slice(0, 10);
  if (!expires) return c.passportLast4 ? "valid" : "missing";
  if (expires < today) return "expired";
  return expires < addMonths(today, PASSPORT_WARNING_MONTHS) ? "expiring" : "valid";
}

export type ProfileField = "phone" | "email" | "nationality" | "passport" | "passportExpiry" | "dateOfBirth" | "nameAr";

/** Profile facts operations need before a trip, in the order they should be filled. */
export function missingProfileFields(c: Customer): ProfileField[] {
  const missing: ProfileField[] = [];
  if (!c.phone.trim()) missing.push("phone");
  if (!c.email.trim()) missing.push("email");
  if (!c.nationality.trim()) missing.push("nationality");
  if (!c.passportLast4) missing.push("passport");
  if (!c.passportExpiresAt) missing.push("passportExpiry");
  if (!c.dateOfBirth) missing.push("dateOfBirth");
  if (!c.fullNameAr.trim()) missing.push("nameAr");
  return missing;
}

const PROFILE_FIELD_COUNT = 7;

/** Share of the profile that is filled in, 0–100. */
export function profileCompleteness(c: Customer): number {
  return Math.round(((PROFILE_FIELD_COUNT - missingProfileFields(c).length) / PROFILE_FIELD_COUNT) * 100);
}

/** Whole years on `today`; null without a date of birth. */
export function ageOn(dateOfBirth: string | null | undefined, today: string): number | null {
  const dob = dateOfBirth?.slice(0, 10);
  if (!dob) return null;
  const [by, bm, bd] = dob.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const age = ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
  return age >= 0 ? age : null;
}

/** At or above this share a profile counts as complete enough to travel. */
export const COMPLETE_PROFILE_PCT = 85;

export type CustomerQuickFilter = "all" | "passport" | "incomplete" | "recent";

/** Passport needs action: expired, expiring soon, or not on file. */
export function needsPassportAction(c: Customer, today: string): boolean {
  return passportStatus(c, today) !== "valid";
}

function isRecent(c: Customer, today: string): boolean {
  return c.createdAt.slice(0, 7) === today.slice(0, 7);
}

export function matchesQuickFilter(c: Customer, filter: CustomerQuickFilter, today: string): boolean {
  switch (filter) {
    case "passport":
      return needsPassportAction(c, today);
    case "incomplete":
      return profileCompleteness(c) < COMPLETE_PROFILE_PCT;
    case "recent":
      return isRecent(c, today);
    default:
      return true;
  }
}

/** Active (not merged away) customers per quick filter. */
export function quickFilterCounts(rows: Customer[], today: string): Record<CustomerQuickFilter, number> {
  const counts: Record<CustomerQuickFilter, number> = { all: 0, passport: 0, incomplete: 0, recent: 0 };
  for (const c of rows) {
    if (c.isActive === false) continue;
    counts.all++;
    if (matchesQuickFilter(c, "passport", today)) counts.passport++;
    if (matchesQuickFilter(c, "incomplete", today)) counts.incomplete++;
    if (matchesQuickFilter(c, "recent", today)) counts.recent++;
  }
  return counts;
}

export type TimelineKind = "lead" | "booking" | "payment" | "document" | "task";

const OPEN_TASK = new Set(["open", "in_progress"]);

export type CustomerStats = {
  leads: number;
  bookings: number;
  payments: number;
  documents: number;
  openTasks: number;
  /** Paid per currency in minor units, from timeline payments. */
  paid: Record<string, number>;
  lastActivityAt: string | null;
};

function metaNumber(item: TimelineItem, key: string): number | null {
  const v = item.meta?.[key];
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function metaString(item: TimelineItem, key: string): string {
  const v = item.meta?.[key];
  return typeof v === "string" ? v : "";
}

/** Payment amount in minor units; older timelines only carried it in the title. */
export function paymentAmount(item: TimelineItem): number | null {
  const fromMeta = metaNumber(item, "amount");
  if (fromMeta !== null) return fromMeta;
  const m = item.title.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

export function customerStats(items: TimelineItem[]): CustomerStats {
  const stats: CustomerStats = { leads: 0, bookings: 0, payments: 0, documents: 0, openTasks: 0, paid: {}, lastActivityAt: null };
  for (const item of items) {
    if (!stats.lastActivityAt || item.occurred_at > stats.lastActivityAt) stats.lastActivityAt = item.occurred_at;
    switch (item.kind) {
      case "lead":
        stats.leads++;
        break;
      case "booking":
        stats.bookings++;
        break;
      case "document":
        stats.documents++;
        break;
      case "task":
        if (OPEN_TASK.has((item.status ?? "").toLowerCase())) stats.openTasks++;
        break;
      case "payment": {
        stats.payments++;
        const amount = paymentAmount(item);
        const currency = metaString(item, "currency");
        if (amount !== null && currency) stats.paid[currency] = (stats.paid[currency] ?? 0) + amount;
        break;
      }
    }
  }
  return stats;
}
