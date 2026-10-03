"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { notificationKindKey } from "./notification-look";

/** Localized name of a notification kind; falls back to the server title, then the raw kind. */
export function useKindLabel(): (kind: string, fallback?: string) => string {
  const t = useTranslations("notificationCenter.kinds");
  return useCallback(
    (kind, fallback) => {
      const key = notificationKindKey(kind);
      return t.has(key) ? t(key as "task_overdue") : fallback || kind;
    },
    [t],
  );
}
