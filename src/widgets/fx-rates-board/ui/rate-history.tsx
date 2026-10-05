"use client";

import { useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Banknote, CalendarDays, Coins, History, Pencil, RotateCcw } from "lucide-react";
import {
  CurrencyPairBadge,
  daysBetween,
  formatFxRate,
  groupByDay,
  type FxPage,
  type FxRate,
  type FxRepository,
} from "@/entities/fx";
import { Can } from "@/entities/viewer";
import { DeleteFxRateButton } from "@/features/manage-fx-rates";
import { cn } from "@/shared/lib/cn";
import { formatDateTime, formatDay, formatNumber } from "@/shared/lib/format";
import type { ApiQuery } from "@/shared/lib/use-api-query";
import { IconButton, IconInput, Pager, QueryState, TONES } from "@/shared/ui";
import type { RateFilters } from "../model/use-rate-filters";

type Props = {
  query: ApiQuery<FxPage>;
  filters: RateFilters;
  /** `BASE/QUOTE` shortcuts shown as chips. */
  pairs: readonly { base: string; quote: string }[];
  repository: FxRepository;
  today: string;
  onEdit: (rate: FxRate) => void;
  onChanged: () => void;
};

/** Every stored rate, newest first, grouped by effective date. */
export function RateHistory({ query, filters, pairs, repository, today, onEdit, onChanged }: Props) {
  const t = useTranslations("fx");
  const locale = useLocale();
  const page = query.data;
  const rows = page?.items ?? [];
  const pageCount = page ? Math.max(1, page.totalPages) : 1;
  const sectionRef = useRef<HTMLElement>(null);

  function goToPage(next: number) {
    filters.setPage(next);
    const top = sectionRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function dayLabel(day: string) {
    const age = daysBetween(day, today);
    if (age === 0) return t("history.today");
    if (age === 1) return t("history.yesterday");
    return formatDay(day, locale);
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="fx-history-title"
      className="@container rounded-[28px] border border-zinc-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      data-testid="fx-rates-history"
    >
      <header className="flex flex-wrap items-center gap-3">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", TONES.violet.gradient)} aria-hidden>
          <History className="h-5 w-5" strokeWidth={2.1} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="fx-history-title" className="text-[16px] font-semibold tracking-tight text-zinc-950">
            {t("history.title")}
          </h2>
          <p className="truncate text-[12.5px] text-zinc-500" aria-live="polite">
            {page ? t("history.count", { count: page.total }) : t("history.subtitle")}
          </p>
        </div>
        {filters.isFiltered ? (
          <button
            type="button"
            onClick={filters.reset}
            className="flex h-9 items-center gap-1.5 rounded-full bg-zinc-100 px-3.5 text-[13px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-200 hover:text-zinc-950"
            data-testid="fx-filters-reset"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
            {t("filters.reset")}
          </button>
        ) : null}
      </header>

      {pairs.length > 0 ? (
        <div
          role="group"
          aria-label={t("history.quickPairs")}
          className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <Chip active={!filters.activePair} onClick={() => filters.togglePair("", "")} label={t("history.allPairs")} />
          {pairs.map((p) => {
            const key = `${p.base}/${p.quote}`;
            return (
              <Chip
                key={key}
                active={filters.activePair === key}
                onClick={() => filters.togglePair(p.base, p.quote)}
                label={key}
                ltr
              />
            );
          })}
        </div>
      ) : null}

      <div className="mt-3 grid gap-2.5 @lg:grid-cols-2 @3xl:grid-cols-4">
        <IconInput
          icon={Banknote}
          aria-label={t("filters.base")}
          placeholder={t("filters.base")}
          dir="ltr"
          maxLength={3}
          autoComplete="off"
          value={filters.baseInput}
          onChange={(e) => filters.setBaseInput(e.target.value)}
          className="h-11 rounded-2xl uppercase placeholder:normal-case"
          data-testid="fx-filter-base"
        />
        <IconInput
          icon={Coins}
          aria-label={t("filters.quote")}
          placeholder={t("filters.quote")}
          dir="ltr"
          maxLength={3}
          autoComplete="off"
          value={filters.quoteInput}
          onChange={(e) => filters.setQuoteInput(e.target.value)}
          className="h-11 rounded-2xl uppercase placeholder:normal-case"
          data-testid="fx-filter-quote"
        />
        <IconInput
          icon={CalendarDays}
          type="date"
          aria-label={t("filters.from")}
          title={t("filters.from")}
          value={filters.from}
          max={filters.to || undefined}
          onChange={(e) => filters.setFrom(e.target.value)}
          className="h-11 rounded-2xl"
          data-testid="fx-filter-from"
        />
        <IconInput
          icon={CalendarDays}
          type="date"
          aria-label={t("filters.to")}
          title={t("filters.to")}
          value={filters.to}
          min={filters.from || undefined}
          onChange={(e) => filters.setTo(e.target.value)}
          className="h-11 rounded-2xl"
          data-testid="fx-filter-to"
        />
      </div>

      <div className="mt-5">
        <QueryState
          loadingVariant="table"
          loading={query.loading && !page}
          error={query.error}
          errorTitle={t("loadError")}
          onRetry={() => void query.reload()}
          empty={rows.length === 0}
          emptyTitle={filters.isFiltered ? t("emptyFiltered") : t("empty")}
          emptyDescription={filters.isFiltered ? undefined : t("emptyHint")}
        >
          <div className={cn("space-y-5 transition-opacity", query.loading && "opacity-60")} data-testid="fx-rates-table">
            {groupByDay(rows).map((group) => (
              <div key={group.day}>
                <h3 className="px-1 pb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                  {dayLabel(group.day)}
                </h3>
                <ul className="divide-y divide-zinc-100 overflow-hidden rounded-[22px] bg-zinc-50/70 ring-1 ring-inset ring-zinc-900/[0.04]">
                  {group.items.map((rate) => (
                    <RateRow
                      key={rate.id}
                      rate={rate}
                      editLabel={t("edit")}
                      metaLabel={rowMeta(rate, locale)}
                      onEdit={() => onEdit(rate)}
                      deleteButton={<DeleteFxRateButton rate={rate} repository={repository} onDeleted={onChanged} />}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {page ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[12.5px] tabular-nums text-zinc-500">
                {t("pagination.summary", {
                  from: formatNumber(page.offset + 1, locale),
                  to: formatNumber(page.offset + rows.length, locale),
                  total: formatNumber(page.total, locale),
                })}
              </span>
              <Pager
                page={Math.min(filters.page, pageCount - 1)}
                pageCount={pageCount}
                onPageChange={goToPage}
                hideWhenSingle={false}
              />
            </div>
          ) : null}
        </QueryState>
      </div>
    </section>
  );
}

function rowMeta(rate: FxRate, locale: string): string {
  const parts = [rate.source, rate.createdAt ? formatDateTime(rate.createdAt, locale) : ""];
  return parts.filter(Boolean).join(" · ") || "—";
}

function Chip({ active, onClick, label, ltr }: { active: boolean; onClick: () => void; label: string; ltr?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        active ? "bg-zinc-900 text-white shadow-sm" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950",
      )}
      data-testid="fx-pair-chip"
    >
      {ltr ? <bdi dir="ltr">{label}</bdi> : label}
    </button>
  );
}

function RateRow({
  rate,
  editLabel,
  metaLabel,
  onEdit,
  deleteButton,
}: {
  rate: FxRate;
  editLabel: string;
  metaLabel: string;
  onEdit: () => void;
  deleteButton: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-white" data-testid="fx-rate-row">
      <CurrencyPairBadge base={rate.base} quote={rate.quote} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-zinc-900">
          <bdi dir="ltr">
            {rate.base}/{rate.quote}
          </bdi>
        </p>
        <p className="truncate text-[12px] text-zinc-500">{metaLabel}</p>
      </div>
      <bdi dir="ltr" className="shrink-0 text-[16px] font-semibold tabular-nums tracking-tight text-zinc-950" title={rate.rate}>
        {formatFxRate(rate.rate)}
      </bdi>
      <Can perm="fx.manage">
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            type="button"
            variant="ghost"
            label={editLabel}
            title={editLabel}
            onClick={onEdit}
            className="h-9 w-9 rounded-full text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-900"
            data-testid="fx-rate-edit"
          >
            <Pencil className="h-4 w-4" strokeWidth={2} />
          </IconButton>
          {deleteButton}
        </div>
      </Can>
    </li>
  );
}
