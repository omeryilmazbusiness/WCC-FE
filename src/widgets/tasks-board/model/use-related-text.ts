"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import type { Task } from "@/entities/task";

const KNOWN = new Set(["lead", "booking", "customer", "conversation", "departure", "package"]);

/** Display text for a task's linked record; falls back to "<Type> · <short id>" when the API sends no label. */
export function useRelatedText(): (task: Pick<Task, "relatedType" | "relatedId" | "relatedLabel">) => string {
  const t = useTranslations("tasks.related");
  return useCallback(
    (task) => {
      if (task.relatedLabel) return task.relatedLabel;
      const type = KNOWN.has(task.relatedType) ? t(task.relatedType) : task.relatedType;
      return `${type} · ${task.relatedId.slice(0, 8)}`;
    },
    [t],
  );
}
