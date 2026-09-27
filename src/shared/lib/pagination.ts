/** Pure paging math shared by client-side lists and server-paged screens (0-based pages). */

export type PageSlice<T> = {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
  /** 1-based index of the first item on the page, 0 when empty. */
  from: number;
  /** 1-based index of the last item on the page, 0 when empty. */
  to: number;
};

export function pageCountOf(total: number, pageSize: number): number {
  if (!Number.isFinite(total) || total <= 0) return 1;
  return Math.ceil(total / Math.max(1, Math.floor(pageSize)));
}

export function clampPage(page: number, pageCount: number): number {
  if (!Number.isFinite(page) || page < 0) return 0;
  return Math.min(Math.floor(page), Math.max(0, pageCount - 1));
}

export function slicePage<T>(items: readonly T[], page: number, pageSize: number): PageSlice<T> {
  const size = Math.max(1, Math.floor(pageSize));
  const total = items.length;
  const pageCount = pageCountOf(total, size);
  const current = clampPage(page, pageCount);
  const start = current * size;
  const pageItems = items.slice(start, start + size);
  return {
    items: pageItems,
    page: current,
    pageCount,
    total,
    from: pageItems.length ? start + 1 : 0,
    to: start + pageItems.length,
  };
}

/** Height that keeps a paged list steady whether a page is full or not. */
export function listHeight(pageSize: number, rowHeight: number, gap: number): number {
  const rows = Math.max(1, Math.floor(pageSize));
  return rows * rowHeight + (rows - 1) * gap;
}
