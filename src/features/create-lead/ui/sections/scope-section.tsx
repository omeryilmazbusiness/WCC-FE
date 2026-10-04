"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, CalendarRange, MapPin, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { LEAD_SERVICES, SERVICE_LOOK } from "@/entities/lead";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input, FormSection, GroupLabel, IconInput } from "@/shared/ui";
import { needsCabin, type LeadFormValues } from "../../model/form";
import { useAiField } from "../parts/ai-fields";
import { ChoiceChips } from "../parts/choice-chips";

const FLEX_PRESETS = [0, 1, 2, 3, 7];

export function ScopeSection() {
  const t = useTranslations("pipeline.leadForm");
  const form = useFormContext<LeadFormValues>();
  const [services, travelDate, flexDays] = useWatch({ control: form.control, name: ["services", "travelDate", "flexDays"] });
  const flight = needsCabin(services);
  const date = useAiField("travel_date");
  const period = useAiField("travel_window");
  const flexOptions = (FLEX_PRESETS.includes(flexDays) ? FLEX_PRESETS : [...FLEX_PRESETS, flexDays].sort((a, b) => a - b)).map(
    (n) => ({ value: String(n), label: n === 0 ? t("flex.exact") : t("flex.days", { n }) }),
  );

  function swap() {
    const { origin, destination } = form.getValues();
    form.setValue("origin", destination, { shouldDirty: true });
    form.setValue("destination", origin, { shouldDirty: true });
  }

  const RouteStart = flight ? PlaneTakeoff : MapPin;
  const RouteEnd = flight ? PlaneLanding : MapPin;

  return (
    <FormSection icon={CalendarRange} tone="indigo" title={t("sections.scope.title")} hint={t("sections.scope.hint")} testId="lead-form-scope">
      <div>
        <GroupLabel>{t("fields.services")}</GroupLabel>
        <FormField
          control={form.control}
          name="services"
          render={({ field }) => (
            <>
              <ChoiceChips
                multiple
                variant="tiles"
                testId="lead-form-services"
                aria-label={t("fields.services")}
                value={field.value}
                onChange={field.onChange}
                options={LEAD_SERVICES.map((s) => ({ value: s, label: t(`services.${s}`), ...SERVICE_LOOK[s] }))}
              />
              <FormMessage />
            </>
          )}
        />
      </div>

      <div>
        <div className="grid items-start gap-2 sm:grid-cols-[1fr_auto_1fr]">
          <FormField
            control={form.control}
            name="origin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.origin")}</FormLabel>
                <FormControl>
                  <IconInput icon={RouteStart} iconClassName="text-sky-500" {...field} placeholder={flight ? "IST" : t("fields.placePh")} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <button
            type="button"
            onClick={swap}
            aria-label={t("fields.swap")}
            title={t("fields.swap")}
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900 active:scale-95 sm:mt-[30px]"
            data-testid="lead-form-swap"
          >
            <ArrowLeftRight className="h-4 w-4 rotate-90 sm:rotate-0" strokeWidth={2.4} aria-hidden />
          </button>
          <FormField
            control={form.control}
            name="destination"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.destination")}</FormLabel>
                <FormControl>
                  <IconInput icon={RouteEnd} iconClassName="text-indigo-500" {...field} placeholder={flight ? "JFK" : t("fields.placePh")} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {flight ? <p className="mt-1.5 text-[11.5px] text-zinc-400">{t("fields.iataHint")}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="travelDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                {t("fields.departure")}
                {date.badge}
              </FormLabel>
              <FormControl>
                <Input type="date" {...field} className={date.ring} data-testid="lead-form-departure" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="returnDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.return")}</FormLabel>
              <FormControl>
                <Input type="date" min={travelDate || undefined} {...field} data-testid="lead-form-return" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div>
        <GroupLabel>{t("fields.flex")}</GroupLabel>
        <FormField
          control={form.control}
          name="flexDays"
          render={({ field }) => (
            <ChoiceChips
              testId="lead-form-flex"
              aria-label={t("fields.flex")}
              value={String(field.value)}
              onChange={(v) => field.onChange(Number(v || 0))}
              options={flexOptions}
            />
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="travelWindow"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              {t("fields.travelWindow")}
              {period.badge}
            </FormLabel>
            <FormControl>
              <Input {...field} placeholder={t("fields.travelWindowPh")} className={period.ring} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormSection>
  );
}
