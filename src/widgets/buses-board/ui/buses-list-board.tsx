"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BusFront, CircleCheck, Pencil, Plus, PowerOff } from "lucide-react";
import { CLASS_LOOK, searchText, type BusCompany, type BusRepository, type VehicleClass } from "@/entities/bus";
import { useCan } from "@/entities/viewer";
import { BusCompanyDialog } from "@/features/bus-form";
import { cn } from "@/shared/lib/cn";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { EmptyState, ListScreen, QueryState, SearchFilterBar, TONES } from "@/shared/ui";

type Quick = "all" | "active" | "inactive";

type Props = { repository: BusRepository };

export function BusesListBoard({ repository }: Props) {
  const t = useTranslations("buses");
  const tc = useTranslations("common");
  const canWrite = useCan("buses.write");
  const query = useApiQuery(() => repository.list(), [repository], { cacheKey: ["buses", "all"] });
  const rows = useMemo<BusCompany[]>(() => query.data ?? [], [query.data]);
  const [q, setQ] = useState("");
  const [quick, setQuick] = useState<Quick>("all");
  const [city, setCity] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BusCompany | null>(null);

  const cities = useMemo(() => [...new Set(rows.map((c) => c.city).filter(Boolean))].sort(), [rows]);
  const counts = useMemo(
    () => ({
      all: rows.length,
      active: rows.filter((c) => c.isActive).length,
      inactive: rows.filter((c) => !c.isActive).length,
    }),
    [rows],
  );
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((c) => {
      if (city !== "all" && c.city !== city) return false;
      if (quick === "active" && !c.isActive) return false;
      if (quick === "inactive" && c.isActive) return false;
      return !needle || searchText(c).includes(needle);
    });
  }, [rows, q, quick, city]);

  const isFiltered = quick !== "all" || city !== "all" || q.length > 0;
  const reset = () => {
    setQ("");
    setQuick("all");
    setCity("all");
  };
  const startCreate = () => {
    setEditing(null);
    setOpen(true);
  };
  const startEdit = (c: BusCompany) => {
    setEditing(c);
    setOpen(true);
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
            onClick={startCreate}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-[14px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.8)] transition hover:bg-zinc-800"
            data-testid="bus-create"
          >
            <Plus className="h-[18px] w-[18px]" aria-hidden />
            {t("newCompany")}
          </button>
        ) : undefined
      }
      toolbar={
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2.5" role="group" aria-label={t("table.status")}>
            {(
              [
                { key: "all" as const, icon: BusFront, tone: "amber" as const },
                { key: "active" as const, icon: CircleCheck, tone: "emerald" as const },
                { key: "inactive" as const, icon: PowerOff, tone: "zinc" as const },
              ] as const
            ).map(({ key, icon: Icon, tone }) => {
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
                  data-testid={`bus-quick-${key}`}
                >
                  <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", TONES[tone].solid)}>
                    <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[24px] font-semibold leading-none tabular-nums text-zinc-950">
                      {query.loading && !query.data ? "–" : counts[key]}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[12.5px] font-medium leading-tight text-zinc-500">
                      {t(`quick.${key}`)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <SearchFilterBar
            variant="hero"
            className="min-w-0 max-w-3xl"
            value={q}
            onValueChange={setQ}
            placeholder={t("searchPlaceholder")}
            clearLabel={tc("clearSearch")}
            filterLabel={tc("filter")}
            resetLabel={tc("resetFilters")}
            isFiltered={isFiltered}
            onReset={reset}
            sections={[
              {
                id: "quick",
                label: t("table.status"),
                value: quick,
                defaultValue: "all",
                onChange: setQuick,
                options: (["all", "active", "inactive"] as const).map((key) => ({
                  value: key,
                  label: t(`quick.${key}`),
                  count: counts[key],
                })),
              },
              {
                id: "city",
                label: t("table.city"),
                value: city,
                defaultValue: "all",
                onChange: setCity,
                options: [
                  { value: "all", label: t("allCities"), count: rows.length },
                  ...cities.map((c) => ({ value: c, label: c, count: rows.filter((r) => r.city === c).length })),
                ],
              },
            ]}
          />
        </div>
      }
    >
      <QueryState
        loadingVariant="cards"
        loading={query.loading && !query.data}
        loadingLabel={tc("loading")}
        error={query.error}
        onRetry={() => void query.reload()}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={BusFront}
            title={isFiltered ? t("emptyFiltered") : t("empty")}
            description={isFiltered ? t("emptyFilteredHint") : t("emptyHint")}
            actionLabel={isFiltered ? tc("resetFilters") : canWrite ? t("newCompany") : undefined}
            onAction={isFiltered ? reset : canWrite ? startCreate : undefined}
          />
        ) : (
          <ul className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3" data-testid="bus-cards">
            {filtered.map((c) => (
              <li key={c.id}>
                <BusCard company={c} onEdit={canWrite ? () => startEdit(c) : undefined} />
              </li>
            ))}
          </ul>
        )}
      </QueryState>

      <BusCompanyDialog
        repository={repository}
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
        company={editing}
        onSaved={() => void query.refresh()}
      />
    </ListScreen>
  );
}

function BusCard({ company: c, onEdit }: { company: BusCompany; onEdit?: () => void }) {
  const t = useTranslations("buses");
  const look = CLASS_LOOK[c.vehicleClass as VehicleClass] ?? CLASS_LOOK.standard;
  const Icon = look.icon;
  return (
    <article
      className="flex h-full flex-col gap-4 rounded-[28px] border border-zinc-200/70 bg-white p-5 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)]"
      data-testid={`bus-card-${c.id}`}
    >
      <div className="flex items-start gap-3">
        <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl", TONES[look.tone].solid)} aria-hidden>
          <Icon className="h-7 w-7" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[16px] font-semibold text-zinc-950">{c.name}</h2>
          <p className="mt-0.5 truncate text-[13px] text-zinc-500">
            {[c.city, c.country].filter(Boolean).join(", ") || t("noCity")}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            c.isActive ? TONES.emerald.soft : TONES.zinc.soft,
          )}
        >
          {c.isActive ? t("quick.active") : t("quick.inactive")}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
        <div className="col-span-2">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{t("fields.class")}</dt>
          <dd className="font-medium text-zinc-800">{t(`classes.${c.vehicleClass}`)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{t("fields.phone")}</dt>
          <dd className="truncate font-medium text-zinc-800">{c.phone || "—"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{t("fields.contactName")}</dt>
          <dd className="truncate font-medium text-zinc-800">{c.contactName || "—"}</dd>
        </div>
      </dl>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-zinc-200 text-[13px] font-semibold text-zinc-800 transition hover:bg-zinc-50"
          data-testid={`bus-edit-${c.id}`}
        >
          <Pencil className="h-4 w-4" aria-hidden />
          {t("edit")}
        </button>
      ) : null}
    </article>
  );
}
