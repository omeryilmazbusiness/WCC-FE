"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { BookUser, CalendarPlus, LayoutGrid, Rows3, UserRoundPlus, UsersRound, UserRoundSearch, type LucideIcon } from "lucide-react";
import {
  CustomerAvatar,
  CustomerCard,
  PASSPORT_LOOK,
  createCustomerRepository,
  matchesQuickFilter,
  passportStatus,
  quickFilterCounts,
  type Customer,
  type CustomerQuickFilter,
} from "@/entities/customer";
import { useCan } from "@/entities/viewer";
import { CustomerFormDialog } from "@/features/customer-form";
import { routes } from "@/shared/config/routes";
import { Link, useRouter } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { localDay } from "@/shared/lib/day";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import {
  DataTable,
  EmptyState,
  ListScreen,
  MaskedSecret,
  QueryState,
  SearchFilterBar,
  SegmentedControl,
  TONES,
  type Tone,
  useMutationFeedback,
} from "@/shared/ui";

const repo = createCustomerRepository();

/** The search endpoint returns at most this many rows. */
const PAGE_LIMIT = 50;
const VIEW_KEY = "wcc.customers.view";

type ViewMode = "cards" | "table";

const QUICK: { key: CustomerQuickFilter; icon: LucideIcon; tone: Tone }[] = [
  { key: "all", icon: UsersRound, tone: "sky" },
  { key: "passport", icon: BookUser, tone: "amber" },
  { key: "incomplete", icon: UserRoundSearch, tone: "violet" },
  { key: "recent", icon: CalendarPlus, tone: "emerald" },
];

