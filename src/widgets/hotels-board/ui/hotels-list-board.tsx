"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Ban,
  CalendarClock,
  CircleCheck,
  FileWarning,
  Gauge,
  Hotel as HotelIcon,
  LayoutGrid,
  Plus,
  Rows3,
  type LucideIcon,
} from "lucide-react";
import {
  HotelCard,
  HotelStars,
  SEASON_LOOK,
  daysBetween,
  fillPct,
  type HotelListItem,
  type HotelRepository,
} from "@/entities/hotel";
import { useCan } from "@/entities/viewer";
import { HotelFormDialog } from "@/features/hotel-form";
import { routes } from "@/shared/config/routes";
import { Link, useRouter } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { localDay } from "@/shared/lib/day";
import { formatDay, formatMoneyWhole } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { DataTable, EmptyState, ListScreen, QueryState, SearchFilterBar, SegmentedControl, TONES, type Tone } from "@/shared/ui";

type Quick = "all" | "active" | "stopSale" | "releasing" | "lowStock" | "noContract";
type ViewMode = "cards" | "table";
const VIEW_KEY = "wcc.hotels.view";
const RELEASE_WINDOW_DAYS = 7;
const LOW_STOCK_PCT = 80;

const QUICK: { key: Quick; icon: LucideIcon; tone: Tone }[] = [
  { key: "all", icon: HotelIcon, tone: "indigo" },
  { key: "active", icon: CircleCheck, tone: "emerald" },
  { key: "stopSale", icon: Ban, tone: "rose" },
  { key: "releasing", icon: CalendarClock, tone: "violet" },
  { key: "lowStock", icon: Gauge, tone: "amber" },
  { key: "noContract", icon: FileWarning, tone: "sky" },
];

function matches(h: HotelListItem, q: Quick, today: string): boolean {
  const s = h.summary;
  switch (q) {
    case "all":
      return true;
    case "active":
      return h.isActive;
    case "stopSale":
      return s.stopSaleToday;
    case "releasing":
      return Boolean(s.nextRelease && daysBetween(today, s.nextRelease) <= RELEASE_WINDOW_DAYS);
    case "lowStock":
      return s.roomsTotal > 0 && fillPct(s.roomsSold, s.roomsTotal) >= LOW_STOCK_PCT;
    case "noContract":
      return s.contractFiles === 0;
  }
}

