"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_PRESET,
  REPORT_KINDS,
  isDay,
  presetRange,
  type DayRange,
  type ReportKind,
} from "@/entities/report";

export type ReportParams = {
  kind: ReportKind;
  range: DayRange;
  channel: string;
  provider: string;
};

type Patch = Partial<Omit<ReportParams, "range">> & { range?: DayRange };

const DEFAULT_KIND: ReportKind = "sales";

function parseKind(value: string | null): ReportKind {
  return (REPORT_KINDS as readonly string[]).includes(value ?? "") ? (value as ReportKind) : DEFAULT_KIND;
}

/** Report, period and extra filter live in the URL so a view can be bookmarked and shared. */
export function useReportParams(today: string): [ReportParams, (patch: Patch) => void] {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const params = useMemo<ReportParams>(() => {
    const fallback = presetRange(DEFAULT_PRESET, today);
    const from = search.get("from") ?? "";
    const to = search.get("to") ?? "";
    const hasRange = isDay(from) && isDay(to);
    return {
      kind: parseKind(search.get("kind")),
      range: hasRange ? { from, to } : fallback,
      channel: (search.get("channel") ?? "").trim(),
      provider: (search.get("provider") ?? "").trim(),
    };
  }, [search, today]);

  const update = useCallback(
    (patch: Patch) => {
      const next = new URLSearchParams(search.toString());
      const set = (key: string, value: string, fallback = "") => {
        if (value && value !== fallback) next.set(key, value);
        else next.delete(key);
      };
      if (patch.kind !== undefined) set("kind", patch.kind, DEFAULT_KIND);
      if (patch.range) {
        const fallback = presetRange(DEFAULT_PRESET, today);
        const isDefault = patch.range.from === fallback.from && patch.range.to === fallback.to;
        set("from", isDefault ? "" : patch.range.from);
        set("to", isDefault ? "" : patch.range.to);
      }
      if (patch.channel !== undefined) set("channel", patch.channel.trim());
      if (patch.provider !== undefined) set("provider", patch.provider.trim());
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, search, today],
  );

  return [params, update];
}
