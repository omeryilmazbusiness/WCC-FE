"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { listAuditEvents, type AuditEvent } from "@/entities/identity";
import { formatDateTime } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import {
  DataTable,
  ListScreen,
  QueryState,
  SearchFilterBar,
} from "@/shared/ui";

export function AuditLogView() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [entityType, setEntityType] = useState("all");
  const [query, setQuery] = useState("");
  const events = useApiQuery(
    () => listAuditEvents({ entityType: entityType === "all" ? undefined : entityType }),
    [entityType],
  );
  const rows = useMemo<AuditEvent[]>(() => events.data ?? [], [events.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.action.toLowerCase().includes(q) ||
        r.entity_type.toLowerCase().includes(q) ||
        (r.actor_id ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  const columns = useMemo<ColumnDef<AuditEvent>[]>(
    () => [
      {
        accessorKey: "created_at",
        header: t("when"),
        cell: ({ row }) => formatDateTime(row.original.created_at, locale),
      },
      { accessorKey: "action", header: t("action") },
      { accessorKey: "entity_type", header: t("entity") },
      {
        accessorKey: "entity_id",
        header: t("entityId"),
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-zinc-500">
            {row.original.entity_id?.slice(0, 8) ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "actor_id",
        header: t("actor"),
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-zinc-500">
            {row.original.actor_id?.slice(0, 8) ?? "—"}
          </span>
        ),
      },
    ],
    [t, locale],
  );

  return (
    <ListScreen title={t("auditTitle")} description={t("auditSubtitle")}
      toolbar={
        <SearchFilterBar
          value={query}
          onValueChange={setQuery}
          placeholder={t("entityFilter")}
          clearLabel={tc("clearSearch")}
          filterLabel={tc("filter")}
          resetLabel={tc("resetFilters")}
          isFiltered={entityType !== "all" || query.length > 0}
          onReset={() => {
            setQuery("");
            setEntityType("all");
          }}
          sections={[
            {
              id: "entity",
              label: t("entity"),
              value: entityType,
              onChange: setEntityType,
              options: [
                { value: "all", label: t("allEntities") },
                { value: "user", label: "user" },
                { value: "booking", label: "booking" },
                { value: "payment", label: "payment" },
              ],
            },
          ]}
        />
      }
    >
      <QueryState
        loading={events.loading && !events.data}
        error={events.error}
        errorTitle={t("loadError")}
        retryLabel={tc("retry")}
        onRetry={() => void events.reload()}
        empty={filtered.length === 0}
        emptyTitle={t("auditEmpty")}
      >
        <DataTable columns={columns} data={filtered} />
      </QueryState>
    </ListScreen>
  );
}
