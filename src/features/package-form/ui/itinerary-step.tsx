"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { CalendarPlus, MapPin, Route, Sparkles, Trash2 } from "lucide-react";
import { CITY_TONE, ITINERARY_CITIES, itineraryTemplate } from "@/entities/tourpackage";
import { cn } from "@/shared/lib/cn";
import { Button, FormControl, FormField, FormItem, FormMessage, FormSection, Input, Textarea, TONES } from "@/shared/ui";
import type { PackageFormValues } from "../model/form";

export function ItineraryStep() {
  const t = useTranslations("packages");
  const { control, getValues } = useFormContext<PackageFormValues>();
  const { fields, append, remove, replace } = useFieldArray({ control, name: "spec.itinerary" });
  const [durationDays, days] = useWatch({ control, name: ["durationDays", "spec.itinerary"] });

  function generate() {
    const s = getValues("spec");
    const intercity = s.transfers.intercity;
    replace(
      itineraryTemplate(
        { durationDays: getValues("durationDays"), makkahNights: s.nights.makkah, madinahNights: s.nights.madinah, intercity },
        {
          arrival: t("template.arrival"),
          arrivalDetails: t("template.arrivalDetails"),
          makkahDay: t("template.makkahDay"),
          makkahZiyarat: t("template.makkahZiyarat"),
          transfer: (mode) => (mode === "bus" ? t("template.transferBus") : t("template.transferTrain")),
          madinahDay: t("template.madinahDay"),
          madinahZiyarat: t("template.madinahZiyarat"),
          farewell: t("template.farewell"),
          farewellDetails: t("template.farewellDetails"),
        },
      ),
    );
  }

  function addDay() {
    const used = new Set(days.map((d) => d.day));
    let next = 1;
    while (used.has(next) && next < durationDays) next++;
    append({ day: next, city: "", title: "", details: "" });
  }

  return (
    <FormSection
      icon={Route}
      tone="violet"
      title={t("form.itinerary.title")}
      hint={t("form.itinerary.hint", { count: fields.length, days: durationDays })}
      testId="package-form-itinerary"
      aside={
        <Button type="button" size="sm" variant={fields.length ? "outline" : "default"} className="h-9 gap-1.5 rounded-full" onClick={generate} data-testid="package-form-generate">
          <Sparkles className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{fields.length ? t("form.itinerary.regenerate") : t("form.itinerary.generate")}</span>
        </Button>
      }
    >
      {fields.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[22px] border border-dashed border-zinc-200 px-6 py-10 text-center">
          <span className={cn("flex h-14 w-14 items-center justify-center rounded-[20px]", TONES.violet.gradient)} aria-hidden>
            <Route className="h-7 w-7" />
          </span>
          <p className="text-[15px] font-semibold text-zinc-900">{t("form.itinerary.empty")}</p>
          <p className="max-w-sm text-[12.5px] text-zinc-500">{t("form.itinerary.emptyHint")}</p>
          <Button type="button" className="mt-2 gap-1.5" onClick={generate}>
            <Sparkles className="h-4 w-4" aria-hidden />
            {t("form.itinerary.generate")}
          </Button>
        </div>
      ) : (
        <ol className="relative space-y-2.5 before:absolute before:inset-y-4 before:start-[27px] before:w-px before:bg-zinc-200">
          {fields.map((f, i) => (
            <DayRow key={f.id} index={i} onRemove={() => remove(i)} />
          ))}
        </ol>
      )}
      <Button type="button" variant="outline" className="w-full gap-1.5 rounded-2xl" onClick={addDay} disabled={fields.length >= durationDays} data-testid="package-form-add-day">
        <CalendarPlus className="h-4 w-4" aria-hidden />
        {t("form.itinerary.addDay")}
      </Button>
    </FormSection>
  );
}

function DayRow({ index, onRemove }: { index: number; onRemove: () => void }) {
  const t = useTranslations("packages");
  const { control } = useFormContext<PackageFormValues>();
  const city = useWatch({ control, name: `spec.itinerary.${index}.city` });
  const tone = CITY_TONE[city] ?? "zinc";

  return (
    <li className="relative flex gap-3" data-testid={`package-form-day-${index}`}>
      <FormField
        control={control}
        name={`spec.itinerary.${index}.day`}
        render={({ field, fieldState }) => (
          <div className="relative z-[1] flex shrink-0 flex-col items-center">
            <label className={cn("flex h-14 w-14 flex-col items-center justify-center rounded-[18px] ring-4 ring-white", fieldState.error ? "bg-rose-500 text-white" : TONES[tone].gradient)}>
              <span className="text-[9.5px] font-semibold uppercase leading-none opacity-80">{t("form.itinerary.day")}</span>
              <input
                inputMode="numeric"
                aria-label={t("form.itinerary.day")}
                value={String(field.value)}
                onChange={(e) => field.onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
                onBlur={field.onBlur}
                className="w-10 bg-transparent text-center text-[19px] font-bold leading-tight tabular-nums outline-none"
              />
            </label>
          </div>
        )}
      />
      <div className="min-w-0 flex-1 space-y-2 rounded-[20px] bg-zinc-50/80 p-3 ring-1 ring-inset ring-zinc-900/[0.04]">
        <div className="flex items-start gap-2">
          <FormField
            control={control}
            name={`spec.itinerary.${index}.title`}
            render={({ field }) => (
              <FormItem className="min-w-0 flex-1">
                <FormControl>
                  <Input {...field} dir="auto" aria-label={t("form.itinerary.dayTitle")} placeholder={t("form.itinerary.dayTitle")} className="h-10 bg-white font-semibold" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="button" size="icon" variant="ghost" className="h-10 w-10 shrink-0 text-zinc-400 hover:text-rose-600" onClick={onRemove} aria-label={t("form.itinerary.remove")}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <FormField
          control={control}
          name={`spec.itinerary.${index}.city`}
          render={({ field }) => (
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("form.itinerary.city")}>
              {ITINERARY_CITIES.map((c) => {
                const on = field.value === c;
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => field.onChange(on ? "" : c)}
                    className={cn(
                      "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-semibold transition",
                      on ? TONES[CITY_TONE[c]].solid : "bg-white text-zinc-500 ring-1 ring-zinc-200 hover:text-zinc-800",
                    )}
                  >
                    <MapPin className="h-3 w-3" aria-hidden />
                    {t(`city.${c}`)}
                  </button>
                );
              })}
            </div>
          )}
        />
        <FormField
          control={control}
          name={`spec.itinerary.${index}.details`}
          render={({ field }) => (
            <Textarea {...field} dir="auto" rows={2} aria-label={t("form.itinerary.details")} placeholder={t("form.itinerary.detailsPh")} className="min-h-[56px] rounded-xl bg-white text-[13.5px]" />
          )}
        />
        <FormField control={control} name={`spec.itinerary.${index}.day`} render={() => (
            <FormItem>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </li>
  );
}
