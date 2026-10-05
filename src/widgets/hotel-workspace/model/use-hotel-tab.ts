"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export const HOTEL_TABS = ["overview", "rates", "policies", "inventory", "quote", "contract"] as const;

export type HotelTab = (typeof HOTEL_TABS)[number];

function isHotelTab(v: string | null): v is HotelTab {
  return v !== null && (HOTEL_TABS as readonly string[]).includes(v);
}

/** The open tab is mirrored to `?tab=` so links and reloads land on the same view. */
export function useHotelTab(): [HotelTab, (tab: string) => void] {
  const raw = useSearchParams().get("tab");
  const fromUrl: HotelTab = isHotelTab(raw) ? raw : "overview";
  const [tab, setTab] = useState<HotelTab>(fromUrl);

  useEffect(() => setTab(fromUrl), [fromUrl]);

  const select = useCallback((next: string) => {
    if (!isHotelTab(next)) return;
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }, []);

  return [tab, select];
}
