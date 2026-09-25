"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createNotificationRepository,
  toneFromSeverity,
  type AppNotification,
  type NotificationPreference,
} from "@/entities/notification";

export type BellItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
  tone?: "default" | "warning" | "critical" | "success";
  status: AppNotification["status"];
  kind: string;
};

function toBellItem(n: AppNotification): BellItem {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    createdAt: n.createdAt,
    read: n.status !== "open",
    href: n.hrefHint || undefined,
    tone: toneFromSeverity(n.severity),
    status: n.status,
    kind: n.kind,
  };
}

const repo = createNotificationRepository();

export function useNotifications() {
  const [items, setItems] = useState<BellItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [{ items: list }, count, preferences] = await Promise.all([
        repo.list(),
        repo.unreadCount(),
        repo.getPreferences(),
      ]);
      setItems(list.map(toBellItem));
      setUnread(count);
      setPrefs(preferences);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 45_000);
    return () => window.clearInterval(id);
  }, [refresh]);

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
    refresh,
    acknowledge,
    resolve,
    acknowledgeAll,
    updatePreferences,
  };
}
