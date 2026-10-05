"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export const FINANCE_TABS = ["overview", "receivables", "payables", "treasury", "profit", "reconciliation", "queues"] as const;

export type FinanceTab = (typeof FINANCE_TABS)[number];

export function isFinanceTab(v: string | null): v is FinanceTab {
  return v !== null && (FINANCE_TABS as readonly string[]).includes(v);
}

/** The open tab is mirrored to `?tab=` so alerts, links and reloads land on the same layer. */
export function useFinanceTab(): [FinanceTab, (tab: string) => void] {
  const raw = useSearchParams().get("tab");
  const fromUrl: FinanceTab = isFinanceTab(raw) ? raw : "overview";
  const [tab, setTab] = useState<FinanceTab>(fromUrl);

  useEffect(() => setTab(fromUrl), [fromUrl]);

  const select = useCallback((next: string) => {
    if (!isFinanceTab(next)) return;
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }, []);

  return [tab, select];
}
