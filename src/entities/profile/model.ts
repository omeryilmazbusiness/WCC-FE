import type { AppRole } from "@/shared/config/routes";

/** The signed-in user's own account (`GET /v1/me/profile`). */
export type Profile = {
  id: string;
  email: string;
  fullName: string;
  jobTitle: string;
  phone: string;
  role: AppRole;
  branchId: string | null;
  team: { id: string; nameEn: string; nameAr: string } | null;
  mfaEnabled: boolean;
  avatarVersion: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersonalInfo = Pick<Profile, "fullName" | "jobTitle" | "phone">;

/** Limits mirror the backend (`domain/identity/profile.go`). */
export const PROFILE_LIMITS = {
  fullNameMin: 2,
  fullNameMax: 120,
  jobTitleMax: 80,
  phoneMaxChars: 32,
  phoneMinDigits: 7,
  phoneMaxDigits: 15,
  emailMax: 254,
  avatarMaxBytes: 1 << 20,
} as const;

export type ProfileIssue = "required" | "tooLong" | "invalid";
export type PersonalInfoIssues = Partial<Record<keyof PersonalInfo, ProfileIssue>>;

const CONTROL = /\p{Cc}/u;

/** Trims and folds inner whitespace runs, as the backend stores it. */
export function collapseSpaces(value: string): string {
  return value.trim().split(/\s+/u).filter(Boolean).join(" ");
}

export function fullNameIssue(value: string): ProfileIssue | null {
  if (CONTROL.test(value)) return "invalid";
  const n = [...collapseSpaces(value)].length;
  if (n < PROFILE_LIMITS.fullNameMin) return "required";
  return n > PROFILE_LIMITS.fullNameMax ? "tooLong" : null;
}

export function jobTitleIssue(value: string): ProfileIssue | null {
  if (CONTROL.test(value)) return "invalid";
  return [...collapseSpaces(value)].length > PROFILE_LIMITS.jobTitleMax ? "tooLong" : null;
}

/** Digits with spaces, dashes, dots or parentheses; a leading + only. Empty clears it. */
export function phoneIssue(value: string): ProfileIssue | null {
  const phone = collapseSpaces(value);
  if (!phone) return null;
  if (!/^\+?[\d\s\-.()]+$/u.test(phone)) return "invalid";
  const digits = phone.replace(/\D/g, "").length;
  if (digits < PROFILE_LIMITS.phoneMinDigits || digits > PROFILE_LIMITS.phoneMaxDigits) return "invalid";
  return [...phone].length > PROFILE_LIMITS.phoneMaxChars ? "invalid" : null;
}

export function emailIssue(value: string): "required" | "invalid" | null {
  const email = value.trim().toLowerCase();
  if (!email) return "required";
  if (email.length > PROFILE_LIMITS.emailMax) return "invalid";
  return /^[^\s@<>(),;:"[\]]+@[^\s@<>(),;:"[\]]+\.[^\s@<>(),;:"[\]]+$/u.test(email) ? null : "invalid";
}

export function personalInfoIssues(info: PersonalInfo): PersonalInfoIssues {
  const issues: PersonalInfoIssues = {};
  const name = fullNameIssue(info.fullName);
  const title = jobTitleIssue(info.jobTitle);
  const phone = phoneIssue(info.phone);
  if (name) issues.fullName = name;
  if (title) issues.jobTitle = title;
  if (phone) issues.phone = phone;
  return issues;
}

export function normalizePersonalInfo(info: PersonalInfo): PersonalInfo {
  return { fullName: collapseSpaces(info.fullName), jobTitle: collapseSpaces(info.jobTitle), phone: collapseSpaces(info.phone) };
}

/** Only the fields that differ from the saved profile, ready for `PATCH /me/profile`. */
export function personalInfoChanges(saved: PersonalInfo, draft: PersonalInfo): Partial<PersonalInfo> {
  const next = normalizePersonalInfo(draft);
  const changes: Partial<PersonalInfo> = {};
  for (const key of ["fullName", "jobTitle", "phone"] as const) {
    if (next[key] !== saved[key]) changes[key] = next[key];
  }
  return changes;
}

/** Share of the optional details filled in, for the completeness hint. */
export function profileCompleteness(p: Pick<Profile, "jobTitle" | "phone" | "avatarVersion" | "mfaEnabled">): number {
  const done = [p.jobTitle, p.phone, p.avatarVersion, p.mfaEnabled].filter(Boolean).length;
  return Math.round((done / 4) * 100);
}

/** Center square crop of a `width × height` image, for the profile photo. */
export function squareCrop(width: number, height: number): { sx: number; sy: number; size: number } {
  const size = Math.min(width, height);
  return { sx: Math.round((width - size) / 2), sy: Math.round((height - size) / 2), size };
}
