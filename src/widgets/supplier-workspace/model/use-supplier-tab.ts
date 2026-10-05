"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export const SUPPLIER_TABS = ["overview", "integration", "finance", "scope", "performance", "operations", "invoices"] as const;

export type SupplierTab = (typeof SUPPLIER_TABS)[number];

function isSupplierTab(v: string | null): v is SupplierTab {
  return v !== null && (SUPPLIER_TABS as readonly string[]).includes(v);
}

/** The open tab is mirrored to `?tab=` so notification links and reloads land on the same view. */
export function useSupplierTab(): [SupplierTab, (tab: string) => void] {
  const raw = useSearchParams().get("tab");
  const fromUrl: SupplierTab = isSupplierTab(raw) ? raw : "overview";
  const [tab, setTab] = useState<SupplierTab>(fromUrl);

  useEffect(() => setTab(fromUrl), [fromUrl]);

  const select = useCallback((next: string) => {
    if (!isSupplierTab(next)) return;
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }, []);

  return [tab, select];
}
