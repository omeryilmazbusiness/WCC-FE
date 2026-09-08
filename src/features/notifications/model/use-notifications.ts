"use client";

import { useSyncExternalStore } from "react";
import {
  getNotifications,
  subscribeNotifications,
  unreadNotificationCount,
} from "./notification-store";

export function useNotifications() {
  const items = useSyncExternalStore(
    subscribeNotifications,
    getNotifications,
    getNotifications,
  );
  const unread = useSyncExternalStore(
    subscribeNotifications,
    unreadNotificationCount,
    unreadNotificationCount,
  );
  return { items, unread };
}