function useViewMode(): [ViewMode, (v: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>("cards");
  useEffect(() => {
    try {
      if (window.localStorage.getItem(VIEW_KEY) === "table") setMode("table");
    } catch {
      // storage blocked (private mode): keep the default
    }
  }, []);
  const set = (v: ViewMode) => {
    setMode(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      // not persisted; the choice still applies to this visit
    }
  };
  return [mode, set];
}

export function CustomersListView() {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const tp = useTranslations("customers.passportStatus");
  const feedback = useMutationFeedback();
  const router = useRouter();
  const canWrite = useCan("customers.write");
  const canRevealPii = useCan("pii.read");
  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState<CustomerQuickFilter>("all");
  const [creating, setCreating] = useState(false);
  const [view, setView] = useViewMode();
  const term = useDebouncedValue(query.trim(), 250);
  const today = localDay();

  const search = useApiQuery(() => repo.search(term), [term], { cacheKey: ["customers", term], liveTopics: ["customer"] });
  const rows = useMemo(() => (search.data ?? []).filter((r) => r.isActive !== false), [search.data]);
  const counts = useMemo(() => quickFilterCounts(rows, today), [rows, today]);
  const filtered = useMemo(() => rows.filter((r) => matchesQuickFilter(r, quick, today)), [rows, quick, today]);
  const truncated = (search.data?.length ?? 0) >= PAGE_LIMIT;

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: t("name"),
        cell: ({ row }) => (
          <Link href={routes.customer(row.original.id)} className="flex items-center gap-3 font-semibold text-zinc-950">
            <CustomerAvatar id={row.original.id} name={row.original.fullName} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-start hover:underline">
                <bdi>{row.original.fullName}</bdi>
              </span>
              {row.original.fullNameAr ? (
                <span lang="ar" className="block truncate text-start text-[12px] font-medium text-zinc-500">
                  <bdi dir="rtl">{row.original.fullNameAr}</bdi>
                </span>
              ) : null}
            </span>
          </Link>
        ),
      },
      { accessorKey: "phone", header: t("phone"), cell: ({ row }) => <span dir="ltr">{row.original.phone}</span> },
      { accessorKey: "email", header: t("email"), cell: ({ row }) => row.original.email || "—" },
      { accessorKey: "nationality", header: t("nationality"), cell: ({ row }) => row.original.nationality || "—" },
      {
        id: "passport",
        header: t("passport"),
        cell: ({ row }) => {
          const status = passportStatus(row.original, today);
          const look = PASSPORT_LOOK[status];
          const Icon = look.icon;
          return (
            <div className="flex items-center gap-2">
              <span title={tp(status)} className={cn("inline-flex h-6 w-6 items-center justify-center rounded-lg", TONES[look.tone].soft)}>
                <Icon className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">{tp(status)}</span>
              </span>
              <MaskedSecret
                id={row.original.id}
                masked={row.original.passportNo}
                canReveal={canRevealPii}
                onReveal={() => repo.revealPassport(row.original.id)}
              />
            </div>
          );
        },
      },
    ],
    [t, tp, today, canRevealPii],
  );

  const isFiltered = quick !== "all" || query.length > 0;

  function resetFilters() {
    setQuery("");
    setQuick("all");
  }

  return (
    <ListScreen
      title={t("title")}
      description={t("subtitle")}
      actions={
        canWrite ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-[14px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.8)] transition hover:bg-zinc-800"
            data-testid="customer-create"
          >
            <UserRoundPlus className="h-[18px] w-[18px]" aria-hidden />
            {t("create")}
          </button>
        ) : undefined
      }
      toolbar={
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4" role="group" aria-label={t("quick.label")}>
            {QUICK.map(({ key, icon: Icon, tone }) => {
              const active = quick === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setQuick(active && key !== "all" ? "all" : key)}
                  className={cn(
                    "flex items-center gap-3 rounded-[24px] border bg-gradient-to-br p-3.5 text-start transition duration-300",
                    TONES[tone].tint,
                    active
                      ? "border-zinc-900/80 shadow-[0_14px_34px_-22px_rgba(15,23,42,0.55)] ring-1 ring-zinc-900/80"
                      : "border-zinc-200/60 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-26px_rgba(15,23,42,0.45)]",
                  )}
                  data-testid={`customer-quick-${key}`}
                >
                  <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", TONES[tone].solid)}>
                    <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[24px] font-semibold leading-none tabular-nums text-zinc-950">{counts[key]}</span>
                    <span className="mt-1 block truncate text-[12.5px] font-medium text-zinc-500">{t(`quick.${key}`)}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchFilterBar
              variant="hero"
              className="min-w-0 flex-1"
              value={query}
              onValueChange={setQuery}
              placeholder={t("searchPlaceholder")}
              clearLabel={tc("clearSearch")}
              filterLabel={tc("filter")}
              resetLabel={tc("resetFilters")}
              isFiltered={isFiltered}
              onReset={resetFilters}
              loading={search.loading && Boolean(search.data)}
              sections={[
                {
                  id: "quick",
                  label: t("quick.label"),
                  value: quick,
                  defaultValue: "all",
                  onChange: setQuick,
                  options: QUICK.map(({ key }) => ({ value: key, label: t(`quick.${key}`), count: counts[key] })),
                },
              ]}
            />
            <SegmentedControl<ViewMode>
              value={view}
              onChange={setView}
              aria-label={t("view.label")}
              options={[
                { value: "cards", label: t("view.cards"), icon: LayoutGrid },
                { value: "table", label: t("view.table"), icon: Rows3 },
              ]}
            />
          </div>
        </div>
      }
    >
      <QueryState
        loadingVariant={view === "table" ? "table" : "cards"}
        loading={search.loading && !search.data}
        loadingLabel={tc("loading")}
        error={search.error}
        onRetry={() => void search.reload()}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title={isFiltered ? t("emptyFiltered") : t("empty")}
            description={isFiltered ? t("emptyFilteredHint") : t("emptyHint")}
            actionLabel={isFiltered ? tc("resetFilters") : canWrite ? t("create") : undefined}
            onAction={isFiltered ? resetFilters : canWrite ? () => setCreating(true) : undefined}
          />
        ) : view === "cards" ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="customer-cards">
            {filtered.map((c) => (
              <li key={c.id}>
                <CustomerCard customer={c} href={routes.customer(c.id)} today={today} />
              </li>
            ))}
          </ul>
        ) : (
          <DataTable columns={columns} data={filtered} emptyMessage={t("empty")} />
        )}
        {truncated && filtered.length > 0 ? (
          <p className="mt-4 text-center text-[12.5px] font-medium text-zinc-400">{t("truncated", { count: PAGE_LIMIT })}</p>
        ) : null}
      </QueryState>

      <CustomerFormDialog
        repository={repo}
        open={creating}
        onOpenChange={setCreating}
        onSaved={({ customer, duplicates }) => {
          void search.refresh();
          if (duplicates > 0) feedback.success(t("duplicateWarnTitle"), t("duplicateWarnBody", { count: duplicates }));
          else feedback.success(t("createdToastTitle"), t("createdToastBody"));
          router.push(routes.customer(customer.id));
        }}
      />
    </ListScreen>
  );
}
