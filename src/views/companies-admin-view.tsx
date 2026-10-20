"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { COMPANY_LIST_LIMIT, listCompanies, type PlatformCompany } from "@/entities/company";
import { CompanyLogoThumb, RegisterCompanyDialog } from "@/features/register-company";
import { formatDateTime } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import {
  Badge,
  Button,
  DataTable,
  ListScreen,
  QueryState,
  SearchFilterBar,
} from "@/shared/ui";

export function CompaniesAdminView() {
  const t = useTranslations("adminCompanies");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const q = useDebouncedValue(query.trim(), 250);

  const companies = useApiQuery(() => listCompanies({ q: q || undefined }), [q], {
    cacheKey: ["companies", q],
  });
  const rows = useMemo(() => companies.data ?? [], [companies.data]);

  const columns = useMemo<ColumnDef<PlatformCompany>[]>(
    () => [
      {
        header: t("columns.company"),
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <CompanyLogoThumb
              name={row.original.name_en}
              slug={row.original.slug}
              hasLogo={row.original.has_logo}
              logoVersion={row.original.logo_version}
            />
            <div className="min-w-0">
              <p className="truncate font-semibold text-zinc-950">{row.original.name_en}</p>
              <p className="truncate font-mono text-[11px] text-zinc-500">/{row.original.slug}</p>
            </div>
          </div>
        ),
      },
      {
        header: t("columns.gm"),
        cell: ({ row }) => <span className="text-zinc-700">{row.original.gm_email || "—"}</span>,
      },
      {
        header: t("columns.location"),
        cell: ({ row }) => (
          <span className="text-zinc-600">
            {[row.original.city, row.original.country].filter(Boolean).join(", ") || "—"}
          </span>
        ),
      },
      {
        header: t("columns.branches"),
        cell: ({ row }) => <span className="tabular-nums">{row.original.branch_count}</span>,
      },
      {
        header: t("columns.users"),
        cell: ({ row }) => <span className="tabular-nums">{row.original.user_count}</span>,
      },
      {
        header: t("columns.status"),
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge className="bg-emerald-50 text-emerald-700">{t("active")}</Badge>
          ) : (
            <Badge className="bg-rose-50 text-rose-700">{t("suspended")}</Badge>
          ),
      },
      {
        header: t("columns.created"),
        cell: ({ row }) => (
          <span className="text-zinc-500">{formatDateTime(new Date(row.original.created_at), locale)}</span>
        ),
      },
    ],
    [t, locale],
  );

  return (
    <ListScreen
      title={t("title")}
      description={t("subtitle")}
      actions={
        <Button size="sm" onClick={() => setOpen(true)} data-testid="companies-register">
          <Plus className="h-4 w-4" />
          {t("register")}
        </Button>
      }
      toolbar={
        <SearchFilterBar
          value={query}
          onValueChange={setQuery}
          placeholder={t("search")}
          clearLabel={tc("clearSearch")}
          filterLabel={tc("filter")}
          resetLabel={tc("resetFilters")}
          isFiltered={query.length > 0}
          onReset={() => setQuery("")}
          sections={[]}
        />
      }
    >
      <QueryState
        loadingVariant="table"
        loading={companies.loading && !companies.data}
        error={companies.error}
        onRetry={() => void companies.reload()}
        empty={rows.length === 0}
        emptyTitle={t("empty")}
      >
        <DataTable columns={columns} data={rows} />
        {rows.length >= COMPANY_LIST_LIMIT ? (
          <p className="mt-3 text-[12px] text-zinc-500">{t("limitHint", { count: COMPANY_LIST_LIMIT })}</p>
        ) : null}
      </QueryState>

      <RegisterCompanyDialog open={open} onOpenChange={setOpen} onRegistered={() => void companies.reload()} />
    </ListScreen>
  );
}
