"use client";

import type { ReactNode } from "react";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { LoadingState } from "./loading-state";
import { PermissionDenied } from "./permission-denied";

type QueryStateProps = {
  loading?: boolean;
  error?: string | null;
  forbidden?: boolean;
  empty?: boolean;
  loadingLabel?: string;
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
  errorTitle = "Something went wrong",
  emptyTitle = "Nothing here yet",
  emptyDescription,
  forbiddenTitle = "Access denied",
  forbiddenDescription,
  retryLabel,
  onRetry,
  children,
}: QueryStateProps) {
  if (loading) return <LoadingState label={loadingLabel} />;
  if (forbidden) {
    return (
      <PermissionDenied
        title={forbiddenTitle}
        description={forbiddenDescription}
      />
    );
  }
  if (error) {
    return (
      <ErrorState
        title={errorTitle}
        description={error}
        retryLabel={retryLabel}
        onRetry={onRetry}
      />
    );
  }
  if (empty) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return <>{children}</>;
}
