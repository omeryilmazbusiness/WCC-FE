"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/cn";

/** Above this many pages the dots become a "3 / 12" counter. */
const MAX_DOTS = 7;

type PagerProps = {
  /** 0-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Hide entirely when everything fits on one page (default). */
  hideWhenSingle?: boolean;
  className?: string;
};

/**
 * iOS-style page control: chevrons around page dots. Data-agnostic — works for
 * client-side lists (usePagination) and server-paged endpoints alike.
 */
export function Pager({ page, pageCount, onPageChange, hideWhenSingle = true, className }: PagerProps) {
  const t = useTranslations("common.pager");
  if (hideWhenSingle && pageCount <= 1) return null;
  const hasPrev = page > 0;
  const hasNext = page + 1 < pageCount;

  return (
    <nav
      aria-label={t("label")}
      className={cn("flex items-center justify-center gap-2", className)}
      data-testid="pager"
    >
      <PagerArrow disabled={!hasPrev} onClick={() => onPageChange(page - 1)} label={t("prev")}>
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" strokeWidth={2} />
      </PagerArrow>
      {pageCount <= MAX_DOTS ? (
        <div className="flex items-center gap-1.5">
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={t("page", { page: i + 1, pages: pageCount })}
              aria-current={i === page ? "page" : undefined}
              onClick={() => onPageChange(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === page ? "w-5 bg-zinc-900" : "w-2 bg-zinc-300 hover:bg-zinc-400",
              )}
            />
          ))}
        </div>
      ) : (
        <span className="min-w-12 text-center text-xs font-semibold tabular-nums text-zinc-500" aria-live="polite">
          {page + 1} / {pageCount}
        </span>
      )}
      <PagerArrow disabled={!hasNext} onClick={() => onPageChange(page + 1)} label={t("next")}>
        <ChevronRight className="h-4 w-4 rtl:rotate-180" strokeWidth={2} />
      </PagerArrow>
    </nav>
  );
}

function PagerArrow({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
