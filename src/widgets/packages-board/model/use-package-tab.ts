"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export const PACKAGE_TABS = ["overview", "hotels", "pricing", "logistics", "services", "itinerary", "requirements", "departures", "links"] as const;

export type PackageTab = (typeof PACKAGE_TABS)[number];

function isPackageTab(v: string | null): v is PackageTab {
  return v !== null && (PACKAGE_TABS as readonly string[]).includes(v);
}

/**
 * The open tab is mirrored to `?tab=`. Selection is local state because Next ignores
 * `replaceState` calls that carry its own history state.
 */
export function usePackageTab(): [PackageTab, (tab: string) => void] {
  const raw = useSearchParams().get("tab");
  const fromUrl: PackageTab = isPackageTab(raw) ? raw : "overview";
  const [tab, setTab] = useState<PackageTab>(fromUrl);

  useEffect(() => setTab(fromUrl), [fromUrl]);

  const select = useCallback((next: string) => {
    if (!isPackageTab(next)) return;
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }, []);

  return [tab, select];
}
