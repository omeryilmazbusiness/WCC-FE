"use client";

import { useLocale, useTranslations } from "next-intl";
import { BedDouble, CalendarClock, ChevronRight, Plane, Star, Users } from "lucide-react";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { formatDay, formatMoneyWhole } from "@/shared/lib/format";
import { ProgressRing, TONES } from "@/shared/ui";
import { packageFillPct, packageRemaining, type TourPackage } from "../model";
import { readinessChecks, readinessPct } from "../spec";
import { CATEGORY_LOOK, KIND_LOOK, TRANSPORT_LOOK, lookOf } from "./look";

function Stars({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400" aria-label={`${n}★`}>
      {Array.from({ length: n }, (_, i) => (
        <Star key={i} className="h-3 w-3 fill-current" strokeWidth={0} aria-hidden />
      ))}
    </span>
  );
}

/** Colourful product card: type, from-price, stay split, hotels, quota fill and next departure. */
export function PackageCard({ pkg, href }: { pkg: TourPackage; href: string }) {
  const t = useTranslations("packages");
  const locale = useLocale();
  const cat = lookOf(CATEGORY_LOOK, pkg.category);
  const kind = lookOf(KIND_LOOK, pkg.kind);
  const transport = lookOf(TRANSPORT_LOOK, pkg.transportMode);
  const CatIcon = cat.icon;
  const KindIcon = kind.icon;
  const TransportIcon = transport.icon;
  const s = pkg.spec;
  const fill = packageFillPct(pkg);
  const total = pkg.capacityTotal > 0 ? pkg.capacityTotal : pkg.stats.departureSeats;
  const ready = readinessPct(readinessChecks(pkg, pkg.stats.fromPrice > 0));
  const name = locale === "ar" && pkg.nameAr ? pkg.nameAr : pkg.nameEn;
  const status = !pkg.isActive ? "inactive" : pkg.salesOpen ? "salesOpen" : "salesClosed";
  const statusTone = status === "salesOpen" ? "emerald" : status === "salesClosed" ? "amber" : "zinc";

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-zinc-200/60 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-30px_rgba(15,23,42,0.55)]"
      data-testid={`package-card-${pkg.code}`}
    >
      <div className={cn("relative bg-gradient-to-br p-4 pb-5", TONES[cat.tone].tint)}>
        <div className="flex items-start gap-3.5">
          <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]", TONES[cat.tone].gradient)} aria-hidden>
            <CatIcon className="h-7 w-7" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", TONES[kind.tone].soft)}>
                <KindIcon className="h-3 w-3" aria-hidden />
                {t(`kind.${pkg.kind}`)}
              </span>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", TONES[statusTone].soft)}>{t(`card.${status}`)}</span>
            </div>
            <h3 className="mt-1.5 line-clamp-2 text-start text-[16px] font-semibold leading-snug tracking-tight text-zinc-950">
              <bdi>{name}</bdi>
            </h3>
            <p className="mt-0.5 truncate text-[12px] font-medium text-zinc-500">
              <span dir="ltr" className="font-semibold tracking-wide text-zinc-700">
                {pkg.code}
              </span>
              {" · "}
              {t(`category.${pkg.category}`)}
            </p>
          </div>
          <ProgressRing
            value={ready}
            size={44}
            thickness={5}
            tone={ready === 100 ? "emerald" : "sky"}
            aria-label={t("card.ready", { pct: ready })}
            label={<span className="text-[10.5px] font-bold tabular-nums text-zinc-700">{ready}</span>}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 pt-3.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{t("card.from")}</p>
            {pkg.stats.fromPrice > 0 ? (
              <p className="text-[22px] font-bold leading-tight tabular-nums tracking-tight text-zinc-950">
                {formatMoneyWhole(pkg.stats.fromPrice, locale, pkg.stats.fromCurrency || pkg.baseCurrency)}
                <span className="ms-1 text-[11.5px] font-medium text-zinc-400">{t("card.perPerson")}</span>
              </p>
            ) : (
              <p className="text-[14px] font-semibold text-zinc-400">{t("card.noPrice")}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 text-[11.5px] font-semibold text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5 text-sky-500" aria-hidden />
              {t("card.days", { n: pkg.durationDays })}
            </span>
            <span className="inline-flex items-center gap-1">
              <TransportIcon className="h-3.5 w-3.5 text-violet-500" aria-hidden />
              {t(`transport.${pkg.transportMode}`)}
            </span>
          </div>
        </div>

        {s.nights.makkah + s.nights.madinah > 0 ? (
          <div className="flex gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-700">
              {t("city.makkah")} · {s.nights.makkah}
            </span>
            {s.nights.madinah > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[11.5px] font-semibold text-sky-700">
                {t("city.madinah")} · {s.nights.madinah}
              </span>
            ) : null}
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-[11.5px] font-semibold text-zinc-600">
              {t("card.nights", { n: s.nights.makkah + s.nights.madinah })}
            </span>
          </div>
        ) : null}

        {s.makkah.name || s.madinah.name ? (
          <ul className="space-y-1.5">
            {(["makkah", "madinah"] as const).map((city) =>
              s[city].name ? (
                <li key={city} className="flex items-center gap-2 text-[12.5px]">
                  <BedDouble className={cn("h-4 w-4 shrink-0", city === "makkah" ? "text-emerald-500" : "text-sky-500")} aria-hidden />
                  <span className="min-w-0 truncate font-medium text-zinc-700">
                    <bdi>{s[city].name}</bdi>
                  </span>
                  <Stars n={s[city].stars} />
                  {s[city].distanceM > 0 ? <span className="ms-auto shrink-0 text-[11px] font-semibold tabular-nums text-zinc-400">{s[city].distanceM} {t("form.hotels.meters")}</span> : null}
                </li>
              ) : null,
            )}
          </ul>
        ) : null}

        {s.flights.airline ? (
          <p className="flex items-center gap-2 text-[12.5px] font-medium text-zinc-600">
            <Plane className="h-4 w-4 text-sky-500" aria-hidden />
            <span className="truncate">{s.flights.airline}</span>
            {s.flights.outbound.route ? (
              <span dir="ltr" className="ms-auto shrink-0 text-[11px] font-semibold text-zinc-400">
                {s.flights.outbound.route}
              </span>
            ) : null}
          </p>
        ) : null}

        <div className="mt-auto space-y-2 border-t border-zinc-100 pt-3">
          <div className="flex items-center justify-between text-[11.5px] font-semibold">
            <span className="inline-flex items-center gap-1 text-zinc-500">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {total > 0 ? t("card.quota", { reserved: pkg.stats.reserved, total }) : t("card.noQuota")}
            </span>
            {total > 0 ? <span className={fill >= 90 ? "text-rose-600" : "text-emerald-600"}>{t("card.remaining", { n: packageRemaining(pkg) })}</span> : null}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100" aria-hidden>
            <span
              className={cn("block h-full rounded-full transition-all", fill >= 90 ? "bg-rose-500" : fill >= 60 ? "bg-amber-500" : "bg-emerald-500")}
              style={{ width: `${fill}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-zinc-500">
              {pkg.stats.nextDepartDate ? (
                <>
                  {t("card.nextDeparture")} · <span className="font-semibold text-zinc-800">{formatDay(pkg.stats.nextDepartDate, locale)}</span>
                </>
              ) : (
                t("card.noDeparture")
              )}
            </span>
            <span className="inline-flex items-center gap-0.5 font-semibold text-zinc-900">
              {t("card.open")}
              <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
