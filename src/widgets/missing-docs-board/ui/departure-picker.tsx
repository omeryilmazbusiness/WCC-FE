"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarRange, Package, PlaneTakeoff } from "lucide-react";
import { daysUntil } from "@/entities/document";
import type { Departure, TourPackage, TourPackageRepository } from "@/entities/tourpackage";
import { cn } from "@/shared/lib/cn";
import { formatDay, formatNumber } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, TONES } from "@/shared/ui";

type Props = {
  repository: TourPackageRepository;
  selectedId: string;
  /** Package of the selected departure, so the picker opens on it. */
  selectedPackageId?: string;
  today: string;
  onSelect: (departureId: string) => void;
};

export function packageName(pkg: Pick<TourPackage, "nameEn" | "nameAr" | "code">, locale: string): string {
  return (locale === "ar" ? pkg.nameAr || pkg.nameEn : pkg.nameEn || pkg.nameAr) || pkg.code;
}

/** Upcoming first (soonest on top); past departures follow, most recent first. */
export function orderDepartures(list: readonly Departure[], today: string): Departure[] {
  const active = list.filter((d) => d.isActive);
  const upcoming = active.filter((d) => (daysUntil(d.departDate, today) ?? 0) >= 0);
  const past = active.filter((d) => (daysUntil(d.departDate, today) ?? 0) < 0);
  upcoming.sort((a, b) => a.departDate.localeCompare(b.departDate));
  past.sort((a, b) => b.departDate.localeCompare(a.departDate));
  return [...upcoming, ...past];
}

/** Package dropdown plus departure chips; replaces typing a departure UUID. */
export function DeparturePicker({ repository, selectedId, selectedPackageId, today, onSelect }: Props) {
  const t = useTranslations("missingDocs.picker");
  const locale = useLocale();
  const packages = useApiQuery(() => repository.listPackages(true), [repository], { cacheKey: ["packages", "active"] });
  const [packageId, setPackageId] = useState(selectedPackageId ?? "");

  useEffect(() => {
    if (selectedPackageId) setPackageId(selectedPackageId);
  }, [selectedPackageId]);
  useEffect(() => {
    if (!packageId && packages.data?.length) setPackageId(packages.data[0].id);
  }, [packageId, packages.data]);

  const departures = useApiQuery(() => repository.listDepartures(packageId), [repository, packageId], {
    enabled: Boolean(packageId),
    cacheKey: ["package-departures", packageId],
  });
  const ordered = useMemo(() => orderDepartures(departures.data ?? [], today), [departures.data, today]);

  return (
    <section
      aria-labelledby="md-picker-title"
      className="rounded-[28px] border border-zinc-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      data-testid="md-departure-picker"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", TONES.sky.gradient)} aria-hidden>
          <PlaneTakeoff className="h-6 w-6" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="md-picker-title" className="text-[16px] font-semibold tracking-tight text-zinc-950">
            {t("title")}
          </h2>
          <p className="text-[12.5px] text-zinc-500">{t("hint")}</p>
        </div>
        <div className="w-full sm:w-72">
          <Select value={packageId} onValueChange={setPackageId} disabled={!packages.data?.length}>
            <SelectTrigger className="h-11 rounded-2xl" aria-label={t("package")} data-testid="md-package">
              <span className="flex min-w-0 items-center gap-2">
                <Package className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                <SelectValue placeholder={packages.loading ? t("loading") : t("package")} />
              </span>
            </SelectTrigger>
            <SelectContent>
              {(packages.data ?? []).map((pkg) => (
                <SelectItem key={pkg.id} value={pkg.id}>
                  {packageName(pkg, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4">
        {packages.error ? (
          <p role="alert" className="text-[13px] font-medium text-rose-700">{t("packagesError")}</p>
        ) : packages.data && packages.data.length === 0 ? (
          <p className="text-[13px] text-zinc-500">{t("noPackages")}</p>
        ) : departures.loading && !departures.data ? (
          <div className="flex gap-2.5" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[74px] w-40 shrink-0 animate-pulse rounded-2xl bg-zinc-100" />
            ))}
          </div>
        ) : departures.error ? (
          <p role="alert" className="text-[13px] font-medium text-rose-700">{t("departuresError")}</p>
        ) : packageId && ordered.length === 0 ? (
          <p className="text-[13px] text-zinc-500">{t("noDepartures")}</p>
        ) : (
          <div
            role="listbox"
            aria-label={t("departures")}
            className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {ordered.map((d) => {
              const days = daysUntil(d.departDate, today);
              const selected = d.id === selectedId;
              return (
                <button
                  key={d.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => onSelect(d.id)}
                  className={cn(
                    "flex w-44 shrink-0 flex-col items-start gap-1 rounded-2xl px-3.5 py-3 text-start transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                    selected
                      ? "bg-zinc-900 text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.6)]"
                      : "bg-zinc-50 text-zinc-900 ring-1 ring-inset ring-zinc-900/[0.05] hover:bg-zinc-100",
                  )}
                  data-testid="md-departure"
                >
                  <span className="flex w-full items-center gap-1.5 text-[14px] font-semibold">
                    <CalendarRange className={cn("h-4 w-4 shrink-0", selected ? "text-white/70" : "text-zinc-400")} aria-hidden />
                    <span className="truncate">{formatDay(d.departDate, locale)}</span>
                  </span>
                  <span className={cn("w-full truncate text-[12px]", selected ? "text-white/70" : "text-zinc-500")}>
                    <bdi dir="ltr">{d.code}</bdi> · {days === null ? "—" : days < 0 ? t("departed") : t("inDays", { days, formatted: formatNumber(days, locale) })}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
