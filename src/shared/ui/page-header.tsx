import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

/**
 * Always-visible screen title under AppHeader.
 * Do not hide the title — AppHeader no longer shows section names.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm font-medium text-zinc-500">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