function searchText(h: HotelListItem): string {
  return [h.name, h.nameAr, h.location.city, h.location.district, h.contact.salesName, h.contact.reservationsEmail].join(" ").toLowerCase();
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

type Props = { repository: HotelRepository };

export function HotelsListBoard({ repository }: Props) {
  const t = useTranslations("hotels");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const canWrite = useCan("hotels.write");
  const hotels = useApiQuery(() => repository.list(), [repository], { cacheKey: ["hotels", "all"] });
  const rows = useMemo<HotelListItem[]>(() => hotels.data ?? [], [hotels.data]);
  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState<Quick>("all");
  const [city, setCity] = useState("all");
  const [creating, setCreating] = useState(false);
  const [view, setView] = useViewMode();
  const today = localDay();

  const cities = useMemo(() => [...new Set(rows.map((h) => h.location.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, locale)), [rows, locale]);
  const inCity = useMemo(() => rows.filter((h) => city === "all" || h.location.city === city), [rows, city]);
  const counts = useMemo(
    () => Object.fromEntries(QUICK.map(({ key }) => [key, inCity.filter((h) => matches(h, key, today)).length])) as Record<Quick, number>,
    [inCity, today],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inCity.filter((h) => matches(h, quick, today) && (!q || searchText(h).includes(q)));
  }, [inCity, quick, query, today]);

  const columns = useMemo<ColumnDef<HotelListItem>[]>(
    () => [
      {
        id: "hotel",
        header: t("table.hotel"),
        cell: ({ row }) => {
          const h = row.original;
          return (
            <Link href={routes.hotel(h.id)} className="flex items-center gap-3 font-semibold text-zinc-950">
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", TONES.sky.soft)} aria-hidden>
                <HotelIcon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-start hover:underline">
                  <bdi>{locale === "ar" && h.nameAr ? h.nameAr : h.name}</bdi>
                </span>
                <HotelStars stars={h.stars} />
              </span>
            </Link>
          );
        },
      },
      {
        id: "city",
        header: t("table.city"),
        cell: ({ row }) => (
          <span className="text-[13px]">
            {row.original.location.city}
            {row.original.location.distanceM > 0 ? <span className="text-zinc-400"> · {t("distance", { m: row.original.location.distanceM })}</span> : null}
          </span>
        ),
      },
      {
        id: "season",
        header: t("table.season"),
        cell: ({ row }) => {
          const s = row.original.summary;
          if (!s.seasonKind) return <span className="text-zinc-400">—</span>;
          const look = SEASON_LOOK[s.seasonKind];
          return <span className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-semibold", TONES[look.tone].soft)}>{s.seasonName || t(`seasonKind.${s.seasonKind}`)}</span>;
        },
      },
      {
        id: "from",
        header: t("card.fromNet"),
        cell: ({ row }) =>
          row.original.summary.fromNet > 0 ? (
            <span className="font-semibold tabular-nums">{formatMoneyWhole(row.original.summary.fromNet, locale, row.original.currency)}</span>
          ) : (
            <span className="text-zinc-400">—</span>
          ),
      },
      {
        id: "allotment",
        header: t("table.allotment"),
        cell: ({ row }) => {
          const s = row.original.summary;
          return s.roomsTotal > 0 ? (
            <span className="tabular-nums">{t("card.allotment", { sold: s.roomsSold, total: s.roomsTotal })}</span>
          ) : (
            <span className="text-zinc-400">—</span>
          );
        },
      },
      {
        id: "release",
        header: t("table.release"),
        cell: ({ row }) => (row.original.summary.nextRelease ? formatDay(row.original.summary.nextRelease, locale) : <span className="text-zinc-400">—</span>),
      },
      {
        id: "status",
        header: t("table.status"),
        cell: ({ row }) => {
          const h = row.original;
          const key = !h.isActive ? "inactive" : h.summary.stopSaleToday ? "stopSale" : "active";
          const tone: Tone = key === "active" ? "emerald" : key === "stopSale" ? "rose" : "zinc";
          return <span className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-semibold", TONES[tone].soft)}>{t(`status.${key}`)}</span>;
        },
      },
    ],
    [t, locale],
  );

  const isFiltered = quick !== "all" || city !== "all" || query.length > 0;
  const resetFilters = () => {
    setQuery("");
    setQuick("all");
    setCity("all");
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
            data-testid="hotel-create"
          >
            <Plus className="h-[18px] w-[18px]" aria-hidden />
            {t("newHotel")}
          </button>
        ) : undefined
      }
      toolbar={
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6" role="group" aria-label={t("table.status")}>
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
                  data-testid={`hotel-quick-${key}`}
                >
                  <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", TONES[tone].solid)}>
                    <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[24px] font-semibold leading-none tabular-nums text-zinc-950">
                      {hotels.loading && !hotels.data ? "–" : counts[key]}
                    </span>
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
                  id: "city",
                  label: t("table.city"),
                  value: city,
                  defaultValue: "all",
                  onChange: setCity,
                  options: [
                    { value: "all", label: t("allCities"), count: rows.length },
                    ...cities.map((c) => ({ value: c, label: c, count: rows.filter((h) => h.location.city === c).length })),
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
      <QueryState
        loadingVariant={view === "table" ? "table" : "cards"}
        loading={hotels.loading && !hotels.data}
        loadingLabel={tc("loading")}
        error={hotels.error}
        onRetry={() => void hotels.reload()}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={HotelIcon}
            title={isFiltered ? t("emptyFiltered") : t("empty")}
            description={isFiltered ? t("emptyFilteredHint") : t("emptyHint")}
            actionLabel={isFiltered ? tc("resetFilters") : canWrite ? t("newHotel") : undefined}
            onAction={isFiltered ? resetFilters : canWrite ? () => setCreating(true) : undefined}
          />
        ) : view === "cards" ? (
          <ul className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3" data-testid="hotel-cards">
            {filtered.map((h) => (
              <li key={h.id}>
                <HotelCard hotel={h} href={routes.hotel(h.id)} />
              </li>
            ))}
          </ul>
        ) : (
          <DataTable columns={columns} data={filtered} emptyMessage={t("empty")} />
        )}
      </QueryState>

      <HotelFormDialog
        repository={repository}
        open={creating}
        onOpenChange={setCreating}
        onSaved={(hotel) => {
          void hotels.refresh();
          router.push(routes.hotel(hotel.id));
        }}
      />
    </ListScreen>
  );
}
