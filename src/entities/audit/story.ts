import { diffObjects, type DiffEntry } from "@/shared/lib/diff-objects";
import type { AuditEvent } from "./model";

function humanize(code: string): string {
  const text = code.replace(/[._]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * User-facing activity story. Presentation-free: no icons, colours or copy.
 * Unknown actions still get a readable fallback from the verb after the dot.
 */

export const AUDIT_AREAS = [
  "auth",
  "user",
  "customer",
  "booking",
  "payment",
  "document",
  "visa",
  "company",
  "branch",
  "hotel",
  "privacy",
  "setup",
] as const;

export type AuditArea = (typeof AUDIT_AREAS)[number];

const AREA_FROM_ENTITY: Record<string, AuditArea> = {
  user: "user",
  session: "auth",
  customer: "customer",
  booking: "booking",
  booking_participant: "booking",
  participant: "booking",
  payment: "payment",
  finance_export: "payment",
  document: "document",
  visa: "visa",
  company: "company",
  company_setup: "setup",
  company_security: "setup",
  setup: "setup",
  branch: "branch",
  hotel: "hotel",
  pii: "privacy",
  privacy: "privacy",
};

const AREA_FROM_PREFIX: Record<string, AuditArea> = {
  auth: "auth",
  user: "user",
  customer: "customer",
  booking: "booking",
  payment: "payment",
  finance: "payment",
  document: "document",
  visa: "visa",
  company: "company",
  branch: "branch",
  hotel: "hotel",
  pii: "privacy",
  privacy: "privacy",
  setup: "setup",
};

/** Actions we ship copy for. Anything else uses the verb after the last dot. */
export const KNOWN_ACTIONS = [
  "auth.login",
  "auth.logout",
  "auth.login_failed",
  "auth.login_wrong_company",
  "auth.account_locked",
  "auth.account_unlocked",
  "auth.password_changed",
  "auth.mfa_enabled",
  "auth.mfa_disabled",
  "auth.mfa_failed",
  "auth.mfa_verified",
  "auth.mfa_enroll_started",
  "auth.mfa_recovery_used",
  "auth.mfa_recovery_regenerated",
  "auth.sessions_revoked",
  "auth.session_revoked",
  "auth.session_expired",
  "user.created",
  "user.updated",
  "user.profile_updated",
  "user.email_changed",
  "user.avatar_updated",
  "user.avatar_removed",
  "booking.created",
  "booking.updated",
  "booking.status_changed",
  "booking.status_overridden",
  "booking.discount_changed",
  "booking.participant_added",
  "booking.participant_removed",
  "booking.participant_updated",
  "booking.note_added",
  "booking.note_deleted",
  "booking.shared",
  "booking.hold_extended",
  "booking.change_requested",
  "booking.payment_link_created",
  "booking.profile_updated",
  "booking.line_items_changed",
  "customer.updated",
  "customer.merged",
  "payment.recorded",
  "payment.verified",
  "payment.reversed",
  "payment.refund_requested",
  "payment.refund_approved",
  "payment.refund_rejected",
  "payment.schedule_created",
  "payment.schedule_cancelled",
  "document.approved",
  "document.rejected",
  "company.updated",
  "company.plan_changed",
  "company.registered",
  "company.logo_updated",
  "company.logo_removed",
  "branch.created",
  "branch.updated",
  "pii.revealed",
  "privacy.exported",
  "privacy.anonymized",
  "audit.exported",
  "setup.completed",
  "setup.company_saved",
  "setup.security_saved",
  "hotel.created",
] as const;

export type KnownAction = (typeof KNOWN_ACTIONS)[number];

const KNOWN = new Set<string>(KNOWN_ACTIONS);

const HIDDEN_KEYS = new Set([
  "id",
  "password",
  "hash",
  "token",
  "secret",
  "request_id",
  "session_id",
  "token_id",
  "user_agent",
  "ip",
  "actor_id",
  "branch_id",
  "entity_id",
  "owner_id",
  "customer_id",
  "departure_id",
  "booking_id",
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function auditArea(event: Pick<AuditEvent, "action" | "entity_type">): AuditArea | null {
  const prefix = event.action.split(".")[0] ?? "";
  return AREA_FROM_PREFIX[prefix] ?? AREA_FROM_ENTITY[event.entity_type] ?? null;
}

/** API `entity_type` for an area chip. Auth events are stored on the user. */
export function entityTypeForArea(area: AuditArea): string {
  if (area === "auth") return "user";
  if (area === "privacy") return "customer";
  if (area === "setup") return "company_security";
  return area;
}

export function isKnownAction(action: string): action is KnownAction {
  return KNOWN.has(action);
}

/** Verb used when we have no catalogue entry: `booking.status_changed` → `Status changed`. */
export function fallbackActionTitle(action: string): string {
  const verb = action.includes(".") ? action.slice(action.indexOf(".") + 1) : action;
  return humanize(verb);
}

export function isTechnicalKey(key: string): boolean {
  if (HIDDEN_KEYS.has(key)) return true;
  if (/_id$/.test(key)) return true;
  if (/^(created|updated|deleted)_at$/.test(key)) return true;
  if (/^(created|updated)_by$/.test(key)) return true;
  return false;
}

function isTechnicalValue(value: unknown): boolean {
  if (typeof value === "string" && UUID.test(value)) return true;
  if (value && typeof value === "object") return true;
  return false;
}

export function isTechnicalField(key: string, ...values: unknown[]): boolean {
  if (isTechnicalKey(key)) return true;
  return values.filter((v) => v !== undefined).every(isTechnicalValue);
}

/** Changed fields a person can read. Unchanged and identifier rows are dropped. */
export function readableChanges(event: Pick<AuditEvent, "before" | "after">): DiffEntry[] {
  return diffObjects(event.before, event.after).entries.filter(
    (e) => e.kind !== "unchanged" && !isTechnicalField(e.key, e.before, e.after),
  );
}

export type AuditFact = { key: string; value: string };

function factValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const v = value.trim();
    if (!v || UUID.test(v) || v.length > 80) return null;
    return v;
  }
  return null;
}

/** Short extra facts (method, reason) — never raw JSON or identifiers. */
export function readableFacts(extra: Record<string, unknown> | null | undefined): AuditFact[] {
  if (!extra) return [];
  const out: AuditFact[] = [];
  for (const [key, raw] of Object.entries(extra)) {
    if (isTechnicalKey(key)) continue;
    const value = factValue(raw);
    if (value == null) continue;
    out.push({ key, value });
  }
  return out;
}

export function hasReadableDetails(event: AuditEvent): boolean {
  return readableChanges(event).length > 0 || readableFacts(event.extra).length > 0;
}
