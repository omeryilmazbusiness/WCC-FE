"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { AlertTriangle, BedDouble, Building2, CalendarCheck2, CalendarX2, Hotel, MapPin, Plus, Trash2 } from "lucide-react";
import { BOARD_LOOK, BOARD_TYPES, emptyHotel, lookOf, stayNights, stayPlanNights } from "@/entities/tourpackage";
import { cn } from "@/shared/lib/cn";
import { Button, FormControl, FormField, FormItem, FormLabel, FormSection, IconInput } from "@/shared/ui";
import type { PackageFormValues } from "../model/form";
import { StarPicker, Stepper } from "./controls";

/** Custom-tour stays: one hotel card per city, extra stays can be added by hand. */
export function DestinationHotelsStep() {
  const t = useTranslations("packages");
  const { control } = useFormContext<PackageFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "spec.stays" });
  const [durationDays, stays, districts] = useWatch({ control, name: ["durationDays", "spec.stays", "spec.destination.districts"] });
  const total = stayPlanNights({ stays });
  const overflow = total > durationDays;

  return (
    <div className="space-y-3.5">
      <FormSection
        icon={Hotel}
        tone="indigo"
        title={t("form.hotels.stays")}
        hint={t("form.hotels.staysHint", { n: fields.length, nights: total, max: durationDays })}
        testId="package-form-stays"
      >
        {overflow ? (
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-rose-600" role="alert">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {t("form.hotels.overflow")}
          </p>
        ) : null}
        {fields.length === 0 ? (
          <p className="rounded-[20px] border border-dashed border-zinc-200 px-4 py-8 text-center text-[13px] font-medium text-zinc-500">
            {districts.length ? t("form.hotels.noStayYet") : t("form.identity.districts")}
          </p>
        ) : null}
      </FormSection>
      {fields.map((f, i) => (
        <StayCard key={f.id} index={i} onRemove={() => remove(i)} />
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-full gap-1.5 rounded-2xl"
        onClick={() => append({ city: "", nights: 1, hotel: emptyHotel() })}
        data-testid="package-form-add-stay"
      >
        <Plus className="h-4 w-4" aria-hidden />
        {t("form.hotels.addStay")}
      </Button>
    </div>
  );
}

function StayCard({ index, onRemove }: { index: number; onRemove: () => void }) {
  const t = useTranslations("packages");
  const { control, setValue } = useFormContext<PackageFormValues>();
  const stay = useWatch({ control, name: `spec.stays.${index}` });
  const fromDates = stay ? stayNights(stay.hotel) : null;

  return (
    <FormSection
      icon={index % 2 ? Building2 : Hotel}
      tone={index % 2 ? "sky" : "emerald"}
      title={stay?.city || t("form.hotels.stay", { n: index + 1 })}
      hint={t("form.hotels.stayHint")}
      testId={`package-form-stay-${index}`}
      aside={
        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-zinc-400 hover:text-rose-600" onClick={onRemove} aria-label={t("form.hotels.removeStay")}>
          <Trash2 className="h-4 w-4" />
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <FormField
          control={control}
          name={`spec.stays.${index}.city`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.hotels.city")}</FormLabel>
              <FormControl>
                <IconInput icon={MapPin} iconClassName="text-teal-500" {...field} dir="auto" placeholder={t("form.identity.districtPh")} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`spec.stays.${index}.nights`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.hotels.nights")}</FormLabel>
              <Stepper value={field.value} onChange={field.onChange} min={0} max={60} suffix={t("form.hotels.nights")} label={t("form.hotels.nights")} />
            </FormItem>
          )}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <FormField
          control={control}
          name={`spec.stays.${index}.hotel.name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.hotels.name")}</FormLabel>
              <FormControl>
                <IconInput icon={BedDouble} iconClassName="text-emerald-500" {...field} dir="auto" placeholder={t("form.hotels.namePh")} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`spec.stays.${index}.hotel.stars`}
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
        name={`spec.stays.${index}.hotel.board`}
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
                    className={cn(
                      "inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition",
                      on ? "border-transparent bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900",
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.2} aria-hidden />
                    {t(`boardShort.${b}`)}
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
          name={`spec.stays.${index}.hotel.checkIn`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.hotels.checkIn")}</FormLabel>
              <FormControl>
                <IconInput icon={CalendarCheck2} iconClassName="text-emerald-500" type="date" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`spec.stays.${index}.hotel.checkOut`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.hotels.checkOut")}</FormLabel>
              <FormControl>
                <IconInput icon={CalendarX2} iconClassName="text-rose-500" type="date" min={stay?.hotel.checkIn || undefined} {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      {fromDates !== null && stay && fromDates !== stay.nights ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-amber-800">
          <span>{t("form.hotels.nightsFromDates", { n: fromDates })}</span>
          <Button type="button" size="sm" variant="outline" className="h-8 rounded-full" onClick={() => setValue(`spec.stays.${index}.nights`, fromDates, { shouldDirty: true })}>
            {t("form.hotels.useDates")}
          </Button>
        </div>
      ) : null}
    </FormSection>
  );
}
