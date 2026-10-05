"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, FileSignature, Link2, Link2Off, Search } from "lucide-react";
import {
  HotelStars,
  MEAL_PLANS,
  ROOM_TYPES,
  createHotelRepository,
  type HotelListItem,
  type HotelRepository,
  type MealPlan,
  type Quote,
} from "@/entities/hotel";
import { BOARD_TYPES, stayNights } from "@/entities/tourpackage";
import { useCan } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Input } from "@/shared/ui";
import type { PackageFormValues } from "../model/form";

type City = "makkah" | "madinah";

const defaultRepository = createHotelRepository();
const MAX_PACKAGE_DISTANCE = 50_000;
const CITY_HINTS: Record<City, RegExp> = { makkah: /mak|mec|مكة/i, madinah: /mad|med|المدينة/i };
const BOARD_FROM_MEAL: Partial<Record<MealPlan, (typeof BOARD_TYPES)[number]>> = { bb: "bb", hb: "hb", fb: "fb", ai: "fb" };
const MEAL_FROM_BOARD: Record<string, MealPlan> = { bb: "bb", hb: "hb", fb: "fb", tabldot: "fb", buffet: "fb" };

/** Links the stay to a contracted hotel: fills the profile and shows the live per-person contract rate. */
export function ContractedHotelPicker({ city, repository = defaultRepository }: { city: City; repository?: HotelRepository }) {
  const t = useTranslations("packages.form.hotels.contract");
  const th = useTranslations("hotels");
  const locale = useLocale();
  const canRead = useCan("hotels.read");
  const { control, setValue } = useFormContext<PackageFormValues>();
  const stay = useWatch({ control, name: `spec.${city}` });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const list = useApiQuery(() => repository.list({ activeOnly: true }), [repository], { enabled: canRead, cacheKey: ["hotels", "active"] });
  const linked = useMemo(() => list.data?.find((h) => h.id === stay.hotelId) ?? null, [list.data, stay.hotelId]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = (list.data ?? []).filter((h) => !q || `${h.name} ${h.nameAr} ${h.location.city}`.toLowerCase().includes(q));
    return [...rows].sort((a, b) => Number(CITY_HINTS[city].test(b.location.city)) - Number(CITY_HINTS[city].test(a.location.city)));
  }, [list.data, query, city]);

  const quote = useStayQuote(repository, linked, stay.checkIn, stay.checkOut, stay.board);

  if (!canRead) return null;

  const pick = (h: HotelListItem) => {
    const p = `spec.${city}` as const;
    const opts = { shouldDirty: true, shouldValidate: true } as const;
    setValue(`${p}.hotelId`, h.id, opts);
    setValue(`${p}.name`, h.name, opts);
    setValue(`${p}.stars`, h.stars, opts);
    if (h.location.distanceM > 0) setValue(`${p}.distanceM`, Math.min(h.location.distanceM, MAX_PACKAGE_DISTANCE), opts);
    const meal = MEAL_PLANS.find((m) => h.mealPlans.includes(m) && BOARD_FROM_MEAL[m]);
    if (!stay.board && meal) setValue(`${p}.board`, BOARD_FROM_MEAL[meal]!, opts);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="space-y-2" data-testid={`package-form-${city}-contract`}>
      {stay.hotelId ? (
        <div className="flex flex-wrap items-center gap-2.5 rounded-[18px] bg-emerald-50/80 px-3 py-2.5 ring-1 ring-inset ring-emerald-900/[0.06]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white" aria-hidden>
            <Link2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-emerald-900">{t("linked", { name: linked?.name ?? stay.name })}</p>
            <p className="text-[12px] font-medium text-emerald-800/80" data-testid={`package-form-${city}-rate`}>
              {quote.data
                ? quote.data.bookable
                  ? t("rate", {
                      net: formatMoney(Math.round(quote.data.netTotal / Math.max(1, quote.data.guests)), locale, quote.data.currency),
                      gross: formatMoney(Math.round(quote.data.grossTotal / Math.max(1, quote.data.guests)), locale, quote.data.currency),
                      nights: quote.data.nights,
                    })
                  : th(`availability.${quote.data.availability}`)
                : quote.loading
                  ? t("pricing")
                  : t("needDates")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setValue(`spec.${city}.hotelId`, "", { shouldDirty: true })}
            className="inline-flex h-8 items-center gap-1 rounded-full bg-white px-3 text-[12px] font-semibold text-zinc-600 ring-1 ring-zinc-200 transition hover:text-rose-600"
          >
            <Link2Off className="h-3.5 w-3.5" aria-hidden />
            {t("unlink")}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-dashed border-zinc-300 bg-white px-3.5 text-[13px] font-semibold text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950"
        data-testid={`package-form-${city}-pick`}
      >
        <FileSignature className="h-4 w-4 text-indigo-500" aria-hidden />
        {stay.hotelId ? t("change") : t("pick")}
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div className="rounded-[20px] border border-zinc-200/70 bg-white p-2.5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.5)]">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} className="h-10 ps-9" autoFocus />
          </div>
          {options.length === 0 ? (
            <p className="px-2 py-3 text-[12.5px] text-zinc-400">{list.loading ? t("loading") : t("empty")}</p>
          ) : (
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {options.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => pick(h)}
                    className={cn("flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-start transition hover:bg-zinc-50", h.id === stay.hotelId && "bg-emerald-50")}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-zinc-900">
                        <bdi>{locale === "ar" && h.nameAr ? h.nameAr : h.name}</bdi>
                      </span>
                      <span className="flex items-center gap-2 text-[11.5px] text-zinc-500">
                        <HotelStars stars={h.stars} />
                        {h.location.city}
                        {h.location.distanceM > 0 ? ` · ${th("distance", { m: h.location.distanceM })}` : ""}
                      </span>
                    </span>
                    {h.summary.fromNet > 0 ? (
                      <span className="shrink-0 text-[12px] font-semibold tabular-nums text-zinc-600">{formatMoney(h.summary.fromNet, locale, h.currency)}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Quotes a double room for two adults over the stay dates, debounced. */
function useStayQuote(repository: HotelRepository, hotel: HotelListItem | null, checkIn: string, checkOut: string, board: string) {
  const [state, setState] = useState<{ data: Quote | null; loading: boolean }>({ data: null, loading: false });
  const nights = stayNights({ checkIn, checkOut });

  useEffect(() => {
    if (!hotel || !nights) {
      setState({ data: null, loading: false });
      return;
    }
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    const wanted = MEAL_FROM_BOARD[board];
    const mealPlan = wanted && hotel.mealPlans.includes(wanted) ? wanted : (MEAL_PLANS.find((m) => hotel.mealPlans.includes(m)) ?? "ro");
    const roomType = ROOM_TYPES.find((r) => hotel.roomTypes.includes(r)) ?? "standard";
    const timer = window.setTimeout(() => {
      repository
        .quote(hotel.id, { checkIn, checkOut, roomType, mealPlan, rooms: 1, adults: 2, children: [], extraBed: false })
        .then((data) => live && setState({ data, loading: false }))
        .catch(() => live && setState({ data: null, loading: false }));
    }, 400);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [repository, hotel, checkIn, checkOut, board, nights]);

  return state;
}
