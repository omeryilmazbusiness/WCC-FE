"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import {
  BOOKING_STATUSES,
  BookingStatusChip,
  HoldCountdownBadge,
  type Booking,
  type BookingRepository,
  type BookingStatus,
} from "@/entities/booking";
import { CreateBookingDialog } from "@/features/create-booking";
import { Link } from "@/shared/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { formatMoney } from "@/shared/lib/format";
import {
  DataTable,
  EmptyState,
  ListScreen,
  SearchFilterBar,
  QueryState,
} from "@/shared/ui";
import { useApiQuery } from "@/shared/lib/use-api-query";

type Props = {
  repository: BookingRepository;
  customerId?: string;
  departureId?: string;
};

const STATUSES: Array<BookingStatus | "all"> = ["all", ...BOOKING_STATUSES];

export function BookingsListBoard({
  repository,
  customerId,
  departureId,
}: Props) {
  const t = useTranslations("bookings");
  const tc = useTranslations("common");
  const locale = useLocale();
  const money = (amount: number, currency: string) => formatMoney(amount, locale, currency);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<BookingStatus | "all">("all");
  const bookings = useApiQuery(
    () =>
      repository.list({
        customerId,
        departureId,
        status: status === "all" ? undefined : status,
      }),
    [repository, customerId, departureId, status],
    {
      liveTopics: ["payment", "document"],
      cacheKey: ["bookings", customerId ?? null, departureId ?? null, status],
    },
  );
  const rows = useMemo<Booking[]>(() => bookings.data ?? [], [bookings.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (b) =>
        b.id.toLowerCase().includes(q) ||
        b.notes.toLowerCase().includes(q) ||
        b.customerId.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const columns: ColumnDef<Booking>[] = [
    {
      accessorKey: "id",
      header: t("fields.id"),
      cell: ({ row }) => (
        <Link
          href={routes.booking(row.original.id)}
          className="font-semibold text-zinc-950 underline-offset-4 hover:underline"
        >
          {row.original.id.slice(0, 8)}
        </Link>
      ),
    },
    {
      accessorKey: "status",
      header: t("fields.status"),
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <BookingStatusChip status={row.original.status} />
          {row.original.status === "option_hold" && row.original.holdExpiresAt ? (
            <HoldCountdownBadge expiresAt={row.original.holdExpiresAt} />
          ) : null}
        </div>
      ),
    },
    { accessorKey: "paxCount", header: t("fields.pax") },
    {
      id: "total",
      header: t("fields.total"),
      cell: ({ row }) => money(row.original.totalAmount, row.original.currency),
    },
    {
      id: "balance",
      header: t("fields.balance"),
      cell: ({ row }) => money(row.original.balanceAmt, row.original.currency),
    },
  ];

  const isFiltered = query.length > 0 || status !== "all";

  return (
    <ListScreen
      title={t("title")}
      description={t("subtitle")}
      actions={
        <CreateBookingDialog
          repository={repository}
          defaultCustomerId={customerId}
          defaultDepartureId={departureId}
          onCreated={() => void bookings.reload()}
        />
      }
      toolbar={
        <SearchFilterBar
          value={query}
          onValueChange={setQuery}
          placeholder={t("searchPlaceholder")}
          clearLabel={tc("clearSearch")}
          filterLabel={tc("filter")}
          resetLabel={tc("resetFilters")}
          isFiltered={isFiltered}
          onReset={() => {
            setQuery("");
            setStatus("all");
          }}
          sections={[
            {
              id: "status",
              label: t("fields.status"),
              value: status,
              onChange: (v) => setStatus(v as BookingStatus | "all"),
              options: STATUSES.map((s) => ({
                value: s,
                label: s === "all" ? t("filterAll") : t(`status.${s}`),
              })),
            },
          ]}
        />
      }
    >
      <QueryState
        loadingVariant="table"
        loading={bookings.loading && !bookings.data}
        loadingLabel={t("loading")}
        error={bookings.error}
        onRetry={() => void bookings.reload()}
      >
        {filtered.length === 0 ? (
          <EmptyState title={t("empty")} description={t("emptyHint")} />
        ) : (
          <DataTable columns={columns} data={filtered} />
        )}
      </QueryState>
    </ListScreen>
  );
}
