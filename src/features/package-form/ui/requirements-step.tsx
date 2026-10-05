"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Camera, ShieldCheck, Syringe, UsersRound, BookUser, UserSearch } from "lucide-react";
import { FormField, FormSection } from "@/shared/ui";
import type { PackageFormValues } from "../model/form";
import { Stepper, SwitchRow } from "./controls";
import { EligibilityChecker } from "./eligibility-checker";

export function RequirementsStep() {
  const t = useTranslations("packages");
  const { control } = useFormContext<PackageFormValues>();
  const [requirements, outboundDate] = useWatch({ control, name: ["spec.requirements", "spec.flights.outbound.date"] });

  return (
    <div className="space-y-3.5">
      <FormSection icon={ShieldCheck} tone="rose" title={t("form.requirements.title")} hint={t("form.requirements.hint")} testId="package-form-requirements">
        <div className="grid gap-3 rounded-[20px] bg-zinc-50/80 p-3 ring-1 ring-inset ring-zinc-900/[0.04] sm:grid-cols-[1fr_220px] sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-violet-50 text-violet-700" aria-hidden>
              <BookUser className="h-5 w-5" strokeWidth={2.1} />
            </span>
            <span>
              <span className="block text-[13.5px] font-semibold text-zinc-900">{t("form.requirements.passport")}</span>
              <span className="block text-[11.5px] font-medium text-zinc-500">{t("form.requirements.passportHint")}</span>
            </span>
          </div>
          <FormField
            control={control}
            name="spec.requirements.passportMonths"
            render={({ field }) => (
              <Stepper value={field.value} onChange={field.onChange} min={0} max={24} suffix={t("form.requirements.months")} label={t("form.requirements.passport")} testId="package-form-passport-months" />
            )}
          />
        </div>
        <FormField
          control={control}
          name="spec.requirements.meningitis"
          render={({ field }) => (
            <SwitchRow icon={Syringe} tone="emerald" label={t("form.requirements.meningitis")} hint={t("form.requirements.meningitisHint")} checked={field.value} onChange={field.onChange} />
          )}
        />
        <FormField
          control={control}
          name="spec.requirements.biometricPhoto"
          render={({ field }) => (
            <SwitchRow icon={Camera} tone="sky" label={t("form.requirements.photo")} hint={t("form.requirements.photoHint")} checked={field.value} onChange={field.onChange} />
          )}
        />
        <FormField
          control={control}
          name="spec.requirements.mahram"
          render={({ field }) => (
            <SwitchRow icon={UsersRound} tone="amber" label={t("form.requirements.mahram")} hint={t("form.requirements.mahramHint")} checked={field.value} onChange={field.onChange} testId="package-form-mahram" />
          )}
        />
        {requirements.mahram ? (
          <div className="grid gap-3 ps-[52px] sm:grid-cols-[1fr_220px] sm:items-center">
            <span className="text-[13px] font-semibold text-zinc-700">{t("form.requirements.mahramAge")}</span>
            <FormField
              control={control}
              name="spec.requirements.mahramMaxAge"
              render={({ field }) => (
                <Stepper value={field.value} onChange={field.onChange} min={0} max={99} suffix={t("form.requirements.years")} label={t("form.requirements.mahramAge")} />
              )}
            />
          </div>
        ) : null}
      </FormSection>

      <FormSection icon={UserSearch} tone="indigo" title={t("form.requirements.checker")} hint={t("form.requirements.checkerHint")} testId="package-form-checker">
          <EligibilityChecker requirements={requirements} defaultDepartDate={outboundDate} />
        </FormSection>
    </div>
  );
}
