"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  summarizeNotificationGroups,
  type NotificationRepository,
  type NotificationStatus,
} from "@/entities/notification";
import { usePathname, useRouter } from "@/shared/i18n/navigation";
import { pageCountOf } from "@/shared/lib/pagination";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { useRealtime, useRealtimeStatus } from "@/shared/lib/use-realtime";
import { useMutationFeedback } from "@/shared/ui";

export const NOTIFICATION_PAGE_SIZE = 25;

/** "active" = open + acknowledged (the default inbox); the rest map to one API status. */
export type NotificationStatusFilter = "active" | NotificationStatus;

export const NOTIFICATION_STATUS_FILTERS: readonly NotificationStatusFilter[] = ["active", "open", "acknowledged", "resolved"];

function isStatusFilter(v: string | null): v is NotificationStatusFilter {
  return NOTIFICATION_STATUS_FILTERS.includes(v as NotificationStatusFilter);
}

/** Which item an action is running for; "all" while acknowledging everything. */
export type BusyTarget = string | "all" | null;

/**
 * State and actions for the notification center. Filters live in the URL so a category
 * is linkable; both queries refresh over the realtime stream.
 */
export function useNotificationCenter(repo: NotificationRepository) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const feedback = useMutationFeedback();
  const live = useRealtimeStatus() === "open";

  const kind = search.get("kind") ?? "";
  const rawStatus = search.get("status");
  const status: NotificationStatusFilter = isStatusFilter(rawStatus) ? rawStatus : "active";
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<BusyTarget>(null);

  const setFilter = useCallback(
    (next: { kind?: string; status?: NotificationStatusFilter }) => {
      const sp = new URLSearchParams(search.toString());
      const k = next.kind ?? kind;
      const s = next.status ?? status;
      if (k) sp.set("kind", k);
      else sp.delete("kind");
      if (s !== "active") sp.set("status", s);
      else sp.delete("status");
      setPage(0);
      const q = sp.toString();
      router.replace(q ? `${pathname}?${q}` : pathname);
    },
    [search, kind, status, router, pathname],
  );

  const groups = useApiQuery(() => repo.summary(), [repo]);
  const list = useApiQuery(
    () =>
      repo.list({
        kinds: kind ? [kind] : undefined,
        status: status === "active" ? undefined : status,
        limit: NOTIFICATION_PAGE_SIZE,
        offset: page * NOTIFICATION_PAGE_SIZE,
      }),
    [repo, kind, status, page],
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([groups.refresh(), list.refresh()]);
  }, [groups, list]);

  useRealtime(() => void refreshAll(), { types: ["notification"] }, { debounceMs: 300 });

  const run = useCallback(
    async (target: BusyTarget, fn: () => Promise<unknown>) => {
      setBusy(target);
      try {
        await fn();
        await refreshAll();
      } catch (err) {
        feedback.error(err);
      } finally {
        setBusy(null);
      }
    },
    [refreshAll, feedback],
  );

  const groupRows = useMemo(() => groups.data ?? [], [groups.data]);
  const totals = useMemo(() => summarizeNotificationGroups(groupRows), [groupRows]);
  const total = list.data?.total ?? 0;

  return {
    live,
    kind,
    status,
    page,
    pageCount: pageCountOf(total, NOTIFICATION_PAGE_SIZE),
    setPage,
    selectKind: (next: string) => setFilter({ kind: next }),
    selectStatus: (next: NotificationStatusFilter) => setFilter({ status: next }),
    groups,
    groupRows,
    selectedGroup: groupRows.find((g) => g.kind === kind) ?? null,
    totals,
    list,
    items: list.data?.items ?? [],
    total,
    busy,
    acknowledge: (id: string) => run(id, () => repo.acknowledge(id)),
    resolve: (id: string) => run(id, () => repo.resolve(id)),
    acknowledgeAll: () => run("all", () => repo.acknowledgeAll()),
  };
}

export type NotificationCenterState = ReturnType<typeof useNotificationCenter>;
