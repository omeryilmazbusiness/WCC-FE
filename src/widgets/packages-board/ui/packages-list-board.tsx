"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarClock, Landmark, LayoutGrid, Moon, Package, PackagePlus, Rows3, ShoppingBag, type LucideIcon } from "lucide-react";
import {
  CATEGORY_LOOK,
  PackageCard,
  addDays,
  lookOf,
  packageRemaining,
  type TourPackage,
  type TourPackageRepository,
} from "@/entities/tourpackage";
import { useCan } from "@/entities/viewer";
import { PackageFormDialog } from "@/features/package-form";
import { routes } from "@/shared/config/routes";
import { Link, useRouter } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { localDay } from "@/shared/lib/day";
import { formatDay, formatMoneyWhole } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { DataTable, EmptyState, ListScreen, QueryState, SearchFilterBar, SegmentedControl, TONES, type Tone } from "@/shared/ui";

type Quick = "all" | "umrah" | "hajj" | "open" | "soon";
type ViewMode = "cards" | "table";
const VIEW_KEY = "wcc.packages.view";
const SOON_DAYS = 30;

const QUICK: { key: Quick; icon: LucideIcon; tone: Tone }[] = [
  { key: "all", icon: Package, tone: "indigo" },
  { key: "umrah", icon: Moon, tone: "emerald" },
  { key: "hajj", icon: Landmark, tone: "amber" },
  { key: "open", icon: ShoppingBag, tone: "sky" },
  { key: "soon", icon: CalendarClock, tone: "rose" },
];

function matches(p: TourPackage, q: Quick, today: string, soon: string): boolean {
  switch (q) {
    case "all":
      return true;
    case "umrah":
    case "hajj":
      return p.kind === q;
    case "open":
      return p.isActive && p.salesOpen;
    case "soon":
      return Boolean(p.stats.nextDepartDate && p.stats.nextDepartDate >= today && p.stats.nextDepartDate <= soon);
  }
}

