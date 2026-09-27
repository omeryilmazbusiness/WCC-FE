"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { isApiError } from "@/shared/api/api-error";
import { useMutationFeedback, useToast } from "@/shared/ui";
import { FORBIDDEN_AUTO_VERIFY_CODE, SOD_VIOLATION_CODE } from "../model";

const SPECIFIC: Record<string, "sodViolation" | "forbiddenAutoVerify"> = {
  [SOD_VIOLATION_CODE]: "sodViolation",
  [FORBIDDEN_AUTO_VERIFY_CODE]: "forbiddenAutoVerify",
};

/** `useMutationFeedback` with explicit copy for segregation-of-duties and auto-verify 403s. */
export function usePaymentErrorFeedback() {
  const t = useTranslations("finance.errors");
  const feedback = useMutationFeedback();
  const { push } = useToast();
  return useMemo(
    () => ({
      success: feedback.success,
      error(err: unknown, title?: string) {
        const key = isApiError(err) && err.status === 403 ? SPECIFIC[err.code] : undefined;
        if (!key) {
          feedback.error(err, title);
          return;
        }
        push({ title: t(`${key}Title`), description: t(key), tone: "error", durationMs: 8000 });
      },
    }),
    [feedback, push, t],
  );
}
