"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import {
  ArrowRightLeft,
  BusFront,
  CalendarDays,
  Hash,
  Hotel,
  PlaneLanding,
  PlaneTakeoff,
  Plane,
  Route,
  Armchair,
  Ticket,
  UserCheck,
  Waypoints,
} from "lucide-react";
import { AIRLINES, FLIGHT_ROUTINGS, INTERCITY_LOOK, INTERCITY_MODES, lookOf } from "@/entities/tourpackage";
import { cn } from "@/shared/lib/cn";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormSection, IconInput, SegmentedControl, TONES } from "@/shared/ui";
import type { PackageFormValues } from "../model/form";
import { ChoiceGrid, Stepper, SwitchRow } from "./controls";

export function LogisticsStep() {
  const t = useTranslations("packages");
  const { control } = useFormContext<PackageFormValues>();
  const [transportMode, intercity] = useWatch({ control, name: ["transportMode", "spec.transfers.intercity"] });

  return (
    <div className="space-y-3.5">
      {transportMode === "road" ? (
        <div className={cn("flex items-center gap-3 rounded-[22px] p-4 text-[13.5px] font-semibold", TONES.amber.soft)}>
          <BusFront className="h-6 w-6" aria-hidden />
          {t("form.logistics.road")}
        </div>
      ) : (
        <FormSection icon={Plane} tone="sky" title={t("form.logistics.flights")} hint={t("form.logistics.flightsHint")} testId="package-form-flights">
          <FormField
            control={control}
            name="spec.flights.airline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.logistics.airline")}</FormLabel>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("form.logistics.airline")}>
                  {AIRLINES.map((a) => (
                    <button
                      key={a}
                      type="button"
                      role="radio"
                      aria-checked={field.value === a}
                      onClick={() => field.onChange(field.value === a ? "" : a)}
                      className={cn(
                        "h-9 rounded-full border px-3.5 text-[12.5px] font-semibold transition",
                        field.value === a ? "border-transparent bg-sky-500 text-white shadow-[0_8px_18px_-8px_rgba(14,165,233,0.7)]" : "border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900",
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <FormControl>
                  <IconInput icon={Plane} iconClassName="text-sky-500" {...field} dir="ltr" placeholder={t("form.logistics.airlinePh")} data-testid="package-form-airline" />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="spec.flights.routing"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.logistics.routing")}</FormLabel>
                <SegmentedControl
                  size="lg"
                  className="flex w-full [&>button]:flex-1 [&>button]:justify-center"
                  value={field.value as (typeof FLIGHT_ROUTINGS)[number]}
                  onChange={field.onChange}
                  options={FLIGHT_ROUTINGS.map((r) => ({ value: r, label: t(`routing.${r}`), icon: r === "direct" ? ArrowRightLeft : Route }))}
                  aria-label={t("form.logistics.routing")}
                />
              </FormItem>
            )}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Leg leg="outbound" />
            <Leg leg="inbound" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="spec.flights.pnr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.logistics.pnr")}</FormLabel>
                  <FormControl>
                    <IconInput
                      icon={Ticket}
                      iconClassName="text-violet-500"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      dir="ltr"
                      spellCheck={false}
                      className="font-semibold uppercase tracking-[0.2em]"
                      placeholder="ABC123"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="spec.flights.blockSeats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Armchair className="h-3.5 w-3.5 text-violet-500" aria-hidden />
                    {t("form.logistics.blockSeats")}
                  </FormLabel>
                  <Stepper value={field.value} onChange={field.onChange} min={0} max={1000} label={t("form.logistics.blockSeats")} />
                </FormItem>
              )}
            />
          </div>
        </FormSection>
      )}

      <FormSection icon={Waypoints} tone="emerald" title={t("form.logistics.ground")} hint={t("form.logistics.groundHint")} testId="package-form-ground">
        <FormField
          control={control}
          name="spec.transfers.intercity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                {t("form.logistics.intercity")}
              </FormLabel>
              <ChoiceGrid
                name="package-intercity"
                value={field.value}
                onChange={(v) => field.onChange(v)}
                options={INTERCITY_MODES.map((m) => ({ value: m, label: t(`intercity.${m}`), ...lookOf(INTERCITY_LOOK, m) }))}
              />
            </FormItem>
          )}
        />
        {intercity === "bus" || transportMode === "road" ? (
          <FormField
            control={control}
            name="spec.transfers.busClass"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.logistics.busClass")}</FormLabel>
                <FormControl>
                  <IconInput icon={BusFront} iconClassName="text-amber-500" {...field} dir="auto" placeholder={t("form.logistics.busClassPh")} />
                </FormControl>
              </FormItem>
            )}
          />
        ) : null}
        <div className="grid gap-2.5 sm:grid-cols-2">
          <FormField
            control={control}
            name="spec.transfers.airportMeet"
            render={({ field }) => (
              <SwitchRow icon={UserCheck} tone="sky" label={t("form.logistics.airportMeet")} hint={t("form.logistics.airportMeetHint")} checked={field.value} onChange={field.onChange} />
            )}
          />
          <FormField
            control={control}
            name="spec.transfers.hotelTransfers"
            render={({ field }) => (
              <SwitchRow icon={Hotel} tone="violet" label={t("form.logistics.hotelTransfers")} hint={t("form.logistics.hotelTransfersHint")} checked={field.value} onChange={field.onChange} />
            )}
          />
        </div>
      </FormSection>
    </div>
  );
}

function Leg({ leg }: { leg: "outbound" | "inbound" }) {
  const t = useTranslations("packages");
  const { control } = useFormContext<PackageFormValues>();
  const Icon = leg === "outbound" ? PlaneTakeoff : PlaneLanding;
  const p = `spec.flights.${leg}` as const;
  return (
    <div className="space-y-3 rounded-[20px] bg-zinc-50/80 p-3 ring-1 ring-inset ring-zinc-900/[0.04]" data-testid={`package-form-leg-${leg}`}>
      <p className="flex items-center gap-2 text-[13px] font-semibold text-zinc-800">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-[11px]", leg === "outbound" ? TONES.sky.soft : TONES.indigo.soft)} aria-hidden>
          <Icon className="h-4 w-4 rtl:-scale-x-100" strokeWidth={2.2} />
        </span>
        {t(`form.logistics.${leg}`)}
      </p>
      <FormField
        control={control}
        name={`${p}.route`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[12px]">{t("form.logistics.route")}</FormLabel>
            <FormControl>
              <IconInput
                icon={Route}
                iconClassName="text-sky-500"
                {...field}
                onChange={(e) => field.onChange(e.target.value.toUpperCase().replace(/[^A-Z-]/g, ""))}
                dir="ltr"
                spellCheck={false}
                className="font-semibold tracking-wider"
                placeholder={leg === "outbound" ? "IST-JED" : "MED-IST"}
                data-testid={`package-form-${leg}-route`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-2">
        <FormField
          control={control}
          name={`${p}.flightNo`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[12px]">{t("form.logistics.flightNo")}</FormLabel>
              <FormControl>
                <IconInput icon={Hash} {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} dir="ltr" placeholder="TK 98" />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`${p}.date`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[12px]">{t("form.logistics.date")}</FormLabel>
              <FormControl>
                <IconInput icon={CalendarDays} iconClassName="text-sky-500" type="date" {...field} className="ps-10 text-[13px]" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
