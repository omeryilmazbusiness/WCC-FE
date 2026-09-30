"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { isApiError, isNetworkError } from "@/shared/api/api-error";
import { formatCountdown } from "@/shared/lib/use-countdown";

export type ErrorKind =
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "validation"
  | "locked"
  | "rateLimited"
  | "network"
  | "server"
  | "unknown";

export function errorKind(err: unknown): ErrorKind {
  if (isNetworkError(err)) return "network";
  if (!isApiError(err)) return "unknown";
  switch (err.status) {
    case 400:
    case 422:
      return "validation";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "notFound";
    case 409:
      return "conflict";
    case 423:
      return "locked";
    case 429:
      return "rateLimited";
    default:
      return err.status >= 500 ? "server" : "unknown";
  }
}

export type DescribedError = {
  kind: ErrorKind;
  title: string;
  description?: string;
};

/** Maps any thrown value to localized copy; backend text is shown only for 4xx business errors. */
export function useDescribeError(): (err: unknown) => DescribedError {
  const t = useTranslations("errors");
  return useCallback(
    (err: unknown) => {
      const kind = errorKind(err);
      const backendMessage = isApiError(err) && err.message ? err.message : undefined;
      switch (kind) {
        case "forbidden":
          return { kind, title: t("forbiddenTitle"), description: t("forbiddenDescription") };
        case "conflict":
          return { kind, title: t("conflictTitle"), description: backendMessage ?? t("conflictDescription") };
        case "validation": {
          const code = backendMessage?.match(/^([a-z_]+):/)?.[1];
          const known = code && t.has(`codes.${code}`) ? t(`codes.${code}`) : undefined;
          return {
            kind,
            title: t("validationTitle"),
            description: known ?? backendMessage ?? t("validationDescription"),
          };
        }
        case "locked":
        case "rateLimited": {
          const retryAfter = isApiError(err) ? err.retryAfter : undefined;
          return {
            kind,
            title: kind === "locked" ? t("lockedTitle") : t("rateLimitedTitle"),
            description:
              retryAfter !== undefined
                ? t("retryIn", { time: formatCountdown(retryAfter) })
                : t("retryLater"),
          };
        }
        case "notFound":
          return { kind, title: t("notFoundTitle"), description: t("notFoundDescription") };
        case "unauthorized":
          return { kind, title: t("unauthorizedTitle"), description: t("unauthorizedDescription") };
        case "network":
          return { kind, title: t("networkTitle"), description: t("networkDescription") };
        case "server":
          return { kind, title: t("serverTitle"), description: t("serverDescription") };
        default:
          return { kind, title: t("unknownTitle"), description: t("unknownDescription") };
      }
    },
    [t],
  );
}
