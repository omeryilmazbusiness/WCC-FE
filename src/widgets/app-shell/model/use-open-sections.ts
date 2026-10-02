"use client";

import { useCallback, useState } from "react";
import type { NavGroupId } from "./nav";

/**
 * Single expanded sidebar section (accordion). Navigating into another
 * section opens it so the active link stays visible.
 */
export function useOpenSection(activeGroup: NavGroupId | undefined) {
  const [open, setOpen] = useState<NavGroupId | null>(activeGroup ?? null);
  const [seenActive, setSeenActive] = useState(activeGroup);

  if (activeGroup !== seenActive) {
    setSeenActive(activeGroup);
    if (activeGroup) setOpen(activeGroup);
  }

  const toggle = useCallback((id: NavGroupId) => {
    setOpen((prev) => (prev === id ? null : id));
  }, []);

  return { open, toggle };
}
