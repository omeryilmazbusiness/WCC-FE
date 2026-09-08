"use client";

import type { ReactNode } from "react";
import { PageHeader } from "@/shared/ui/page-header";
import { Screen } from "@/shared/ui/screen";
import { cn } from "@/shared/lib/cn";

type ListScreenProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Prefer SearchFilterBar — frameless search + filter edit */
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Canonical list layout — large title always under the utility header.
 */
export function ListScreen({
  title,
  description,
  actions,
  toolbar,
  children,
  className,
}: ListScreenProps) {
  return (
    <Screen className={className}>
      <PageHeader title={title} description={description} actions={actions} />
      {toolbar ? (
        <div className={cn("w-full max-w-xl")}>{toolbar}</div>
      ) : null}
      {children}
    </Screen>
  );
}
