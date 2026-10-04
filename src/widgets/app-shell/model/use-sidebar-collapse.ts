"use client";

import { useCallback, useEffect, useState } from "react";
import { SIDEBAR_COOKIE } from "./sidebar-pref";

const ONE_YEAR = 60 * 60 * 24 * 365;

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

/** Collapsed (icon rail) vs expanded sidebar; Ctrl/⌘+B toggles outside text fields. */
export function useSidebarCollapse(initial: boolean) {
  const [collapsed, setCollapsed] = useState(initial);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Autofill dispatches keydown events without a key.
      if (e.key?.toLowerCase() !== "b" || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      if (isEditable(e.target)) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return { collapsed, toggle };
}
