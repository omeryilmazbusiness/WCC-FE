"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Check, Loader2, Moon, PackagePlus, Search, Users, X } from "lucide-react";
import { KIND_LOOK, lookOf, totalNights, type Departure, type TourPackage } from "@/entities/tourpackage";
import { cn } from "@/shared/lib/cn";
import { formatDay, formatMoneyWhole } from "@/shared/lib/format";
import { Button, IconInput, TONES } from "@/shared/ui";
import {
  NO_PACKAGE,
  departureSeatsLeft,
  isBookable,
  packageName,
  reconcileDeparture,
  samePick,
  searchPackages,
  todayLocal,
  upcomingDepartures,
  type PackagePick,
} from "../model/pick";
import { usePackageCatalog, usePackageDepartures } from "../model/use-package-catalog";

type Props = {
  value: PackagePick;
  onChange: (next: PackagePick) => void;
  /** Also choose one of the package's departures. */
  withDeparture?: boolean;
  /** A departure must be chosen (bookings); the soonest bookable one is preselected. */
  requireDeparture?: boolean;
  /** Hides the clear button, e.g. when a package is mandatory. */
  required?: boolean;
  disabled?: boolean;
  label?: string;
  hint?: string;
  testId?: string;
};

/** Search-and-pick a catalogue package (and optionally a departure) inline, without portals. */
export function PackagePicker({
  value,
  onChange,
  withDeparture = false,
  requireDeparture = false,
  required = false,
  disabled = false,
  label,
  hint,
  testId = "package-picker",
}: Props) {
  const t = useTranslations("packageLink");
  const locale = useLocale();
  const { packages, byId, loading } = usePackageCatalog();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const listId = useId();
  const selected = value.packageId ? byId.get(value.packageId) ?? null : null;
  const showDepartures = (withDeparture || requireDeparture) && Boolean(value.packageId);
  const { departures, loading: depsLoading } = usePackageDepartures(showDepartures ? value.packageId : null);
  const today = todayLocal();

  const results = useMemo(() => searchPackages(packages, q, { keepId: value.packageId }), [packages, q, value.packageId]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    if (!showDepartures || depsLoading) return;
    const next = reconcileDeparture(value, departures, today, requireDeparture);
    if (!samePick(next, value)) onChangeRef.current(next);
  }, [showDepartures, depsLoading, departures, value, today, requireDeparture]);

  function choose(p: TourPackage) {
    onChange({ packageId: p.id, departureId: p.id === value.packageId ? value.departureId : null });
    setOpen(false);
    setQ("");
  }

  const pickedMissing = Boolean(value.packageId) && !selected && !loading;

  return (
    <div className="space-y-2.5" data-testid={testId}>
      {label ? (
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[13px] font-semibold text-zinc-700">{label}</p>
          {hint ? <p className="text-[11.5px] text-zinc-400">{hint}</p> : null}
        </div>
      ) : null}

      {selected && !open ? (
        <SelectedPackage
          pkg={selected}
          locale={locale}
          onChange={disabled ? undefined : () => setOpen(true)}
          onClear={disabled || required ? undefined : () => onChange(NO_PACKAGE)}
          testId={testId}
        />
      ) : !open ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          data-testid={`${testId}-open`}
          className="group flex w-full items-center gap-3 rounded-[20px] border border-dashed border-zinc-300 bg-white/70 px-3.5 py-3 text-start transition-colors hover:border-amber-400 hover:bg-amber-50/40 disabled:opacity-60"
        >
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", TONES.amber.soft)} aria-hidden>
            {loading && value.packageId ? <Loader2 className="h-5 w-5 animate-spin" /> : <PackagePlus className="h-5 w-5" strokeWidth={2.1} />}
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-semibold text-zinc-900">
              {pickedMissing ? t("missing") : t("empty")}
            </span>
            <span className="block text-[12px] text-zinc-500">{t("emptyHint")}</span>
          </span>
        </button>
      ) : null}

      {open ? (
        <div className="space-y-2 rounded-[22px] bg-white p-2.5 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.5)] ring-1 ring-zinc-200/80">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
            <IconInput
              icon={Search}
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (results[0]) choose(results[0]);
                }
              }}
              placeholder={t("search")}
              aria-controls={listId}
              aria-label={t("search")}
              className="h-11"
              data-testid={`${testId}-search`}
            />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t("close")}
            </Button>
          </div>
          <div id={listId} role="listbox" aria-label={label ?? t("empty")} className="max-h-72 space-y-1 overflow-y-auto p-0.5">
            {loading && packages.length === 0 ? (
              <p className="flex items-center gap-2 px-3 py-4 text-[12.5px] text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t("loading")}
              </p>
            ) : results.length === 0 ? (
              <p className="px-3 py-4 text-[12.5px] text-zinc-500" data-testid={`${testId}-none`}>
                {q ? t("noMatches") : t("noPackages")}
              </p>
            ) : (
              results.map((p) => (
                <PackageOption
                  key={p.id}
                  pkg={p}
                  locale={locale}
                  active={p.id === value.packageId}
                  onSelect={() => choose(p)}
                  testId={`${testId}-option-${p.code}`}
                />
              ))
            )}
          </div>
        </div>
      ) : null}

      {showDepartures && !open ? (
        <DepartureChips
          departures={upcomingDepartures(departures, today)}
          loading={depsLoading}
          value={value.departureId}
          allowAny={!requireDeparture}
          locale={locale}
          disabled={disabled}
          onChange={(departureId) => onChange({ packageId: value.packageId, departureId })}
          testId={testId}
        />
      ) : null}
    </div>
  );
}

