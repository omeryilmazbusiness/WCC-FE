import type { AppRole } from "@/shared/config/routes";

export type User = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  branchId: string;
  teamId?: string | null;
  isActive?: boolean;
  mfaEnabled?: boolean;
};

export function isManagerRole(role: AppRole): boolean {
  return role === "gm" || role === "manager";
}

export function isAdminRole(role: AppRole): boolean {
  return role === "gm" || role === "admin";
}

/** Roles that can configure BYO AI (not the first-run wizard — that is GM-only). */
export function canConfigureAI(role: AppRole): boolean {
  return role === "gm" || role === "manager" || role === "admin";
}

/** First-run branch setup wizard (company + staff + AI + channels). */
export function canSeeBranchSetup(role: AppRole): boolean {
  return role === "gm";
}
