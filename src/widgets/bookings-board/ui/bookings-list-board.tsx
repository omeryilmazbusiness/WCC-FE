"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import type { Booking, BookingRepository, BookingStatus } from "@/entities/booking";
import { CreateBookingDialog } from "@/features/create-booking";
import { Link } from "@/shared/i18n/navigation";
import { routes } from "@/shared/config/routes";
import {
  Badge,
  DataTable,
  EmptyState,
  ListScreen,
  SearchFilterBar,
} from "@/shared/ui";

type Props = {
  repository: BookingRepository;
  customerId?: string;
  departureId?: string;
};

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(0)} ${currency}`;
  }
}

const STATUSES: Array<BookingStatus | "all"> = [
  "all",
  "draft",
  "confirmed",
  "cancelled",
  "completed",
];

export function BookingsListBoard({
  repository,
  customerId,
  departureId,
}: Props) {
  const t = useTranslations("bookings");
  const tc = useTranslations("common");
  const [rows, setRows] = useState<Booking[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<BookingStatus | "all">("all");
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    setRows(
      await repository.list({
        customerId,
        departureId,
        status: status === "all" ? undefined : status,
      }),
    );
    setLoaded(true);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository, customerId, departureId, status]);

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
        <Badge className={statusTone(row.original.status)}>
          {t(`status.${row.original.status}`)}
        </Badge>
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
          onCreated={() => void refresh()}
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
      {!loaded ? (
        <p className="text-sm text-zinc-500">{t("loading")}</p>
      ) : filtered.length === 0 ? (
        <EmptyState title={t("empty")} description={t("emptyHint")} />
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}
    </ListScreen>
  );
}

function statusTone(status: BookingStatus) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-50 text-emerald-800";
    case "cancelled":
      return "bg-rose-50 text-rose-800";
    case "completed":
      return "bg-sky-50 text-sky-800";
    default:
      return "bg-amber-50 text-amber-900";
  }
}
