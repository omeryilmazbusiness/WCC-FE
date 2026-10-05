"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, PencilLine, Plane, Ticket, Users, UserCheck, Armchair, type LucideIcon } from "lucide-react";
import {
  CATEGORY_LOOK,
  KIND_LOOK,
  TRANSPORT_LOOK,
  lookOf,
  packageFillPct,
  packageRemaining,
  readinessPct,
  type ReadinessCheck,
  type TourPackage,
} from "@/entities/tourpackage";
import { cn } from "@/shared/lib/cn";
import { formatDay, formatMoneyWhole } from "@/shared/lib/format";
import { ProgressRing, TONES, type Tone } from "@/shared/ui";

type Props = {
  pkg: TourPackage;
  checks: Record<ReadinessCheck, boolean>;
  canWrite: boolean;
  onEdit: () => void;
  actions?: ReactNode;
};

export function PackageHero({ pkg, checks, canWrite, onEdit, actions }: Props) {
  const t = useTranslations("packages");
  const locale = useLocale();
  const cat = lookOf(CATEGORY_LOOK, pkg.category);
  const kind = lookOf(KIND_LOOK, pkg.kind);
  const transport = lookOf(TRANSPORT_LOOK, pkg.transportMode);
  const CatIcon = cat.icon;
  const KindIcon = kind.icon;
  const TransportIcon = transport.icon;
  const ready = readinessPct(checks);
  const fill = packageFillPct(pkg);
  const total = pkg.capacityTotal > 0 ? pkg.capacityTotal : pkg.stats.departureSeats;
  const nights = pkg.spec.nights.makkah + pkg.spec.nights.madinah;
  const status = !pkg.isActive ? "inactive" : pkg.salesOpen ? "salesOpen" : "salesClosed";
  const statusTone: Tone = status === "salesOpen" ? "emerald" : status === "salesClosed" ? "amber" : "zinc";
  const primary = locale === "ar" && pkg.nameAr ? pkg.nameAr : pkg.nameEn;
  const secondary = locale === "ar" ? pkg.nameEn : pkg.nameAr;

  const stats: { icon: LucideIcon; tone: Tone; label: string; value: ReactNode; testId: string }[] = [
    {
      icon: Ticket,
      tone: "emerald",
      label: t("detail.stats.from"),
      value: pkg.stats.fromPrice > 0 ? formatMoneyWhole(pkg.stats.fromPrice, locale, pkg.stats.fromCurrency || pkg.baseCurrency) : "—",
      testId: "package-stat-from",
    },
    { icon: Users, tone: "indigo", label: t("detail.stats.quota"), value: total || "—", testId: "package-stat-quota" },
    { icon: UserCheck, tone: "violet", label: t("detail.stats.reserved"), value: pkg.stats.reserved, testId: "package-stat-reserved" },
    { icon: Armchair, tone: fill >= 90 ? "rose" : "sky", label: t("detail.stats.remaining"), value: total ? packageRemaining(pkg) : "—", testId: "package-stat-remaining" },
    { icon: CalendarClock, tone: "amber", label: t("detail.stats.departures"), value: pkg.stats.departures, testId: "package-stat-departures" },
  ];

  return (
    <section className="overflow-hidden rounded-[32px] border border-zinc-200/60 bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)]" data-testid="package-hero">
      <div className={cn("relative h-28 bg-gradient-to-br sm:h-32", TONES[cat.tone].tint)}>
        <div
          className={cn("absolute inset-0 opacity-[0.18]", TONES[cat.tone].gradient)}
          style={{ maskImage: "radial-gradient(120% 140% at 0% 0%, black, transparent 70%)" }}
          aria-hidden
        />
        <div className="absolute end-4 top-4 flex flex-wrap items-center justify-end gap-2">
          {actions}
          {canWrite ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-zinc-950 px-3.5 text-[13px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.8)] transition hover:bg-zinc-800"
              data-testid="package-edit"
            >
              <PencilLine className="h-4 w-4" aria-hidden />
              {t("detail.edit")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative -mt-12 px-5 pb-5 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <span className={cn("flex h-24 w-24 shrink-0 items-center justify-center rounded-[30px] ring-[5px] ring-white", TONES[cat.tone].gradient)} aria-hidden>
            <CatIcon className="h-11 w-11" strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold", TONES[kind.tone].soft)}>
                <KindIcon className="h-3.5 w-3.5" aria-hidden />
                {t(`kind.${pkg.kind}`)} · {t(`category.${pkg.category}`)}
              </span>
              <span className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-semibold", TONES[statusTone].soft)}>{t(`card.${status}`)}</span>
              <span dir="ltr" className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11.5px] font-bold tracking-wide text-zinc-700">
                {pkg.code}
              </span>
            </div>
            <h1 className="mt-2 text-start text-[24px] font-semibold leading-tight tracking-tight text-zinc-950 sm:text-[28px]">
              <bdi>{primary}</bdi>
            </h1>
            {secondary ? (
              <p className="mt-0.5 text-start text-[14px] font-medium text-zinc-500">
                <bdi>{secondary}</bdi>
              </p>
            ) : null}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] font-semibold text-zinc-600">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4 text-sky-500" aria-hidden />
                {t("card.days", { n: pkg.durationDays })}
                {nights > 0 ? <span className="text-zinc-400">· {t("card.split", { makkah: pkg.spec.nights.makkah, madinah: pkg.spec.nights.madinah })}</span> : null}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <TransportIcon className="h-4 w-4 text-violet-500" aria-hidden />
                {t(`transport.${pkg.transportMode}`)}
              </span>
              {pkg.spec.flights.airline ? (
                <span className="inline-flex items-center gap-1.5">
                  <Plane className="h-4 w-4 text-sky-500" aria-hidden />
                  {pkg.spec.flights.airline}
                </span>
              ) : null}
              {pkg.stats.nextDepartDate ? (
                <span className="inline-flex items-center gap-1.5">
                  {t("card.nextDeparture")} · <span className="text-zinc-900">{formatDay(pkg.stats.nextDepartDate, locale)}</span>
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-[22px] bg-zinc-50 p-3 ring-1 ring-inset ring-zinc-900/[0.04]" data-testid="package-readiness">
            <ProgressRing
              value={ready}
              size={56}
              thickness={6}
              tone={ready === 100 ? "emerald" : "sky"}
              aria-label={t("card.ready", { pct: ready })}
              label={<span className="text-[13px] font-bold tabular-nums text-zinc-800">{ready}%</span>}
            />
            <span className="text-[12px] font-semibold leading-tight text-zinc-600">{t("readiness.title")}</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {stats.map(({ icon: Icon, tone, label, value, testId }) => (
            <div key={testId} className={cn("rounded-[22px] bg-gradient-to-br p-3", TONES[tone].tint, "ring-1 ring-inset ring-zinc-900/[0.04]")} data-testid={testId}>
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", TONES[tone].solid)} aria-hidden>
                <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
              </span>
              <p className="mt-2 truncate text-[19px] font-semibold leading-none tabular-nums text-zinc-950">{value}</p>
              <p className="mt-1 truncate text-[11.5px] font-medium text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
        {total > 0 ? (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100" aria-hidden>
            <span className={cn("block h-full rounded-full", fill >= 90 ? "bg-rose-500" : fill >= 60 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${fill}%` }} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
