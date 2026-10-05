"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Activity,
  Ban,
  Boxes,
  CalendarClock,
  CircleCheck,
  LayoutGrid,
  Plus,
  Rows3,
  Scale,
  WalletMinimal,
  type LucideIcon,
} from "lucide-react";
import {
  AvailabilityBadges,
  CATEGORY_LOOK,
  HealthPill,
  PAYMENT_MODELS,
  SUPPLIER_CATEGORIES,
  SupplierCard,
  available,
  isLowBalance,
  supplierName,
  type SupplierListItem,
  type SupplierRepository,
} from "@/entities/supplier";
import { useCan } from "@/entities/viewer";
import { SupplierFormDialog } from "@/features/supplier-form";
import { routes } from "@/shared/config/routes";
import { Link, useRouter } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { formatMoneyWhole } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { DataTable, EmptyState, ListScreen, QueryState, SearchFilterBar, SegmentedControl, TONES, type Tone } from "@/shared/ui";
import { RoutingPanel } from "./routing-panel";

type Quick = "all" | "open" | "closed" | "lowBalance" | "apiIssues" | "expiring" | "disputes";
type ViewMode = "cards" | "table";
const VIEW_KEY = "wcc.suppliers.view";

const QUICK: { key: Quick; icon: LucideIcon; tone: Tone }[] = [
  { key: "all", icon: Boxes, tone: "indigo" },
  { key: "open", icon: CircleCheck, tone: "emerald" },
  { key: "closed", icon: Ban, tone: "rose" },
  { key: "lowBalance", icon: WalletMinimal, tone: "amber" },
  { key: "apiIssues", icon: Activity, tone: "sky" },
  { key: "expiring", icon: CalendarClock, tone: "violet" },
  { key: "disputes", icon: Scale, tone: "teal" },
];

function matches(s: SupplierListItem, q: Quick): boolean {
  switch (q) {
    case "all":
      return true;
    case "open":
      return s.availability.bookable;
    case "closed":
      return !s.availability.bookable;
    case "lowBalance":
      return isLowBalance(s.finance) || s.availability.reason === "deposit_exhausted" || s.availability.reason === "credit_exhausted";
    case "apiIssues":
      return s.integration.type !== "manual" && (s.health.status === "down" || s.health.status === "degraded");
    case "expiring":
      return s.contractDaysLeft !== null && s.contractDaysLeft <= 30;
    case "disputes":
      return s.openDisputes > 0;
  }
}

function searchText(s: SupplierListItem): string {
  return [s.code, s.nameEn, s.nameAr, s.contactName, s.contactEmail, s.integration.apiBaseUrl].join(" ").toLowerCase();
}

