"use client";

import { useMemo } from "react";
import { usePermissions } from "@/entities/viewer";
import { visibleSettings, type SettingsGroup } from "@/shared/config/settings";

/** Settings groups the viewer may open, in display order. */
export function useSettingsGroups(): SettingsGroup[] {
  const permissions = usePermissions();
  return useMemo(() => visibleSettings(permissions), [permissions]);
}
