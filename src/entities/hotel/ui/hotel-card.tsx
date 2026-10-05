"use client";

import { useLocale, useTranslations } from "next-intl";
import { Ban, CalendarClock, ChevronRight, FileCheck2, FileWarning, Hotel as HotelIcon } from "lucide-react";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { formatDay, formatMoneyWhole } from "@/shared/lib/format";
import { TONES } from "@/shared/ui";
import { fillPct } from "../lib/pricing";
import type { HotelListItem } from "../model";
import { HotelStars } from "./hotel-stars";
import { LANDMARK_LOOK, MEAL_LOOK, SEASON_LOOK } from "./look";

/** Contract card: identity, location, current season and from-rate, allotment fill and contract state. */
export function HotelCard({ hotel, href }: { hotel: HotelListItem; href: string }) {
  const t = useTranslations("hotels");
  const locale = useLocale();
  const s = hotel.summary;
  const season = s.seasonKind ? SEASON_LOOK[s.seasonKind] : null;
  const SeasonIcon = season?.icon;
  const landmark = hotel.location.landmark ? LANDMARK_LOOK[hotel.location.landmark] : null;
  const LandmarkIcon = landmark?.icon;
  const fill = fillPct(s.roomsSold, s.roomsTotal);
  const name = locale === "ar" && hotel.nameAr ? hotel.nameAr : hotel.name;
  const tone = !hotel.isActive ? "zinc" : s.stopSaleToday ? "rose" : (season?.tone ?? "sky");

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-zinc-200/60 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-30px_rgba(15,23,42,0.55)]"
      data-testid={`hotel-card-${hotel.id}`}
    >
      <div className={cn("relative bg-gradient-to-br p-4 pb-5", TONES[tone].tint)}>
        <div className="flex items-start gap-3.5">
          <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]", TONES[tone].gradient)} aria-hidden>
            <HotelIcon className="h-7 w-7" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {season && SeasonIcon ? (
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", TONES[season.tone].soft)}>
                  <SeasonIcon className="h-3 w-3" aria-hidden />
                  {s.seasonName || t(`seasonKind.${s.seasonKind}`)}
                </span>
              ) : (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500">{t("card.noSeason")}</span>
              )}
              {!hotel.isActive ? (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500">{t("card.inactive")}</span>
              ) : null}
              {s.stopSaleToday ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                  <Ban className="h-3 w-3" aria-hidden />
                  {t("card.stopSale")}
                </span>
              ) : null}
            </div>
            <h3 className="mt-1.5 line-clamp-2 text-start text-[16px] font-semibold leading-snug tracking-tight text-zinc-950">
              <bdi>{name}</bdi>
            </h3>
            <div className="mt-0.5 flex items-center gap-2">
              <HotelStars stars={hotel.stars} label={t("card.stars", { n: hotel.stars })} />
              <span className="truncate text-[12px] font-medium text-zinc-500">
                {[hotel.location.district, hotel.location.city].filter(Boolean).join(" · ")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 pt-3.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{t("card.fromNet")}</p>
            {s.fromNet > 0 ? (
              <p className="text-[22px] font-bold leading-tight tabular-nums tracking-tight text-zinc-950">
                {formatMoneyWhole(s.fromNet, locale, hotel.currency)}
                <span className="ms-1 text-[11.5px] font-medium text-zinc-400">{t("card.perPerson")}</span>
              </p>
            ) : (
              <p className="text-[14px] font-semibold text-zinc-400">{t("card.noRate")}</p>
            )}
          </div>
          {landmark && LandmarkIcon && hotel.location.distanceM > 0 ? (
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold", TONES[landmark.tone].soft)}>
              <LandmarkIcon className="h-3.5 w-3.5" aria-hidden />
              <span className="tabular-nums">{t("distance", { m: hotel.location.distanceM })}</span>
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {hotel.mealPlans.map((m) => {
            const look = MEAL_LOOK[m];
            const Icon = look.icon;
            return (
              <span key={m} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", TONES[look.tone].soft)}>
                <Icon className="h-3 w-3" aria-hidden />
                {t(`meal.${m}.short`)}
              </span>
            );
          })}
          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
            {t("card.roomTypes", { n: hotel.roomTypes.length })}
          </span>
        </div>

        <div className="mt-auto space-y-2 border-t border-zinc-100 pt-3">
          <div className="flex items-center justify-between text-[11.5px] font-semibold">
            <span className="text-zinc-500">
              {s.roomsTotal > 0 ? t("card.allotment", { sold: s.roomsSold, total: s.roomsTotal }) : t("card.noAllotment")}
            </span>
            {s.roomsTotal > 0 ? (
              <span className={fill >= 90 ? "text-rose-600" : "text-emerald-600"}>{t("card.left", { n: Math.max(0, s.roomsTotal - s.roomsSold) })}</span>
            ) : null}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100" aria-hidden>
            <span
              className={cn("block h-full rounded-full transition-all", fill >= 90 ? "bg-rose-500" : fill >= 60 ? "bg-amber-500" : "bg-emerald-500")}
              style={{ width: `${fill}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-zinc-500">
              {s.contractFiles > 0 ? (
                <FileCheck2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
              ) : (
                <FileWarning className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
              )}
              <span className="truncate">{s.contractFiles > 0 ? t("card.contract") : t("card.noContract")}</span>
              {s.nextRelease ? (
                <>
                  <CalendarClock className="ms-1 h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden />
                  <span className="truncate">{t("card.release", { date: formatDay(s.nextRelease, locale) })}</span>
                </>
              ) : null}
            </span>
            <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-zinc-900">
              {t("card.open")}
              <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
