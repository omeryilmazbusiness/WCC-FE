"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  parsePeriodParams,
  periodKey,
  writePeriodParams,
  type DashboardPeriod,
} from "@/entities/dashboard";

export type DashboardPeriodState = {
  period: DashboardPeriod;
  /** Stable string for query dependencies. */
  key: string;
  setPeriod: (next: DashboardPeriod) => void;
};

/**
 * The dashboard window lives in the URL so it survives reloads and can be shared.
 * Updates use the History API, which Next.js syncs into `useSearchParams`
 * without a server round trip.
 */
export function useDashboardPeriod(): DashboardPeriodState {
  const search = useSearchParams();
  const period = useMemo(() => parsePeriodParams(search, new Date()), [search]);
  const key = periodKey(period);

  const setPeriod = useCallback((next: DashboardPeriod) => {
    const { pathname, search: current, hash } = window.location;
    const qs = writePeriodParams(new URLSearchParams(current), next).toString();
    window.history.replaceState(null, "", `${pathname}${qs ? `?${qs}` : ""}${hash}`);
  }, []);

  return { period, key, setPeriod };
}