function useViewMode(): [ViewMode, (v: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>("cards");
  useEffect(() => {
    try {
      if (window.localStorage.getItem(VIEW_KEY) === "table") setMode("table");
    } catch {
      // storage blocked: keep the default
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

type Props = { repository: SupplierRepository };

export function SuppliersBoard({ repository }: Props) {
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const canWrite = useCan("suppliers.write");
  const list = useApiQuery(() => repository.list(), [repository], { cacheKey: ["suppliers", "all"] });
  const rows = useMemo<SupplierListItem[]>(() => list.data ?? [], [list.data]);
  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState<Quick>("all");
  const [category, setCategory] = useState("all");
  const [payment, setPayment] = useState("all");
  const [creating, setCreating] = useState(false);
  const [view, setView] = useViewMode();

  const scoped = useMemo(
    () => rows.filter((s) => (category === "all" || s.category === category) && (payment === "all" || s.finance.paymentModel === payment)),
    [rows, category, payment],
  );
  const counts = useMemo(() => Object.fromEntries(QUICK.map(({ key }) => [key, scoped.filter((s) => matches(s, key)).length])) as Record<Quick, number>, [scoped]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped.filter((s) => matches(s, quick) && (!q || searchText(s).includes(q)));
  }, [scoped, quick, query]);

  const columns = useMemo<ColumnDef<SupplierListItem>[]>(
    () => [
      {
        id: "supplier",
        header: t("table.supplier"),
        cell: ({ row }) => {
          const s = row.original;
          const look = CATEGORY_LOOK[s.category];
          const Icon = look.icon;
          return (
            <Link href={routes.supplier(s.id)} className="flex items-center gap-3 font-semibold text-zinc-950">
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", TONES[look.tone].soft)} aria-hidden>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-start hover:underline">
                  <bdi>{supplierName(s, locale)}</bdi>
                </span>
                <span className="block font-mono text-[11px] font-medium text-zinc-400" dir="ltr">
                  {s.code}
                </span>
              </span>
            </Link>
          );
        },
      },
      {
        id: "category",
        header: t("table.category"),
        cell: ({ row }) => <span className="text-[13px]">{t(`category.${row.original.category}.short`)}</span>,
      },
      {
        id: "health",
        header: t("table.health"),
        cell: ({ row }) =>
          row.original.integration.type === "manual" ? (
            <span className="text-[12.5px] text-zinc-400">{t("integration.manual.label")}</span>
          ) : (
            <HealthPill status={row.original.health.status} latencyMs={row.original.health.latencyMs} />
          ),
      },
      {
        id: "funds",
        header: t("table.funds"),
        cell: ({ row }) => {
          const f = available(row.original.finance);
          return f.limited ? (
            <span className={cn("font-semibold tabular-nums", f.amount <= 0 && "text-rose-600")}>{formatMoneyWhole(f.amount, locale, row.original.finance.currency)}</span>
          ) : (
            <span className="text-zinc-400">{t("card.unlimited")}</span>
          );
        },
      },
      {
        id: "spend",
        header: t("card.spend30d"),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMoneyWhole(row.original.spend30d, locale, row.original.finance.currency)}
            <span className="text-zinc-400"> · {row.original.bookings30d}</span>
          </span>
        ),
      },
      {
        id: "status",
        header: t("table.status"),
        cell: ({ row }) => <AvailabilityBadges availability={row.original.availability} compact />,
      },
    ],
    [t, locale],
  );

  const isFiltered = quick !== "all" || category !== "all" || payment !== "all" || query.length > 0;
  const resetFilters = () => {
    setQuery("");
    setQuick("all");
    setCategory("all");
    setPayment("all");
  };

  return (
    <ListScreen
      title={t("title")}
      description={t("subtitle")}
      toolbarWidth="full"
      actions={
        canWrite ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-[14px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.8)] transition hover:bg-zinc-800"
            data-testid="supplier-create"
          >
            <Plus className="h-[18px] w-[18px]" aria-hidden />
            {t("newSupplier")}
          </button>
        ) : undefined
      }
      toolbar={
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 2xl:grid-cols-7" role="group" aria-label={t("table.status")}>
            {QUICK.map(({ key, icon: Icon, tone }) => {
              const active = quick === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setQuick(active && key !== "all" ? "all" : key)}
                  className={cn(
                    "flex min-w-0 items-center gap-3 rounded-[24px] border bg-gradient-to-br p-3.5 text-start transition duration-300",
                    TONES[tone].tint,
                    active
                      ? "border-zinc-900/80 shadow-[0_14px_34px_-22px_rgba(15,23,42,0.55)] ring-1 ring-zinc-900/80"
                      : "border-zinc-200/60 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-26px_rgba(15,23,42,0.45)]",
                  )}
                  data-testid={`supplier-quick-${key}`}
                >
                  <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", TONES[tone].solid)}>
                    <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[24px] font-semibold leading-none tabular-nums text-zinc-950">{list.loading && !list.data ? "–" : counts[key]}</span>
                    <span className="mt-1 line-clamp-2 block text-[12.5px] font-medium leading-tight text-zinc-500">{t(`quick.${key}`)}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchFilterBar
              variant="hero"
              className="min-w-0 max-w-3xl flex-1"
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
                  id: "quick",
                  label: t("table.status"),
                  value: quick,
                  defaultValue: "all",
                  onChange: setQuick,
                  options: QUICK.map(({ key }) => ({ value: key, label: t(`quick.${key}`), count: counts[key] })),
                },
                {
                  id: "category",
                  label: t("table.category"),
                  value: category,
                  defaultValue: "all",
                  onChange: setCategory,
                  options: [
                    { value: "all", label: t("allCategories"), count: rows.length },
                    ...SUPPLIER_CATEGORIES.map((c) => ({ value: c, label: t(`category.${c}.short`), count: rows.filter((s) => s.category === c).length })),
                  ],
                },
                {
                  id: "payment",
                  label: t("table.payment"),
                  value: payment,
                  defaultValue: "all",
                  onChange: setPayment,
                  options: [
                    { value: "all", label: t("allPayments"), count: rows.length },
                    ...PAYMENT_MODELS.map((m) => ({ value: m, label: t(`payment.${m}.label`), count: rows.filter((s) => s.finance.paymentModel === m).length })),
                  ],
                },
              ]}
            />
            <SegmentedControl<ViewMode>
              className="sm:ms-auto"
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
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <QueryState
          loadingVariant={view === "table" ? "table" : "cards"}
          loading={list.loading && !list.data}
          loadingLabel={tc("loading")}
          error={list.error}
          onRetry={() => void list.reload()}
        >
          {filtered.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title={isFiltered ? t("emptyFiltered") : t("empty")}
              description={isFiltered ? t("emptyFilteredHint") : t("emptyHint")}
              actionLabel={isFiltered ? tc("resetFilters") : canWrite ? t("newSupplier") : undefined}
              onAction={isFiltered ? resetFilters : canWrite ? () => setCreating(true) : undefined}
            />
          ) : view === "cards" ? (
            <ul className="grid gap-3.5 sm:grid-cols-2 2xl:grid-cols-3" data-testid="supplier-cards">
              {filtered.map((s) => (
                <li key={s.id}>
                  <SupplierCard supplier={s} href={routes.supplier(s.id)} />
                </li>
              ))}
            </ul>
          ) : (
            <DataTable columns={columns} data={filtered} emptyMessage={t("empty")} />
          )}
        </QueryState>
        <aside className="xl:sticky xl:top-4 xl:self-start">
          <RoutingPanel repository={repository} version={list.data} />
        </aside>
      </div>

      <SupplierFormDialog
        repository={repository}
        open={creating}
        onOpenChange={setCreating}
        onSaved={(s) => {
          void list.refresh();
          router.push(routes.supplier(s.id));
        }}
      />
    </ListScreen>
  );
}
