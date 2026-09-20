"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import type { AppRole } from "@/shared/config/routes";
import {
  createUser,
  listUsers,
  updateUser,
  type ApiUser,
} from "@/entities/identity/api";
import { getScopedBranchId } from "@/features/branch-scope";
import { useSessionUser } from "@/shared/api/session-context";
import { formatDateTime } from "@/shared/lib/format";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  ListScreen,
  SearchFilterBar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@/shared/ui";

const ROLES: AppRole[] = [
  "gm",
  "manager",
  "employee",
  "finance",
  "operations",
  "admin",
];

export function UsersAdminView() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const locale = useLocale();
  const user = useSessionUser();
  const { push } = useToast();
  const [rows, setRows] = useState<ApiUser[]>([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "ChangeMe123!",
    full_name: "",
    role: "employee" as AppRole,
  });

  async function refresh(q = query, roleFilter = role) {
    try {
      setError(null);
      const items = await listUsers({
        q: q || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        branchId: getScopedBranchId(user.branchId),
      });
      setRows(items);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo<ColumnDef<ApiUser>[]>(
    () => [
      { accessorKey: "full_name", header: t("name") },
      { accessorKey: "email", header: t("email") },
      {
        accessorKey: "role",
        header: t("role"),
        cell: ({ row }) => (
          <Badge className="rounded-lg capitalize">{row.original.role}</Badge>
        ),
      },
      {
        accessorKey: "is_active",
        header: t("status"),
        cell: ({ row }) =>
          row.original.is_active ? t("active") : t("inactive"),
      },
      {
        id: "actions",
        header: tc("actions"),
        cell: ({ row }) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={async () => {
              await updateUser(row.original.id, {
                is_active: !row.original.is_active,
              });
              push({ title: t("updated"), tone: "success" });
              void refresh();
            }}
          >
            {row.original.is_active ? t("deactivate") : t("activate")}
          </Button>
        ),
      },
    ],
    [t, tc, push],
  );

  return (
    <ListScreen
      title={t("usersTitle")}
      description={t("usersSubtitle")}
      actions={
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await createUser({
                ...form,
                branch_id: getScopedBranchId(user.branchId),
              });
              push({ title: t("created"), tone: "success" });
              setForm({
                email: "",
                password: "ChangeMe123!",
                full_name: "",
                role: "employee",
              });
              void refresh();
            } catch {
              push({ title: t("createError"), tone: "error" });
            }
          }}
        >
          <Input
            placeholder={t("name")}
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            className="h-9 w-36"
            required
          />
          <Input
            type="email"
            placeholder={t("email")}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="h-9 w-44"
            required
          />
          <Select
            value={form.role}
            onValueChange={(v) => setForm((f) => ({ ...f, role: v as AppRole }))}
          >
            <SelectTrigger className="h-9 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm">
            {t("createUser")}
          </Button>
        </form>
      }
      toolbar={
        <SearchFilterBar
          value={query}
          onValueChange={(v) => {
            setQuery(v);
            void refresh(v, role);
          }}
          placeholder={t("searchUsers")}
          clearLabel={tc("clearSearch")}
          filterLabel={tc("filter")}
          resetLabel={tc("resetFilters")}
          isFiltered={role !== "all" || query.length > 0}
          onReset={() => {
            setQuery("");
            setRole("all");
            void refresh("", "all");
          }}
          sections={[
            {
              id: "role",
              label: t("role"),
              value: role,
              onChange: (v: string) => {
                setRole(v);
                void refresh(query, v);
              },
              options: [
                { value: "all", label: t("allRoles") },
                ...ROLES.map((r) => ({ value: r, label: r })),
              ],
            },
          ]}
        />
      }
    >
      {error ? (
        <ErrorState title={error} retryLabel={tc("retry")} onRetry={() => void refresh()} />
      ) : !loaded ? null : rows.length === 0 ? (
        <EmptyState title={t("usersEmpty")} />
      ) : (
        <DataTable columns={columns} data={rows} />
      )}
      <p className="mt-3 text-[11px] text-zinc-400">
        {formatDateTime(new Date(), locale)}
      </p>
    </ListScreen>
  );
}
