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
