"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import {
  createCustomerRepository,
  type Customer,
} from "@/entities/customer";
import { useCan } from "@/entities/viewer";
import { CreateCustomerDialog } from "@/features/create-customer";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Link } from "@/shared/i18n/navigation";
import { routes } from "@/shared/config/routes";
import {
  DataTable,
  EmptyState,
  ListScreen,
  MaskedSecret,
  QueryState,
  SearchFilterBar,
  useMutationFeedback,
} from "@/shared/ui";

const repo = createCustomerRepository();

type EmailFilter = "all" | "with-email" | "missing-email";
type NameFilter = "all" | "has-ar" | "en-only";

export function CustomersListView() {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const canWrite = useCan("customers.write");
  const canRevealPii = useCan("pii.read");
  const [query, setQuery] = useState("");
  const [emailFilter, setEmailFilter] = useState<EmailFilter>("all");
  const [nameFilter, setNameFilter] = useState<NameFilter>("all");
  const search = useApiQuery(() => repo.search(query), [query]);
  const rows = useMemo<Customer[]>(() => search.data ?? [], [search.data]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (r.isActive === false) return false;
      if (emailFilter === "with-email" && !r.email?.trim()) return false;
      if (emailFilter === "missing-email" && r.email?.trim()) return false;
      if (nameFilter === "has-ar" && !r.fullNameAr?.trim()) return false;
      if (nameFilter === "en-only" && r.fullNameAr?.trim()) return false;
      return true;
    });
  }, [rows, emailFilter, nameFilter]);

  const counts = useMemo(
    () => ({
      emailAll: rows.filter((r) => r.isActive !== false).length,
      withEmail: rows.filter((r) => r.isActive !== false && Boolean(r.email?.trim())).length,
      missingEmail: rows.filter((r) => r.isActive !== false && !r.email?.trim()).length,
      nameAll: rows.filter((r) => r.isActive !== false).length,
      hasAr: rows.filter((r) => r.isActive !== false && Boolean(r.fullNameAr?.trim())).length,
      enOnly: rows.filter((r) => r.isActive !== false && !r.fullNameAr?.trim()).length,
    }),
    [rows],
  );

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: "fullName",
      header: t("name"),
      cell: ({ row }) => (
        <Link
          href={routes.customer(row.original.id)}
          className="font-semibold text-zinc-950 underline-offset-4 transition-colors duration-300 hover:underline"
        >
          {row.original.fullName}
        </Link>
      ),
    },
    { accessorKey: "fullNameAr", header: t("nameAr") },
    { accessorKey: "phone", header: t("phone") },
    {
      accessorKey: "email",
      header: t("email"),
      cell: ({ row }) => row.original.email || "—",
    },
    {
      accessorKey: "nationality",
      header: t("nationality"),
      cell: ({ row }) => row.original.nationality || "—",
    },
    {
      id: "passport",
      header: t("passport"),
      cell: ({ row }) => (
        <MaskedSecret
          id={row.original.id}
          masked={row.original.passportNo}
          canReveal={canRevealPii}
          onReveal={() => repo.revealPassport(row.original.id)}
        />
      ),
    },
  ];

  const isFiltered =
    emailFilter !== "all" || nameFilter !== "all" || query.length > 0;

  function resetFilters() {
    setQuery("");
    setEmailFilter("all");
    setNameFilter("all");
  }

  return (
    <ListScreen
      title={t("title")}
      description={t("subtitle")}
      actions={
        canWrite ? (
          <CreateCustomerDialog
            repository={repo}
            onCreated={async () => {
              resetFilters();
              await search.reload();
              feedback.success(t("createdToastTitle"), t("createdToastBody"));
            }}
          />
        ) : undefined
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
          onReset={resetFilters}
          sections={[
            {
              id: "email",
              label: t("filterEmail"),
              value: emailFilter,
              onChange: setEmailFilter,
              options: [
                { value: "all", label: t("filterAll"), count: counts.emailAll },
                {
                  value: "with-email",
                  label: t("filterWithEmail"),
                  count: counts.withEmail,
                },
                {
                  value: "missing-email",
                  label: t("filterMissingEmail"),
                  count: counts.missingEmail,
                },
              ],
            },
            {
              id: "name",
              label: t("filterName"),
              value: nameFilter,
              onChange: setNameFilter,
              options: [
                { value: "all", label: t("filterAll"), count: counts.nameAll },
                {
                  value: "has-ar",
                  label: t("filterHasAr"),
                  count: counts.hasAr,
                },
                {
                  value: "en-only",
                  label: t("filterEnOnly"),
                  count: counts.enOnly,
                },
              ],
            },
          ]}
        />
      }
    >
      <QueryState
        loading={search.loading && !search.data}
        loadingLabel={tc("loading")}
        error={search.error}
        onRetry={() => void search.reload()}
      >
        {filtered.length === 0 ? (
          <EmptyState title={t("empty")} description={t("emptyHint")} />
        ) : (
          <DataTable columns={columns} data={filtered} emptyMessage={t("empty")} />
        )}
      </QueryState>
    </ListScreen>
  );
}
