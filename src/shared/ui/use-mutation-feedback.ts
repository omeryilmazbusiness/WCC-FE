"use client";

import { useMemo } from "react";
import { useDescribeError } from "./use-describe-error";
import { useToast } from "./toast";

/** Standard success / error toasts for mutations (typed `ApiError` aware). */
export function useMutationFeedback() {
  const { push } = useToast();
  const describe = useDescribeError();

  return useMemo(
    () => ({
      success(title: string, description?: string) {
        push({ title, description, tone: "success" });
      },
      error(err: unknown, title?: string) {
        const described = describe(err);
        push({
          title: title ?? described.title,
          description: described.description,
          tone: "error",
          durationMs: 6000,
        });
      },
    }),
    [push, describe],
  );
}
