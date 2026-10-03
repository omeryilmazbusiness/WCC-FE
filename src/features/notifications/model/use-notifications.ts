"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createNotificationRepository,
  type AppNotification,
  type NotificationPreference,
} from "@/entities/notification";
import { useRealtime, useRealtimeStatus } from "@/shared/lib/use-realtime";

const repo = createNotificationRepository();

export function useNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    try {
      const [{ items: list }, count] = await Promise.all([
        repo.list(),
        repo.unreadCount(),
      ]);
      setItems(list);
      setUnread(count);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    repo
      .getPreferences()
      .then((p) => {
        if (!cancelled) setPrefs(p);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useRealtime(() => void refresh(), { types: ["notification"] }, { debounceMs: 300 });
  const live = useRealtimeStatus() === "open";

  useEffect(() => {
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  // Polling is only the fallback while the realtime stream is down.
  useEffect(() => {
    if (live) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 45_000);
    return () => window.clearInterval(id);
  }, [refresh, live]);

  const acknowledge = useCallback(
    async (id: string) => {
      await repo.acknowledge(id);
      await refresh();
    },
    [refresh],
  );

  const resolve = useCallback(
    async (id: string) => {
      await repo.resolve(id);
      await refresh();
    },
    [refresh],
  );

  const acknowledgeAll = useCallback(async () => {
    await repo.acknowledgeAll();
    await refresh();
  }, [refresh]);

  const updatePreferences = useCallback(
    async (input: { emailEnabled: boolean; pushEnabled: boolean }) => {
      const next = await repo.updatePreferences(input);
      setPrefs(next);
      return next;
    },
    [],
  );

  return {
    items,
    unread,
    prefs,
    loading,
    error,
    refresh,
    acknowledge,
    resolve,
    acknowledgeAll,
    updatePreferences,
  };
}
