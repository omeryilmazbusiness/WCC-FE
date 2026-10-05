"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Gift, HeartPulse, ListChecks, MapPinned, ShieldCheck, UserRound, UserRoundCheck, Stamp } from "lucide-react";
import { KIT_ITEMS, KIT_LOOK, VISA_LOOK, VISA_TYPES, ZIYARAT, ZIYARAT_LOOK, lookOf } from "@/entities/tourpackage";
import { FormControl, FormField, FormItem, FormLabel, FormSection, IconInput, Textarea } from "@/shared/ui";
import type { PackageFormValues } from "../model/form";
import { ChipSet, ChoiceGrid, SwitchRow } from "./controls";

const toLines = (v: string) =>
  v
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 40);

export function ServicesStep() {
  const t = useTranslations("packages");
  const { control } = useFormContext<PackageFormValues>();

  return (
    <div className="space-y-3.5">
      <FormSection icon={UserRound} tone="indigo" title={t("form.services.guidance")} hint={t("form.services.guidanceHint")} testId="package-form-guidance">
        <FormField
          control={control}
          name="spec.guidance.leaderName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.services.leader")}</FormLabel>
              <FormControl>
                <IconInput icon={UserRoundCheck} iconClassName="text-indigo-500" {...field} dir="auto" placeholder={t("form.services.leaderPh")} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="spec.guidance.femaleGuide"
          render={({ field }) => (
            <SwitchRow icon={UserRound} tone="rose" label={t("form.services.femaleGuide")} hint={t("form.services.femaleGuideHint")} checked={field.value} onChange={field.onChange} />
          )}
        />
      </FormSection>

      <FormSection icon={Stamp} tone="emerald" title={t("form.services.visa")} hint={t("form.services.visaHint")} testId="package-form-visa">
        <FormField
          control={control}
          name="spec.visa.type"
          render={({ field }) => (
            <FormItem>
              <ChoiceGrid
                name="package-visa"
                columns={3}
                value={field.value}
                onChange={(v) => field.onChange(v)}
                options={VISA_TYPES.map((v) => ({ value: v, label: t(`visa.${v}`), hint: v, ...lookOf(VISA_LOOK, v) }))}
              />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="spec.visa.healthInsurance"
          render={({ field }) => (
            <SwitchRow icon={HeartPulse} tone="rose" label={t("form.services.healthInsurance")} hint={t("form.services.healthInsuranceHint")} checked={field.value} onChange={field.onChange} testId="package-form-insurance" />
          )}
        />
      </FormSection>

      <FormSection icon={Gift} tone="amber" title={t("form.services.kit")} hint={t("form.services.kitHint")} testId="package-form-kit">
        <FormField
          control={control}
          name="spec.kit"
          render={({ field }) => (
            <ChipSet name="package-kit" tone="amber" values={field.value} onChange={field.onChange} options={KIT_ITEMS.map((k) => ({ value: k, label: t(`kit.${k}`), icon: KIT_LOOK[k] }))} />
          )}
        />
      </FormSection>

      <FormSection icon={MapPinned} tone="violet" title={t("form.services.ziyaratMakkah")} hint={t("form.services.ziyaratHint")} testId="package-form-ziyarat">
        <FormField
          control={control}
          name="spec.ziyarat.makkah"
          render={({ field }) => (
            <ChipSet name="ziyarat-makkah" tone="emerald" values={field.value} onChange={field.onChange} options={ZIYARAT.makkah.map((z) => ({ value: z, label: t(`ziyarat.${z}`), icon: ZIYARAT_LOOK[z] }))} />
          )}
        />
        <div>
          <p className="mb-2 text-[13px] font-semibold text-zinc-700">{t("form.services.ziyaratMadinah")}</p>
          <FormField
            control={control}
            name="spec.ziyarat.madinah"
            render={({ field }) => (
              <ChipSet name="ziyarat-madinah" tone="sky" values={field.value} onChange={field.onChange} options={ZIYARAT.madinah.map((z) => ({ value: z, label: t(`ziyarat.${z}`), icon: ZIYARAT_LOOK[z] }))} />
            )}
          />
        </div>
      </FormSection>

      <FormSection icon={ListChecks} tone="teal" title={t("form.services.lines")} hint={t("form.services.linesHint")} testId="package-form-lines">
        <div className="grid gap-4 sm:grid-cols-2">
          {(["included", "excluded"] as const).map((key) => (
            <FormField
              key={key}
              control={control}
              name={`spec.${key}`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <ShieldCheck className={key === "included" ? "h-3.5 w-3.5 text-emerald-500" : "h-3.5 w-3.5 text-rose-500"} aria-hidden />
                    {t(`form.services.${key}`)}
                  </FormLabel>
                  <LinesInput value={field.value} onChange={field.onChange} placeholder={t(`form.services.${key}Ph`)} label={t(`form.services.${key}`)} />
                </FormItem>
              )}
            />
          ))}
        </div>
      </FormSection>
    </div>
  );
}

/** Edits a string list as one-per-line text; blank lines are dropped on blur. */
function LinesInput({ value, onChange, placeholder, label }: { value: string[]; onChange: (v: string[]) => void; placeholder: string; label: string }) {
  return (
    <Textarea
      aria-label={label}
      dir="auto"
      rows={4}
      defaultValue={value.join("\n")}
      onBlur={(e) => onChange(toLines(e.target.value))}
      placeholder={placeholder}
      className="min-h-[112px] rounded-2xl text-[14px] leading-6"
    />
  );
}
