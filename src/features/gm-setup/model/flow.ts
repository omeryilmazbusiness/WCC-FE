/**
 * Pure GM setup flow rules (no I/O). The backend owns progress; these helpers
 * only derive navigation and client-side hints from its overview.
 */

import type {
  CompanyProfile,
  SetupOverview,
  SetupStepKey,
  SetupStepStatus,
} from "@/entities/setup";

/** Roles the GM seeds as staff profiles; `gm` and `admin` are managed elsewhere. */
export const STAFF_ROLES = ["manager", "employee", "finance", "operations"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const CURRENCY_CHOICES = ["USD", "SYP", "SAR", "EUR", "TRY"] as const;

/** Backend `company.DefaultTimezone`, used until a catalogued country is chosen. */
export const DEFAULT_TIMEZONE = "Asia/Riyadh";

export function stepOrder(o: SetupOverview): SetupStepKey[] {
  return o.steps.map((s) => s.key);
}

export function statusOf(o: SetupOverview, key: SetupStepKey): SetupStepStatus {
  return o.steps.find((s) => s.key === key)?.status ?? "pending";
}

export function countOf(o: SetupOverview, key: SetupStepKey): number {
  return o.steps.find((s) => s.key === key)?.count ?? 0;
}

/**
 * Step to open on arrival: the first pending one, or after completion the
 * first skipped one; `null` shows the summary.
 */
export function initialStep(o: SetupOverview): SetupStepKey | null {
  if (o.fullyDone) return null;
  if (o.completed) return o.steps.find((s) => s.status !== "done")?.key ?? null;
  return o.nextStep ?? stepOrder(o).at(-1) ?? null;
}

export function neighborStep(
  o: SetupOverview,
  step: SetupStepKey,
  dir: -1 | 1,
): SetupStepKey | null {
  const order = stepOrder(o);
  const i = order.indexOf(step);
  if (i < 0) return null;
  return order[i + dir] ?? null;
}

export function isLastStep(o: SetupOverview, step: SetupStepKey): boolean {
  return neighborStep(o, step, 1) === null;
}

export function progressPercent(o: SetupOverview): number {
  const settled = o.steps.filter((s) => s.status !== "pending").length;
  return o.totalSteps > 0 ? Math.round((settled / o.totalSteps) * 100) : 0;
}

/** Share of steps actually done (skips excluded); drives the dashboard card. */
export function donePercent(o: SetupOverview): number {
  return o.totalSteps > 0 ? Math.round((o.doneCount / o.totalSteps) * 100) : 0;
}

export type CompanyFieldErrors = Partial<Record<keyof CompanyProfile, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;

/** Mirrors the backend's reserved first path segments (`domain/company.reservedSlugs`). */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "api", "app", "admin", "auth", "login", "logout", "setup", "manager", "workspace", "pipeline",
  "inbox", "tasks", "notifications", "customers", "packages", "bookings", "finance", "targets",
  "reports", "suppliers", "rooming", "hotels", "integrations", "security", "settings", "import-export",
  "missing-docs", "flights", "static", "public", "assets", "en", "ar", "www", "help", "support", "status", "platform",
]);

/** Instant hints for required fields; the backend stays authoritative. */
export function companyHints(c: CompanyProfile): CompanyFieldErrors {
  const out: CompanyFieldErrors = {};
  const name = c.nameEn.trim();
  if (name.length < 2 || name.length > 120) out.nameEn = "name";
  const slug = c.slug.trim();
  if (slug && (!SLUG_PATTERN.test(slug) || RESERVED_SLUGS.has(slug))) out.slug = "slug";
  if (c.email.trim() && !EMAIL_PATTERN.test(c.email.trim())) out.email = "email";
  if (!COUNTRY_PATTERN.test(c.country.trim())) out.country = "country";
  if (!c.city.trim()) out.city = "city";
  if (!c.address.trim()) out.address = "address";
  return out;
}

