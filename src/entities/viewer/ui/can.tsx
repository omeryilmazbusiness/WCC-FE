"use client";

import type { ReactNode } from "react";
import type { Permission } from "@/shared/config/permissions";
import type { PermissionRequirement } from "../model/can";
import { useCan } from "../model/viewer-context";

type CanProps = {
  perm?: PermissionRequirement;
  anyOf?: readonly Permission[];
  fallback?: ReactNode;
  children: ReactNode;
};

/** Renders children only when the viewer holds the permission(s). */
export function Can({ perm, anyOf, fallback = null, children }: CanProps) {
  return useCan({ perm, anyOf }) ? <>{children}</> : <>{fallback}</>;
}