function searchText(p: TourPackage): string {
  const s = p.spec;
  return [p.code, p.nameEn, p.nameAr, s.makkah.name, s.madinah.name, s.flights.airline, s.guidance.leaderName].join(" ").toLowerCase();
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

type Props = { repository: TourPackageRepository };

export function PackagesListBoard({ repository }: Props) {
  const t = useTranslations("packages");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const canWrite = useCan("packages.write");
  const packages = useApiQuery(() => repository.listPackages(false), [repository], { cacheKey: ["packages", "all"] });
  const rows = useMemo<TourPackage[]>(() => packages.data ?? [], [packages.data]);
  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState<Quick>("all");
  const [creating, setCreating] = useState(false);
  const [view, setView] = useViewMode();
  const today = localDay();
  const soon = addDays(today, SOON_DAYS);

  const counts = useMemo(
    () => Object.fromEntries(QUICK.map(({ key }) => [key, rows.filter((p) => matches(p, key, today, soon)).length])) as Record<Quick, number>,
    [rows, today, soon],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((p) => matches(p, quick, today, soon) && (!q || searchText(p).includes(q)));
  }, [rows, quick, query, today, soon]);
  const takenCodes = useMemo(() => rows.map((p) => p.code), [rows]);

  const columns = useMemo<ColumnDef<TourPackage>[]>(
    () => [
      {
        accessorKey: "code",
        header: t("fields.code"),
        cell: ({ row }) => {
          const look = lookOf(CATEGORY_LOOK, row.original.category);
          const Icon = look.icon;
          return (
            <Link href={routes.package(row.original.id)} className="flex items-center gap-3 font-semibold text-zinc-950">
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", TONES[look.tone].soft)} aria-hidden>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-start hover:underline">
                  <bdi>{locale === "ar" && row.original.nameAr ? row.original.nameAr : row.original.nameEn}</bdi>
                </span>
                <span dir="ltr" className="block truncate text-start text-[11.5px] font-semibold tracking-wide text-zinc-400">
                  {row.original.code}
                </span>
              </span>
            </Link>
          );
        },
      },
      {
        id: "category",
        header: t("form.identity.category"),
        cell: ({ row }) => (
          <span className="text-[13px]">
            {t(`kind.${row.original.kind}`)} · {t(`category.${row.original.category}`)}
          </span>
        ),
      },
      {
        id: "duration",
        header: t("form.identity.duration"),
        cell: ({ row }) => {
          const n = row.original.spec.nights;
          return (
            <span className="text-[13px] tabular-nums">
              {t("card.days", { n: row.original.durationDays })}
              {n.makkah + n.madinah > 0 ? <span className="text-zinc-400"> · {t("card.split", { makkah: n.makkah, madinah: n.madinah })}</span> : null}
            </span>
          );
        },
      },
      {
        id: "from",
        header: t("detail.stats.from"),
        cell: ({ row }) =>
          row.original.stats.fromPrice > 0 ? (
            <span className="font-semibold tabular-nums">{formatMoneyWhole(row.original.stats.fromPrice, locale, row.original.stats.fromCurrency || row.original.baseCurrency)}</span>
          ) : (
            <span className="text-zinc-400">—</span>
          ),
      },
      {
        id: "quota",
        header: t("detail.stats.remaining"),
        cell: ({ row }) => <span className="tabular-nums">{packageRemaining(row.original)}</span>,
      },
      {
        id: "next",
        header: t("card.nextDeparture"),
        cell: ({ row }) => (row.original.stats.nextDepartDate ? formatDay(row.original.stats.nextDepartDate, locale) : <span className="text-zinc-400">—</span>),
      },
      {
        id: "status",
        header: t("fields.status"),
        cell: ({ row }) => {
          const p = row.original;
          const status = !p.isActive ? "inactive" : p.salesOpen ? "salesOpen" : "salesClosed";
          const tone: Tone = status === "salesOpen" ? "emerald" : status === "salesClosed" ? "amber" : "zinc";
          return <span className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-semibold", TONES[tone].soft)}>{t(`card.${status}`)}</span>;
        },
      },
    ],
    [t, locale],
  );

  const isFiltered = quick !== "all" || query.length > 0;
  const resetFilters = () => {
    setQuery("");
    setQuick("all");
  };

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
            data-testid="package-create"
          >
            <PackagePlus className="h-[18px] w-[18px]" aria-hidden />
            {t("newPackage")}
          </button>
        ) : undefined
      }
      toolbar={
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5" role="group" aria-label={t("fields.status")}>
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
                  data-testid={`package-quick-${key}`}
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
              sections={[
                {
                  id: "quick",
                  label: t("fields.status"),
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
        loading={packages.loading && !packages.data}
        loadingLabel={tc("loading")}
        error={packages.error}
        onRetry={() => void packages.reload()}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={isFiltered ? t("emptyFiltered") : t("empty")}
            description={isFiltered ? t("emptyFilteredHint") : t("emptyHint")}
            actionLabel={isFiltered ? tc("resetFilters") : canWrite ? t("newPackage") : undefined}
            onAction={isFiltered ? resetFilters : canWrite ? () => setCreating(true) : undefined}
          />
        ) : view === "cards" ? (
          <ul className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3" data-testid="package-cards">
            {filtered.map((p) => (
              <li key={p.id}>
                <PackageCard pkg={p} href={routes.package(p.id)} />
              </li>
            ))}
          </ul>
        ) : (
          <DataTable columns={columns} data={filtered} emptyMessage={t("empty")} />
        )}
      </QueryState>

      <PackageFormDialog
        repository={repository}
        takenCodes={takenCodes}
        open={creating}
        onOpenChange={setCreating}
        onSaved={(pkg) => {
          void packages.refresh();
          router.push(routes.package(pkg.id));
        }}
      />
    </ListScreen>
  );
}
