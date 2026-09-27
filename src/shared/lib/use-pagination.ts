"use client";

import { useCallback, useMemo, useState } from "react";
import { clampPage, slicePage, type PageSlice } from "./pagination";

export type Pagination<T> = PageSlice<T> & {
  setPage: (page: number) => void;
  next: () => void;
  prev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
};

type Options = {
  pageSize: number;
  /** Changing it (e.g. a filter) goes back to the first page. */
  resetKey?: string | number;
};

/** Client-side paging over an in-memory list; stays on a valid page when the list changes. */
export function usePagination<T>(items: readonly T[], { pageSize, resetKey }: Options): Pagination<T> {
  const [page, setPageState] = useState(0);
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    setPageState(0);
  }

  const slice = useMemo(() => slicePage(items, page, pageSize), [items, page, pageSize]);
  if (slice.page !== page) setPageState(slice.page);

  const { pageCount } = slice;
  const setPage = useCallback((p: number) => setPageState(clampPage(p, pageCount)), [pageCount]);
  const next = useCallback(() => setPageState((p) => clampPage(p + 1, pageCount)), [pageCount]);
  const prev = useCallback(() => setPageState((p) => clampPage(p - 1, pageCount)), [pageCount]);

  return {
    ...slice,
    setPage,
    next,
    prev,
    hasNext: slice.page + 1 < pageCount,
    hasPrev: slice.page > 0,
  };
}
