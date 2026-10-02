"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { LoadingState } from "./loading-state";
import { PermissionDenied } from "./permission-denied";
import type { SkeletonVariant } from "./skeleton";
import { useDescribeError } from "./use-describe-error";

type QueryStateProps = {
  loading?: boolean;
  /** A string message, or any thrown value (typed `ApiError` → 403 / 409 / 423 / 5xx UX). */
  error?: unknown;
  forbidden?: boolean;
  empty?: boolean;
  loadingLabel?: string;
  /** Skeleton shape while loading (matches the content layout). */
  loadingVariant?: SkeletonVariant;
  /** Sketch the page title too, when nothing else is on screen yet. */
  loadingHeader?: boolean;
  errorTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  forbiddenTitle?: string;
  forbiddenDescription?: string;
  retryLabel?: string;
  onRetry?: () => void;
  children: ReactNode;
};

/**
 * Single composition for list/detail query UX (SOLID: one job — gate content).
 * Prefer this over ad-hoc if/else chains on boards (Epic 17 T-216).
 */
export function QueryState({
  loading,
  error,
  forbidden,
  empty,
  loadingLabel,
  loadingVariant,
  loadingHeader,
  errorTitle,
  emptyTitle,
  emptyDescription,
  forbiddenTitle,
  forbiddenDescription,
  retryLabel,
  onRetry,
  children,
}: QueryStateProps) {
  const t = useTranslations("errors");
  const describe = useDescribeError();

  if (loading) {
    return <LoadingState label={loadingLabel} variant={loadingVariant} withHeader={loadingHeader} />;
  }

  const described = error && typeof error !== "string" ? describe(error) : null;

  if (forbidden || described?.kind === "forbidden") {
    return (
      <PermissionDenied
        title={forbiddenTitle ?? t("forbiddenTitle")}
        description={forbiddenDescription ?? t("forbiddenDescription")}
      />
    );
  }
  if (error) {
    const retryable = !described || !["validation", "notFound"].includes(described.kind);
    return (
      <ErrorState
        title={errorTitle ?? described?.title ?? t("unknownTitle")}
        description={typeof error === "string" ? error : described?.description}
        retryLabel={retryable ? (retryLabel ?? t("retry")) : undefined}
        onRetry={retryable ? onRetry : undefined}
      />
    );
  }
  if (empty) {
    return <EmptyState title={emptyTitle ?? t("emptyTitle")} description={emptyDescription} />;
  }
  return <>{children}</>;
}
