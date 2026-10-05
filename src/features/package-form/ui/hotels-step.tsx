"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { AlertTriangle, BedDouble, Building2, CalendarCheck2, CalendarX2, Hotel, MapPin, MoonStar, Ruler, Timer } from "lucide-react";
import {
  ACCESS_LOOK,
  BOARD_LOOK,
  BOARD_TYPES,
  HOTEL_ACCESS,
  MADINAH_ZONES,
  lookOf,
  stayNights,
} from "@/entities/tourpackage";
import { cn } from "@/shared/lib/cn";
import {
  Button,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSection,
  IconInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import type { PackageFormValues } from "../model/form";
import { ChoiceGrid, StarPicker, Stepper } from "./controls";

type City = "makkah" | "madinah";

export function HotelsStep() {
  const t = useTranslations("packages");
  const { control } = useFormContext<PackageFormValues>();
  const [durationDays, nights] = useWatch({ control, name: ["durationDays", "spec.nights"] });
  const total = nights.makkah + nights.madinah;
  const overflow = total > durationDays;

  return (
    <div className="space-y-3.5">
      <FormSection
        icon={MoonStar}
        tone="indigo"
        title={t("form.hotels.split")}
        hint={t("form.hotels.splitSummary", { makkah: nights.makkah, madinah: nights.madinah, total, max: durationDays })}
        testId="package-form-split"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={control}
            name="spec.nights.makkah"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.hotels.makkah")}</FormLabel>
                <Stepper value={field.value} onChange={field.onChange} min={0} max={60} suffix={t("form.hotels.nights")} label={t("form.hotels.makkah")} testId="package-form-makkah-nights" />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="spec.nights.madinah"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.hotels.madinah")}</FormLabel>
                <Stepper value={field.value} onChange={field.onChange} min={0} max={60} suffix={t("form.hotels.nights")} label={t("form.hotels.madinah")} testId="package-form-madinah-nights" />
                <p className="text-[11.5px] text-zinc-500">{t("form.hotels.noMadinah")}</p>
              </FormItem>
            )}
          />
        </div>
        <SplitBar makkah={nights.makkah} madinah={nights.madinah} max={Math.max(durationDays - 1, total, 1)} />
        {overflow ? (
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-rose-600" role="alert">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {t("form.hotels.overflow")}
          </p>
        ) : null}
      </FormSection>

      <HotelCard city="makkah" />
      {nights.madinah > 0 ? <HotelCard city="madinah" /> : null}
    </div>
  );
}

function SplitBar({ makkah, madinah, max }: { makkah: number; madinah: number; max: number }) {
  const pct = (n: number) => `${Math.min(100, (n / max) * 100)}%`;
  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-zinc-100" aria-hidden>
      <span className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all" style={{ width: pct(makkah) }} />
      <span className="h-full bg-gradient-to-r from-sky-400 to-sky-500 transition-all" style={{ width: pct(madinah) }} />
    </div>
  );
}

function HotelCard({ city }: { city: City }) {
  const t = useTranslations("packages");
  const { control, setValue } = useFormContext<PackageFormValues>();
  const hotel = useWatch({ control, name: `spec.${city}` });
  const planned = useWatch({ control, name: `spec.nights.${city}` });
  const fromDates = stayNights(hotel);
  const p = `spec.${city}` as const;

  return (
    <FormSection
      icon={city === "makkah" ? Hotel : Building2}
      tone={city === "makkah" ? "emerald" : "sky"}
      title={t(`form.hotels.${city}`)}
      hint={t(`form.hotels.${city}Hint`)}
      testId={`package-form-hotel-${city}`}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <FormField
          control={control}
          name={`${p}.name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.hotels.name")}</FormLabel>
              <FormControl>
                <IconInput icon={BedDouble} iconClassName={city === "makkah" ? "text-emerald-500" : "text-sky-500"} {...field} dir="auto" placeholder={t("form.hotels.namePh")} data-testid={`package-form-${city}-name`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`${p}.stars`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.hotels.stars")}</FormLabel>
              <StarPicker value={field.value} onChange={field.onChange} label={t("form.hotels.stars")} />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name={`${p}.access`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("form.hotels.access")}</FormLabel>
            <ChoiceGrid
              name={`${city}-access`}
              value={field.value}
              onChange={(v) => field.onChange(v)}
              options={HOTEL_ACCESS.map((a) => ({ value: a, label: t(`access.${a}`), ...lookOf(ACCESS_LOOK, a) }))}
            />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name={`${p}.distanceM`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.hotels.distance")}</FormLabel>
              <FormControl>
                <div className="relative">
                  <IconInput
                    icon={Ruler}
                    iconClassName="text-amber-500"
                    inputMode="numeric"
                    value={field.value ? String(field.value) : ""}
                    onChange={(e) => field.onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    placeholder="0"
                    className="pe-10 tabular-nums"
                  />
                  <span className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-zinc-400">{t("form.hotels.meters")}</span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {hotel.access === "shuttle" ? (
          <FormField
            control={control}
            name={`${p}.shuttleMinutes`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5 text-sky-500" aria-hidden />
                  {t("form.hotels.shuttleMinutes")}
                </FormLabel>
                <Stepper value={field.value} onChange={field.onChange} min={0} max={180} suffix={t("form.hotels.minutes")} label={t("form.hotels.shuttleMinutes")} />
              </FormItem>
            )}
          />
        ) : null}
        {city === "madinah" ? <ZoneSelect /> : null}
      </div>

      <FormField
        control={control}
        name={`${p}.board`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("form.hotels.board")}</FormLabel>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("form.hotels.board")}>
              {BOARD_TYPES.map((b) => {
                const look = lookOf(BOARD_LOOK, b);
                const Icon = look.icon;
                const on = field.value === b;
                return (
                  <button
                    key={b}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => field.onChange(on ? "" : b)}
                    title={t(`board.${b}`)}
                    className={cn(
                      "inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition",
                      on ? "border-transparent bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900",
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.2} aria-hidden />
                    {t(`boardShort.${b}`)}
                    <span className={cn("hidden text-[11.5px] font-medium sm:inline", on ? "text-white/70" : "text-zinc-400")}>{t(`board.${b}`)}</span>
                  </button>
                );
              })}
            </div>
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name={`${p}.checkIn`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.hotels.checkIn")}</FormLabel>
              <FormControl>
                <IconInput icon={CalendarCheck2} iconClassName="text-emerald-500" type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`${p}.checkOut`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.hotels.checkOut")}</FormLabel>
              <FormControl>
                <IconInput icon={CalendarX2} iconClassName="text-rose-500" type="date" min={hotel.checkIn || undefined} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {fromDates !== null && fromDates !== planned ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-amber-800">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" aria-hidden />
            {t("form.hotels.nightsFromDates", { n: fromDates })}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-full"
            onClick={() => setValue(`spec.nights.${city}`, fromDates, { shouldDirty: true, shouldValidate: true })}
          >
            {t("form.hotels.useDates")}
          </Button>
        </div>
      ) : null}
    </FormSection>
  );
}

function ZoneSelect() {
  const t = useTranslations("packages");
  const { control } = useFormContext<PackageFormValues>();
  return (
    <FormField
      control={control}
      name="spec.madinah.zone"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("form.hotels.zone")}</FormLabel>
          <Select value={field.value || undefined} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger className="h-12 rounded-2xl">
                <SelectValue placeholder={t("form.hotels.zonePh")} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {MADINAH_ZONES.map((z) => (
                <SelectItem key={z} value={z}>
                  {t(`zone.${z}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
}
