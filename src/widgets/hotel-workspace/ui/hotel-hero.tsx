"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Ban, BedDouble, CalendarClock, CalendarRange, Hotel as HotelIcon, PencilLine, Tag, TrendingUp, type LucideIcon } from "lucide-react";
import {
  HotelStars,
  LANDMARK_LOOK,
  SEASON_LOOK,
  fillPct,
  grossCell,
  markupFor,
  releasingSoon,
  seasonFrom,
  seasonOn,
  stopSaleOn,
  type HotelDetail,
} from "@/entities/hotel";
import { cn } from "@/shared/lib/cn";
import { formatDay, formatMoneyWhole } from "@/shared/lib/format";
import { TONES, type Tone } from "@/shared/ui";

type Props = { detail: HotelDetail; canWrite: boolean; onEdit: () => void };

export function HotelHero({ detail, canWrite, onEdit }: Props) {
  const t = useTranslations("hotels");
  const locale = useLocale();
  const { hotel, seasons, allotments, stopSales, today } = detail;
  const season = seasonOn(seasons, today);
  const seasonLook = season ? SEASON_LOOK[season.kind] : null;
  const SeasonIcon = seasonLook?.icon;
  const stop = stopSaleOn(stopSales, today);
  const tone: Tone = !hotel.isActive ? "zinc" : stop ? "rose" : (seasonLook?.tone ?? "sky");
  const fromNet = season ? seasonFrom(season) : 0;
  const fromGross = fromNet ? grossCell(fromNet, markupFor(hotel, season)) : 0;
  const live = allotments.filter((a) => a.status !== "expired");
  const rooms = live.reduce((s, a) => s + a.rooms, 0);
  const sold = live.reduce((s, a) => s + a.sold, 0);
  const fill = fillPct(sold, rooms);
  const nextRelease = live
    .filter((a) => a.kind === "guaranteed" && a.releaseDate >= today && a.available > 0)
    .map((a) => a.releaseDate)
    .sort()[0];
  const soon = releasingSoon(allotments, today).length;
  const landmark = hotel.location.landmark ? LANDMARK_LOOK[hotel.location.landmark] : null;
  const LandmarkIcon = landmark?.icon;
  const primary = locale === "ar" && hotel.nameAr ? hotel.nameAr : hotel.name;
  const secondary = locale === "ar" ? hotel.name : hotel.nameAr;
  const money = (v: number) => (v > 0 ? formatMoneyWhole(v, locale, hotel.currency) : "—");

  const stats: { icon: LucideIcon; tone: Tone; label: string; value: ReactNode; id: string }[] = [
    { icon: Tag, tone: "zinc", label: t("hero.fromNet"), value: money(fromNet), id: "net" },
    { icon: TrendingUp, tone: "emerald", label: t("hero.fromGross"), value: money(fromGross), id: "gross" },
    { icon: BedDouble, tone: fill >= 90 ? "rose" : "indigo", label: t("hero.allotment"), value: rooms ? `${sold}/${rooms}` : "—", id: "rooms" },
    { icon: CalendarRange, tone: "sky", label: t("hero.seasons"), value: seasons.length, id: "seasons" },
    {
      icon: CalendarClock,
      tone: soon ? "amber" : "violet",
      label: t("hero.nextRelease"),
      value: nextRelease ? formatDay(nextRelease, locale) : "—",
      id: "release",
    },
  ];

  return (
    <section className="overflow-hidden rounded-[32px] border border-zinc-200/60 bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)]" data-testid="hotel-hero">
      <div className={cn("relative h-28 bg-gradient-to-br sm:h-32", TONES[tone].tint)}>
        <div className={cn("absolute inset-0 opacity-[0.18]", TONES[tone].gradient)} style={{ maskImage: "radial-gradient(120% 140% at 0% 0%, black, transparent 70%)" }} aria-hidden />
        {canWrite ? (
          <div className="absolute end-4 top-4">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-zinc-950 px-3.5 text-[13px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.8)] transition hover:bg-zinc-800"
              data-testid="hotel-edit"
            >
              <PencilLine className="h-4 w-4" aria-hidden />
              {t("hero.edit")}
            </button>
          </div>
        ) : null}
      </div>

      <div className="relative -mt-12 px-5 pb-5 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <span className={cn("flex h-24 w-24 shrink-0 items-center justify-center rounded-[30px] ring-[5px] ring-white", TONES[tone].gradient)} aria-hidden>
            <HotelIcon className="h-11 w-11" strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {season && seasonLook && SeasonIcon ? (
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold", TONES[seasonLook.tone].soft)}>
                  <SeasonIcon className="h-3.5 w-3.5" aria-hidden />
                  {season.name} · {t(`seasonKind.${season.kind}`)}
                </span>
              ) : (
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11.5px] font-semibold text-zinc-500">{t("card.noSeason")}</span>
              )}
              <span className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-semibold", hotel.isActive ? TONES.emerald.soft : TONES.zinc.soft)}>
                {hotel.isActive ? t("status.active") : t("status.inactive")}
              </span>
              {stop ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11.5px] font-bold text-rose-700" data-testid="hotel-stop-today">
                  <Ban className="h-3.5 w-3.5" aria-hidden />
                  {t("card.stopSale")}
                </span>
              ) : null}
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11.5px] font-bold text-zinc-700">{hotel.currency}</span>
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
              <HotelStars stars={hotel.stars} label={t("card.stars", { n: hotel.stars })} />
              <span>{[hotel.location.district, hotel.location.city, hotel.location.country].filter(Boolean).join(" · ")}</span>
              {landmark && LandmarkIcon && hotel.location.distanceM > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <LandmarkIcon className={cn("h-4 w-4", TONES[landmark.tone].text)} aria-hidden />
                  {t("distanceTo", { m: hotel.location.distanceM, place: t(`landmark.${hotel.location.landmark}`) })}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {stats.map(({ icon: Icon, tone: statTone, label, value, id }) => (
            <div key={id} className={cn("rounded-[22px] bg-gradient-to-br p-3 ring-1 ring-inset ring-zinc-900/[0.04]", TONES[statTone].tint)} data-testid={`hotel-stat-${id}`}>
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", TONES[statTone].solid)} aria-hidden>
                <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
              </span>
              <p className="mt-2 truncate text-[19px] font-semibold leading-none tabular-nums text-zinc-950">{value}</p>
              <p className="mt-1 truncate text-[11.5px] font-medium text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
        {rooms > 0 ? (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100" aria-hidden>
            <span className={cn("block h-full rounded-full", fill >= 90 ? "bg-rose-500" : fill >= 60 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${fill}%` }} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
