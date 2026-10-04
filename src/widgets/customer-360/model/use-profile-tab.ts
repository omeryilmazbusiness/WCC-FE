"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export const PROFILE_TABS = ["overview", "family", "bookings", "payments", "documents", "tasks", "activity"] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];

function isProfileTab(v: string | null): v is ProfileTab {
  return v !== null && (PROFILE_TABS as readonly string[]).includes(v);
}

/**
 * The open tab is mirrored to `?tab=` so it survives reloads and can be shared. Switching
 * replaces the history entry (tabs are views of one page, not pages of their own).
 * Selection is local state: Next ignores `replaceState` calls that carry its own history
 * state, so `useSearchParams` alone would never see the change.
 */
export function useProfileTab(): [ProfileTab, (tab: string) => void] {
  const raw = useSearchParams().get("tab");
  const fromUrl: ProfileTab = isProfileTab(raw) ? raw : "overview";
  const [tab, setTab] = useState<ProfileTab>(fromUrl);

  useEffect(() => setTab(fromUrl), [fromUrl]);

  const select = useCallback((next: string) => {
    if (!isProfileTab(next)) return;
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }, []);

  return [tab, select];
}
