"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { LockOpen } from "lucide-react";
import { APP_ROLES, type AppRole } from "@/shared/config/routes";
import {
  createUser,
  listUsers,
  unlockUser,
  updateUser,
  type ApiUser,
} from "@/entities/identity";
import { useCan } from "@/entities/viewer";
import { useActiveBranchId } from "@/features/branch-scope";
import { RevokeUserSessionsButton } from "@/features/revoke-user-sessions";
import { formatDateTime } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import {
  Badge,
  Button,
  DataTable,
  Input,
  ListScreen,
  QueryState,
  SearchFilterBar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useMutationFeedback,
} from "@/shared/ui";

const EMPTY_FORM = {
  email: "",
  password: "",
  full_name: "",
  role: "employee" as AppRole,
};

function isLocked(user: ApiUser): boolean {
  return Boolean(user.locked_until && Date.parse(user.locked_until) > Date.now());
}

export function UsersAdminView() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const locale = useLocale();
  const branchId = useActiveBranchId();
  const feedback = useMutationFeedback();
  const canWrite = useCan("users.write");
  const canUnlock = useCan("users.unlock");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const users = useApiQuery(
    () =>
      listUsers({
        q: query || undefined,
        role: role === "all" ? undefined : role,
        branchId,
      }),
    [query, role, branchId],
  );
  const rows = useMemo(() => users.data ?? [], [users.data]);
  const reload = users.reload;

  const columns = useMemo<ColumnDef<ApiUser>[]>(() => {
    async function run(id: string, action: () => Promise<unknown>, success: string, failure: string) {
      setBusyId(id);
      try {
        await action();
        feedback.success(success);
        void reload();
      } catch (err) {
        feedback.error(err, failure);
      } finally {
        setBusyId(null);
      }
    }

    return [
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
        cell: ({ row }) => (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {row.original.is_active ? t("active") : t("inactive")}
            {isLocked(row.original) ? (
              <Badge className="rounded-lg bg-amber-50 normal-case text-amber-700" data-testid="user-locked">
                {t("locked")}
              </Badge>
            ) : null}
          </span>
        ),
      },
      {
        id: "actions",
        header: tc("actions"),
        cell: ({ row }) => {
          const target = row.original;
          const busy = busyId === target.id;
          return (
            <div className="flex flex-wrap gap-2">
              {canWrite ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      target.id,
                      () => updateUser(target.id, { is_active: !target.is_active }),
                      t("updated"),
                      t("updateError"),
                    )
                  }
                >
                  {target.is_active ? t("deactivate") : t("activate")}
                </Button>
              ) : null}
              {canUnlock ? (
                <Button
                  type="button"
                  size="sm"
                  variant={isLocked(target) ? "default" : "ghost"}
                  disabled={busy}
                  data-testid="user-unlock"
                  onClick={() =>
                    void run(target.id, () => unlockUser(target.id), t("unlocked"), t("unlockError"))
                  }
                >
                  <LockOpen className="h-3.5 w-3.5" />
                  {t("unlock")}
                </Button>
              ) : null}
              <RevokeUserSessionsButton
                userId={target.id}
                userName={target.full_name}
                disabled={busy}
              />
            </div>
          );
        },
      },
    ];
  }, [t, tc, feedback, reload, busyId, canWrite, canUnlock]);

  return (
    <ListScreen
      title={t("usersTitle")}
      description={t("usersSubtitle")}
      actions={
        canWrite ? (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await createUser({
                  ...form,
                  branch_id: branchId,
                });
                feedback.success(t("created"));
                setForm(EMPTY_FORM);
                void reload();
              } catch (err) {
                feedback.error(err, t("createError"));
              }
            }}
          >
            <Input
              placeholder={t("name")}
              aria-label={t("name")}
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className="h-9 w-36"
              required
            />
            <Input
              type="email"
              placeholder={t("email")}
              aria-label={t("email")}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="h-9 w-44"
              required
            />
            <Input
              type="password"
              placeholder={t("initialPassword")}
              aria-label={t("initialPassword")}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="h-9 w-40"
              minLength={8}
              required
            />
            <Select
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v as AppRole }))}
            >
              <SelectTrigger className="h-9 w-32" aria-label={t("role")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APP_ROLES.map((r) => (
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
        ) : null
      }
      toolbar={
        <SearchFilterBar
          value={query}
          onValueChange={setQuery}
          placeholder={t("searchUsers")}
          clearLabel={tc("clearSearch")}
          filterLabel={tc("filter")}
          resetLabel={tc("resetFilters")}
          isFiltered={role !== "all" || query.length > 0}
          onReset={() => {
            setQuery("");
            setRole("all");
          }}
          sections={[
            {
              id: "role",
              label: t("role"),
              value: role,
              onChange: (v: string) => setRole(v),
              options: [
                { value: "all", label: t("allRoles") },
                ...APP_ROLES.map((r) => ({ value: r, label: r })),
              ],
            },
          ]}
        />
      }
    >
      <QueryState
        loading={users.loading && !users.data}
        error={users.error}
        onRetry={() => void reload()}
        empty={rows.length === 0}
        emptyTitle={t("usersEmpty")}
      >
        <DataTable columns={columns} data={rows} />
      </QueryState>
      <p className="mt-3 text-[11px] text-zinc-400">
        {formatDateTime(new Date(), locale)}
      </p>
    </ListScreen>
  );
}