const LATIN_FOLD: Record<string, string> = {
  ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", ß: "ss", ñ: "n",
  à: "a", á: "a", â: "a", ä: "a", ã: "a", å: "a", è: "e", é: "e", ê: "e", ë: "e",
  ì: "i", í: "i", î: "i", ï: "i", ò: "o", ó: "o", ô: "o", õ: "o", ù: "u", ú: "u", û: "u",
};

/** URL segment from a display name; mirrors the backend `company.Slugify`. */
export function slugify(name: string): string {
  const folded = Array.from(name.toLocaleLowerCase("en"))
    .map((ch) => LATIN_FOLD[ch] ?? (ch === "\u0307" ? "" : ch))
    .join("");
  return folded
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

/** URL segment of the company: follows the English name, the stored one until renamed. */
export function companySlug(nameEn: string, saved: { nameEn: string; slug: string }): string {
  if (nameEn.trim() === saved.nameEn.trim()) return saved.slug;
  return slugify(nameEn) || saved.slug;
}

export type BranchDraft = {
  /** Existing branch id; empty for a branch added in this session. */
  id: string;
  nameEn: string;
  kind: "main_center" | "branch";
  /** Stored name and URL segment of an existing branch. */
  saved?: { nameEn: string; slug: string };
};

/** URL segment a draft will have: the stored one until the branch is renamed. */
export function draftSlug(d: BranchDraft): string {
  if (d.saved && d.nameEn.trim() === d.saved.nameEn.trim()) return d.saved.slug;
  return slugify(d.nameEn);
}

export type BranchDraftErrors = Record<number, "name" | "duplicate">;

/** Branch names must be present and give distinct URL segments. */
export function branchDraftHints(drafts: readonly BranchDraft[]): BranchDraftErrors {
  const out: BranchDraftErrors = {};
  const seen = new Map<string, number>();
  drafts.forEach((d, i) => {
    const slug = draftSlug(d);
    if (d.nameEn.trim().length < 2 || !slug) {
      out[i] = "name";
      return;
    }
    if (seen.has(slug)) out[i] = "duplicate";
    else seen.set(slug, i);
  });
  return out;
}

/** Keeps exactly one main center: choosing one turns the others into branches. */
export function withMainCenter(drafts: readonly BranchDraft[], index: number): BranchDraft[] {
  return drafts.map((d, i) => ({ ...d, kind: i === index ? "main_center" : "branch" }));
}

export type PasswordIssue = "length" | "mix" | "common";

/** Client copy of the backend password policy (`platform/auth.ValidatePassword`). */
export function passwordIssue(pw: string): PasswordIssue | null {
  if (pw.length < 10 || pw.length > 128) return "length";
  if (!/\p{L}/u.test(pw) || !/\p{N}/u.test(pw)) return "mix";
  if (["password", "password123", "1234567890", "ChangeMe123"].includes(pw)) return "common";
  return null;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

const PASSWORD_LETTERS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
const PASSWORD_DIGITS = "23456789";

/**
 * Temporary password that satisfies the backend policy (≥10 chars, letters
 * and digits), without look-alike characters.
 */
export function generatePassword(
  length = 14,
  random: (n: number) => Uint32Array = (n) => crypto.getRandomValues(new Uint32Array(n)),
): string {
  const size = Math.max(10, length);
  const alphabet = PASSWORD_LETTERS + PASSWORD_DIGITS;
  const bytes = random(size + 2);
  const chars = Array.from({ length: size }, (_, i) => alphabet[bytes[i] % alphabet.length]);
  chars[bytes[size] % size] = PASSWORD_DIGITS[bytes[size] % PASSWORD_DIGITS.length];
  const letterAt = (bytes[size + 1] % (size - 1) + 1 + (bytes[size] % size)) % size;
  chars[letterAt] = PASSWORD_LETTERS[bytes[size + 1] % PASSWORD_LETTERS.length];
  return chars.join("");
}
