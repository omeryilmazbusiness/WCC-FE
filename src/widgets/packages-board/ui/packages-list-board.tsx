"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  TourPackage,
  TourPackageRepository,
} from "@/entities/tourpackage";
import { CreatePackageDialog } from "@/features/create-package";
import { Link } from "@/shared/i18n/navigation";
import { routes } from "@/shared/config/routes";
import {
  Badge,
  DataTable,
  EmptyState,
  ListScreen,
  SearchFilterBar,
  useToast,
} from "@/shared/ui";

type Props = {
  repository: TourPackageRepository;
};

export function PackagesListBoard({ repository }: Props) {
  const t = useTranslations("packages");
  const tc = useTranslations("common");
  const { push } = useToast();
  const [rows, setRows] = useState<TourPackage[]>([]);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    setRows(await repository.listPackages());
    setLoaded(true);
  }

  useEffect(() => {
    void refresh();
  }, [repository]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((p) => {
      if (activeFilter === "active" && !p.isActive) return false;
      if (activeFilter === "inactive" && p.isActive) return false;
      if (!q) return true;
      return (
        p.code.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.nameAr.includes(q)
      );
    });
  }, [rows, query, activeFilter]);

  const columns: ColumnDef<TourPackage>[] = [
    {
      accessorKey: "code",
      header: t("fields.code"),
      cell: ({ row }) => (
        <Link
          href={routes.package(row.original.id)}
          className="font-semibold text-zinc-950 underline-offset-4 hover:underline"
        >
          {row.original.code}
        </Link>
      ),
    },
    { accessorKey: "nameEn", header: t("fields.nameEn") },
    { accessorKey: "nameAr", header: t("fields.nameAr") },
    {
      accessorKey: "isActive",
      header: t("fields.status"),
      cell: ({ row }) => (
        <Badge className={row.original.isActive ? "bg-emerald-50 text-emerald-800" : ""}>
          {row.original.isActive ? t("active") : t("inactive")}
        </Badge>
      ),
    },
  ];

  const isFiltered = query.length > 0 || activeFilter !== "all";

  return (
    <ListScreen
      title={t("title")}
      description={t("subtitle")}
      actions={
        <CreatePackageDialog
          repository={repository}
          onCreated={async () => {
            await refresh();
            push({
              title: t("packageCreatedTitle"),
              description: t("packageCreatedBody"),
              tone: "success",
            });
          }}
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
            setActiveFilter("all");
          }}
          sections={[
            {
              id: "status",
              label: t("fields.status"),
              value: activeFilter,
              onChange: setActiveFilter,
              options: [
                { value: "all", label: t("filterAll"), count: rows.length },
                {
                  value: "active",
                  label: t("active"),
                  count: rows.filter((p) => p.isActive).length,
                },
                {
                  value: "inactive",
                  label: t("inactive"),
                  count: rows.filter((p) => !p.isActive).length,
                },
              ],
            },
          ]}
        />
      }
    >
      {loaded && filtered.length === 0 ? (
        <EmptyState title={t("empty")} description={t("emptyHint")} />
      ) : (
        <DataTable columns={columns} data={filtered} emptyMessage={t("empty")} />
      )}
    </ListScreen>
  );
}
