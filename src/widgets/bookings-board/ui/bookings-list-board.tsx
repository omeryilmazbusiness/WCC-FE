"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlarmClock, CalendarCheck2 } from "lucide-react";
import {
  BOOKING_SORTS,
  BOOKING_STATUSES,
  SALES_CHANNELS,
  SERVICE_TYPES,
  createBookingWorkspaceRepository,
  endOfLocalDay,
  type Booking,
  type BookingRepository,
  type BookingWorkspaceRepository,
} from "@/entities/booking";
import { CreateBookingDialog } from "@/features/create-booking";
import { BookingWorkspaceDrawer } from "@/widgets/booking-workspace";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { EmptyState, ListScreen, QueryState, SearchFilterBar } from "@/shared/ui";
import { ALL, DEFAULT_FILTERS, activeFilterCount, toListParams, type BookingFilterValues } from "../model/list-filters";
import { BookingCard } from "./booking-card";
import { BookingsTable } from "./bookings-table";
import { DateRangeFilter } from "./date-range-filter";
import { SegmentTiles } from "./segment-tiles";

type Props = {
  repository: BookingRepository;
  workspace?: BookingWorkspaceRepository;
  customerId?: string;
  departureId?: string;
};

const SEARCH_DEBOUNCE_MS = 300;

export function BookingsListBoard({ repository, workspace: workspaceProp, customerId, departureId }: Props) {
  const t = useTranslations("bookingWorkspace");
  const tStatus = useTranslations("bookings.status");
  const tc = useTranslations("common");
  const [workspace] = useState(() => workspaceProp ?? createBookingWorkspaceRepository());
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<BookingFilterValues>(DEFAULT_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);
  const q = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const dayEnd = useMemo(() => endOfLocalDay(), []);
  const params = useMemo(() => toListParams(filters, q, { customerId, departureId }, dayEnd), [filters, q, customerId, departureId, dayEnd]);
  const key = JSON.stringify(params);

  const bookings = useApiQuery(() => repository.list(params), [repository, key], {
    liveTopics: ["payment", "document"],
    cacheKey: ["bookings", key],
  });
  const stats = useApiQuery(() => workspace.stats(params), [workspace, key], {
    liveTopics: ["payment", "document"],
    cacheKey: ["bookings-stats", key],
  });
  const rows = useMemo<Booking[]>(() => bookings.data ?? [], [bookings.data]);

  const set = <K extends keyof BookingFilterValues>(k: K, v: BookingFilterValues[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const isFiltered = activeFilterCount(filters) > 0 || query.length > 0;
  const reset = () => {
    setQuery("");
    setFilters(DEFAULT_FILTERS);
  };
  const reload = () => {
    void bookings.refresh();
    void stats.refresh();
  };

  const urgent = stats.data?.optionUrgent ?? 0;

  return (
    <ListScreen
      title={t("list.title")}
      description={t("list.subtitle")}
      toolbarWidth="full"
      actions={<CreateBookingDialog repository={repository} defaultCustomerId={customerId} defaultDepartureId={departureId} onCreated={(id) => {
        reload();
        setOpenId(id);
      }} />}
      toolbar={
        <div className="space-y-4">
          <SegmentTiles value={filters.segment} onChange={(s) => set("segment", s)} stats={stats.data} />
          {urgent > 0 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-[22px] bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-3 text-white shadow-[0_16px_40px_-24px_rgba(244,63,94,0.8)]" role="alert" data-testid="booking-urgent-banner">
              <AlarmClock className="h-5 w-5 animate-pulse" aria-hidden />
              <p className="flex-1 text-[13.5px] font-semibold">{t("list.urgent", { count: urgent })}</p>
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, segment: "option_today", sort: "ttl" }))}
                className="rounded-xl bg-white/20 px-3 py-1.5 text-[12.5px] font-semibold backdrop-blur transition hover:bg-white/30"
              >
                {t("list.showUrgent")}
              </button>
            </div>
          ) : null}
          <div className="flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
            <SearchFilterBar
              variant="hero"
              className="min-w-0 flex-1"
              value={query}
              onValueChange={setQuery}
              placeholder={t("list.searchPlaceholder")}
              clearLabel={tc("clearSearch")}
              filterLabel={tc("filter")}
              resetLabel={tc("resetFilters")}
              isFiltered={isFiltered}
              onReset={reset}
              loading={bookings.loading && Boolean(bookings.data)}
              sections={[
                {
                  id: "service",
                  label: t("list.serviceType"),
                  value: filters.service,
                  defaultValue: ALL,
                  onChange: (v: BookingFilterValues["service"]) => set("service", v),
                  options: [{ value: ALL, label: t("list.any") }, ...SERVICE_TYPES.map((s) => ({ value: s, label: t(`service.${s}`) }))],
                },
                {
                  id: "channel",
                  label: t("list.channel"),
                  value: filters.channel,
                  defaultValue: ALL,
                  onChange: (v: BookingFilterValues["channel"]) => set("channel", v),
                  options: [{ value: ALL, label: t("list.any") }, ...SALES_CHANNELS.map((c) => ({ value: c, label: t(`channel.${c}`) }))],
                },
                {
                  id: "status",
                  label: t("list.status"),
                  value: filters.status,
                  defaultValue: ALL,
                  onChange: (v: BookingFilterValues["status"]) => set("status", v),
                  options: [{ value: ALL, label: t("list.any") }, ...BOOKING_STATUSES.map((s) => ({ value: s, label: tStatus(s) }))],
                },
                {
                  id: "sort",
                  label: t("sort.label"),
                  value: filters.sort,
                  defaultValue: DEFAULT_FILTERS.sort,
                  onChange: (v: BookingFilterValues["sort"]) => set("sort", v),
                  options: BOOKING_SORTS.map((s) => ({ value: s, label: t(`sort.${s}`) })),
                },
              ]}
            />
            <DateRangeFilter
              field={filters.dateField}
              from={filters.from}
              to={filters.to}
              onChange={({ field, from, to }) => setFilters((f) => ({ ...f, dateField: field, from, to }))}
            />
          </div>
        </div>
      }
    >
      <QueryState
        loadingVariant="table"
        loading={bookings.loading && !bookings.data}
        loadingLabel={tc("loading")}
        error={bookings.error}
        onRetry={() => void bookings.reload()}
      >
        {rows.length === 0 ? (
          <EmptyState
            icon={CalendarCheck2}
            title={isFiltered ? t("list.emptyFiltered") : t("list.empty")}
            description={isFiltered ? t("list.emptyFilteredHint") : t("list.emptyHint")}
            actionLabel={isFiltered ? tc("resetFilters") : undefined}
            onAction={isFiltered ? reset : undefined}
          />
        ) : (
          <>
            <p className="mb-2 text-[12.5px] font-medium text-zinc-500" aria-live="polite">
              {t("list.results", { count: rows.length })}
            </p>
            <BookingsTable rows={rows} onOpen={(b) => setOpenId(b.id)} activeId={openId} />
            <ul className="grid gap-3 sm:grid-cols-2 lg:hidden" data-testid="booking-cards">
              {rows.map((b) => (
                <li key={b.id}>
                  <BookingCard booking={b} onOpen={(x) => setOpenId(x.id)} />
                </li>
              ))}
            </ul>
          </>
        )}
      </QueryState>

      <BookingWorkspaceDrawer
        bookingId={openId}
        onOpenChange={(open) => !open && setOpenId(null)}
        repository={repository}
        workspace={workspace}
        onChanged={reload}
      />
    </ListScreen>
  );
}
