import type { ViewerSession } from "@/shared/api/session";
import { hasPermission, type Permission } from "@/shared/config/permissions";

export type PermissionRequirement = Permission | readonly Permission[];

/** `perm` requires all listed; `anyOf` requires at least one. */
export type CanCheck = {
  perm?: PermissionRequirement;
  anyOf?: readonly Permission[];
};

export function can(viewer: ViewerSession | null, check: CanCheck): boolean {
  if (!viewer) return false;
  if (check.perm && !hasPermission(viewer.permissions, check.perm)) return false;
  if (check.anyOf && !check.anyOf.some((p) => viewer.permissions.includes(p))) return false;
  return true;
}