function PackageMeta({ pkg, locale }: { pkg: TourPackage; locale: string }) {
  const t = useTranslations("packageLink");
  const nights = totalNights(pkg.spec);
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11.5px] font-medium text-zinc-500">
      {nights > 0 ? (
        <span className="inline-flex items-center gap-1">
          <Moon className="h-3 w-3" aria-hidden /> {t("nights", { n: nights })}
        </span>
      ) : null}
      {pkg.stats.nextDepartDate ? (
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3 w-3" aria-hidden /> {formatDay(pkg.stats.nextDepartDate, locale)}
        </span>
      ) : null}
      {pkg.stats.fromPrice > 0 ? (
        <span className="font-semibold text-zinc-700">
          {t("from", { price: formatMoneyWhole(pkg.stats.fromPrice, locale, pkg.stats.fromCurrency) })}
        </span>
      ) : null}
      {!pkg.isActive ? <span className="text-rose-600">{t("inactive")}</span> : !pkg.salesOpen ? <span className="text-amber-600">{t("salesClosed")}</span> : null}
    </span>
  );
}

function SelectedPackage({
  pkg,
  locale,
  onChange,
  onClear,
  testId,
}: {
  pkg: TourPackage;
  locale: string;
  onChange?: () => void;
  onClear?: () => void;
  testId: string;
}) {
  const t = useTranslations("packageLink");
  const look = lookOf(KIND_LOOK, pkg.kind);
  const Icon = look.icon;
  return (
    <div
      className={cn("flex items-center gap-3 rounded-[20px] bg-gradient-to-br px-3.5 py-3 ring-1 ring-zinc-200/70", TONES[look.tone].tint)}
      data-testid={`${testId}-selected`}
      data-package-code={pkg.code}
    >
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", TONES[look.tone].gradient)} aria-hidden>
        <Icon className="h-5 w-5" strokeWidth={2.1} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 font-mono text-[12px] font-bold tracking-wide text-zinc-900" dir="ltr">
            {pkg.code}
          </span>
          <span className="truncate text-[13.5px] font-semibold text-zinc-800">{packageName(pkg, locale)}</span>
        </span>
        <PackageMeta pkg={pkg} locale={locale} />
      </span>
      {onChange ? (
        <Button type="button" size="sm" variant="outline" onClick={onChange} data-testid={`${testId}-change`}>
          {t("change")}
        </Button>
      ) : null}
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={t("clear")}
          data-testid={`${testId}-clear`}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white hover:text-rose-600"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

function PackageOption({
  pkg,
  locale,
  active,
  onSelect,
  testId,
}: {
  pkg: TourPackage;
  locale: string;
  active: boolean;
  onSelect: () => void;
  testId: string;
}) {
  const look = lookOf(KIND_LOOK, pkg.kind);
  const Icon = look.icon;
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      data-testid={testId}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-start transition-colors",
        active ? "bg-zinc-950/[0.04] ring-1 ring-zinc-900/15" : "hover:bg-zinc-50",
      )}
    >
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TONES[look.tone].soft)} aria-hidden>
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 font-mono text-[11.5px] font-bold tracking-wide text-zinc-900" dir="ltr">
            {pkg.code}
          </span>
          <span className="truncate text-[13px] font-semibold text-zinc-800">{packageName(pkg, locale)}</span>
        </span>
        <PackageMeta pkg={pkg} locale={locale} />
      </span>
      {active ? <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden /> : null}
    </button>
  );
}

