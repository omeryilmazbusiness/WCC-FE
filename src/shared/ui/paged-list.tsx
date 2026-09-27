"use client";

import type { ReactNode } from "react";
import { listHeight } from "@/shared/lib/pagination";
import { usePagination } from "@/shared/lib/use-pagination";
import { cn } from "@/shared/lib/cn";
import { Pager } from "./pager";

type PagedListProps<T> = {
  items: readonly T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Rows per page; the list always reserves room for this many rows. */
  pageSize?: number;
  /** Fixed row height in px — rows are clipped to it so every page is the same size. */
  rowHeight?: number;
  gap?: number;
  /** Shown instead of the list when there are no items. */
  empty?: ReactNode;
  /** Changing it (e.g. a filter) goes back to the first page. */
  resetKey?: string | number;
  className?: string;
  "data-testid"?: string;
};

/**
 * A list that never grows with its data: fixed rows per page, constant height, page
 * dots underneath. Use it inside any card whose item count is unbounded.
 */
export function PagedList<T>({
  items,
  getKey,
  renderItem,
  pageSize = 5,
  rowHeight = 60,
  gap = 8,
  empty,
  resetKey,
  className,
  "data-testid": testId,
}: PagedListProps<T>) {
  const pager = usePagination(items, { pageSize, resetKey });
  const height = listHeight(pageSize, rowHeight, gap);

  return (
    <div className={cn("flex flex-col gap-3", className)} data-testid={testId}>
      {items.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height }}>
          {empty}
        </div>
      ) : (
        <ul className="flex flex-col" style={{ height, gap }}>
          {pager.items.map((item) => (
            <li key={getKey(item)} className="shrink-0 overflow-hidden" style={{ height: rowHeight }}>
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
      <div className="flex h-8 items-center justify-center">
        <Pager page={pager.page} pageCount={pager.pageCount} onPageChange={pager.setPage} />
      </div>
    </div>
  );
}
