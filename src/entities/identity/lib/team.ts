import type { AppRole } from "@/shared/config/routes";
import type { ApiUser } from "../api";

/** Seniority order used for sorting and role chips. */
export const ROLE_ORDER: readonly AppRole[] = ["gm", "manager", "operations", "finance", "employee", "admin"];

/** Roles a company GM can hand out; `admin` is the platform operator only. */
export const COMPANY_ROLES: readonly AppRole[] = ["manager", "employee", "operations", "finance", "gm"];

export type MemberStatus = "active" | "inactive" | "locked";
export type StatusFilter = MemberStatus | "all";
export type RoleFilter = AppRole | "all";

export function isLocked(user: Pick<ApiUser, "locked_until">, now: number = Date.now()): boolean {
  return Boolean(user.locked_until && Date.parse(user.locked_until) > now);
}

/** Locked wins over active: a locked account cannot sign in until it is unlocked or the lock expires. */
export function memberStatus(user: Pick<ApiUser, "is_active" | "locked_until">, now: number = Date.now()): MemberStatus {
  if (!user.is_active) return "inactive";
  return isLocked(user, now) ? "locked" : "active";
}

export type MemberFilter = { query: string; role: RoleFilter; status: StatusFilter };

function normalise(s: string): string {
  return s.toLocaleLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").trim();
}

export function filterMembers(users: readonly ApiUser[], f: MemberFilter, now: number = Date.now()): ApiUser[] {
  const q = normalise(f.query);
  return users.filter((u) => {
    if (f.role !== "all" && u.role !== f.role) return false;
    if (f.status !== "all" && memberStatus(u, now) !== f.status) return false;
    if (q && !normalise(`${u.full_name} ${u.email} ${u.company_name ?? ""}`).includes(q)) return false;
    return true;
  });
}

/** Most senior first, then by name. */
export function sortMembers(users: readonly ApiUser[], locale = "en"): ApiUser[] {
  const rank = (r: AppRole) => {
    const i = ROLE_ORDER.indexOf(r);
    return i < 0 ? ROLE_ORDER.length : i;
  };
  return [...users].sort((a, b) => rank(a.role) - rank(b.role) || a.full_name.localeCompare(b.full_name, locale));
}

export type TeamSummary = {
  total: number;
  active: number;
  inactive: number;
  locked: number;
  mfa: number;
  byRole: Partial<Record<AppRole, number>>;
  byStatus: Record<MemberStatus, number>;
};

export function summarizeTeam(users: readonly ApiUser[], now: number = Date.now()): TeamSummary {
  const out: TeamSummary = {
    total: users.length,
    active: 0,
    inactive: 0,
    locked: 0,
    mfa: 0,
    byRole: {},
    byStatus: { active: 0, inactive: 0, locked: 0 },
  };
  for (const u of users) {
    const status = memberStatus(u, now);
    out.byStatus[status] += 1;
    out.byRole[u.role] = (out.byRole[u.role] ?? 0) + 1;
    if (u.mfa_enabled) out.mfa += 1;
  }
  out.active = out.byStatus.active;
  out.inactive = out.byStatus.inactive;
  out.locked = out.byStatus.locked;
  return out;
}

export type PasswordIssue = "length" | "tooLong" | "mix" | "common";

const COMMON = new Set(["password", "password123", "1234567890", "ChangeMe123"]);

/**
 * Mirrors `auth.ValidatePassword` on the API: 10–128 chars, letters and digits, not a known default.
 * The API measures UTF-8 bytes, so the upper bound is checked in bytes; the lower bound counts
 * characters, which is never looser than the API.
 */
export function passwordIssues(password: string): PasswordIssue[] {
  const issues: PasswordIssue[] = [];
  if ([...password].length < 10) issues.push("length");
  if (new TextEncoder().encode(password).length > 128) issues.push("tooLong");
  if (!/\p{L}/u.test(password) || !/\p{Nd}/u.test(password)) issues.push("mix");
  if (COMMON.has(password)) issues.push("common");
  return issues;
}

const LOWER = "abcdefghijkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%*?";

/**
 * 14-char password with every character class, no look-alikes (0/O, 1/l/I).
 * `random(n)` returns an integer in [0, n); defaults to the Web Crypto API.
 */
export function generatePassword(random: (n: number) => number = cryptoRandom): string {
  const all = LOWER + UPPER + DIGITS + SYMBOLS;
  const chars = [LOWER, UPPER, DIGITS, SYMBOLS].map((set) => set[random(set.length)]);
  while (chars.length < 14) chars.push(all[random(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function cryptoRandom(n: number): number {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n;
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % n;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