function DepartureChips({
  departures,
  loading,
  value,
  allowAny,
  locale,
  disabled,
  onChange,
  testId,
}: {
  departures: Departure[];
  loading: boolean;
  value: string | null;
  allowAny: boolean;
  locale: string;
  disabled: boolean;
  onChange: (departureId: string | null) => void;
  testId: string;
}) {
  const t = useTranslations("packageLink");
  const chip = (active: boolean, muted = false) =>
    cn(
      "inline-flex shrink-0 flex-col items-start gap-0.5 rounded-2xl px-3 py-2 text-start transition-all disabled:cursor-not-allowed",
      active
        ? "bg-zinc-950 text-white shadow-[0_10px_22px_-14px_rgba(15,23,42,0.9)]"
        : cn("bg-white text-zinc-700 ring-1 ring-zinc-200/80 hover:ring-zinc-300", muted && "opacity-60"),
    );
  return (
    <div className="space-y-1.5">
      <p className="text-[12px] font-semibold text-zinc-600">{t("departure")}</p>
      {loading ? (
        <p className="flex items-center gap-2 text-[12px] text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> {t("loading")}
        </p>
      ) : departures.length === 0 ? (
        <p className="rounded-2xl bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-700" data-testid={`${testId}-no-departures`}>
          {t("noDepartures")}
        </p>
      ) : (
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="radiogroup" aria-label={t("departure")}>
          {allowAny ? (
            <button
              type="button"
              role="radio"
              aria-checked={value === null}
              disabled={disabled}
              onClick={() => onChange(null)}
              className={chip(value === null)}
              data-testid={`${testId}-departure-any`}
            >
              <span className="text-[12.5px] font-semibold">{t("anyDeparture")}</span>
              <span className={cn("text-[11px]", value === null ? "text-white/70" : "text-zinc-400")}>{t("anyDepartureHint")}</span>
            </button>
          ) : null}
          {departures.map((d) => {
            const active = d.id === value;
            const bookable = isBookable(d);
            const seats = departureSeatsLeft(d);
            return (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => onChange(d.id)}
                className={chip(active, !bookable)}
                data-testid={`${testId}-departure-${d.code}`}
              >
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  {formatDay(d.departDate, locale)}
                </span>
                <span className={cn("flex items-center gap-1 text-[11px]", active ? "text-white/70" : "text-zinc-400")}>
                  <span dir="ltr" className="font-mono">
                    {d.code}
                  </span>
                  ·
                  <Users className="h-3 w-3" aria-hidden />
                  {d.salesClosed ? t("salesClosed") : seats > 0 ? t("seatsLeft", { n: seats }) : t("full")}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
