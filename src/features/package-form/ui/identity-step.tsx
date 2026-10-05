"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Banknote, CalendarDays, Globe2, Hash, Package, Plane, ShoppingBag, Sparkles, Ticket, Users, Wand2 } from "lucide-react";
import {
  CATEGORY_LOOK,
  KIND_LOOK,
  PACKAGE_CATEGORIES,
  PACKAGE_CURRENCIES,
  PACKAGE_KINDS,
  TRANSPORT_LOOK,
  TRANSPORT_MODES,
  lookOf,
  suggestPackageCode,
  totalNights,
  type PackageKind,
} from "@/entities/tourpackage";
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
  Textarea,
} from "@/shared/ui";
import type { PackageFormValues } from "../model/form";
import { ChoiceGrid, Stepper, SwitchRow } from "./controls";

export function IdentityStep({ takenCodes }: { takenCodes: readonly string[] }) {
  const t = useTranslations("packages");
  const { control, setValue, getValues, clearErrors } = useFormContext<PackageFormValues>();
  const [kind, durationDays, nights] = useWatch({ control, name: ["kind", "durationDays", "spec.nights"] });
  const categories = PACKAGE_CATEGORIES[kind];

  function changeKind(next: PackageKind) {
    if (next === getValues("kind")) return;
    setValue("kind", next, { shouldDirty: true });
    setValue("category", next === "hajj" ? "short" : "standard", { shouldDirty: true });
    setValue("spec.visa.type", next === "hajj" ? "HAJJ_VISA" : "UMRAH_VISA", { shouldDirty: true });
    clearErrors("category");
  }

  function suggest() {
    const code = suggestPackageCode(getValues("kind"), getValues("category"), new Date().getFullYear(), takenCodes);
    setValue("code", code, { shouldDirty: true, shouldValidate: true });
  }

  return (
    <div className="space-y-3.5">
      <FormSection icon={Sparkles} tone="emerald" title={t("form.identity.kind")} hint={t("steps.identity.hint")} testId="package-form-kind">
        <ChoiceGrid
          name="package-kind"
          value={kind}
          onChange={changeKind}
          options={PACKAGE_KINDS.map((k) => ({ value: k, label: t(`kind.${k}`), hint: t(`kindHint.${k}`), ...lookOf(KIND_LOOK, k) }))}
        />
        <FormField
          control={control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.identity.category")}</FormLabel>
              <ChoiceGrid
                name="package-category"
                columns={kind === "umrah" ? 4 : 2}
                value={field.value}
                onChange={(v) => field.onChange(v)}
                options={categories.map((c) => ({ value: c, label: t(`category.${c}`), hint: t(`categoryHint.${c}`), ...lookOf(CATEGORY_LOOK, c) }))}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      <FormSection icon={Package} tone="indigo" title={t("steps.identity.title")} testId="package-form-identity">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={control}
            name="code"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{t("form.identity.code")}</FormLabel>
                <div className="flex gap-2 [&>*:first-child]:min-w-0 [&>*:first-child]:flex-1">
                  <FormControl>
                    <IconInput
                      icon={Hash}
                      iconClassName="text-indigo-500"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      dir="ltr"
                      spellCheck={false}
                      autoComplete="off"
                      className="font-semibold uppercase tracking-wider"
                      placeholder="UMR-2026-RAM-01"
                      data-testid="package-form-code"
                    />
                  </FormControl>
                  <Button type="button" variant="outline" className="h-12 shrink-0 gap-1.5 rounded-2xl" onClick={suggest} data-testid="package-form-suggest">
                    <Wand2 className="h-4 w-4" aria-hidden />
                    {t("form.identity.suggest")}
                  </Button>
                </div>
                <p className="text-[11.5px] text-zinc-500">{t("form.identity.codeHint")}</p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="nameEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.identity.nameEn")}</FormLabel>
                <FormControl>
                  <IconInput icon={Ticket} iconClassName="text-emerald-500" {...field} dir="ltr" placeholder={t("form.identity.nameEnPh")} data-testid="package-form-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="nameAr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.identity.nameAr")}</FormLabel>
                <FormControl>
                  <IconInput icon={Globe2} iconClassName="text-sky-500" {...field} dir="rtl" lang="ar" placeholder="عمرة رمضان" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{t("form.identity.description")}</FormLabel>
                <FormControl>
                  <Textarea {...field} dir="auto" rows={2} placeholder={t("form.identity.descriptionPh")} className="min-h-[68px] rounded-2xl text-[14.5px]" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </FormSection>

      <FormSection
        icon={CalendarDays}
        tone="sky"
        title={t("form.identity.duration")}
        hint={t("form.identity.nightsSummary", { days: durationDays, nights: Math.max(0, durationDays - 1) })}
        testId="package-form-duration"
        aside={
          totalNights({ nights }) > 0 ? (
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11.5px] font-semibold text-sky-700">
              {t("card.split", { makkah: nights.makkah, madinah: nights.madinah })}
            </span>
          ) : null
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={control}
            name="durationDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.identity.duration")}</FormLabel>
                <Stepper value={field.value} onChange={field.onChange} min={1} max={60} suffix={t("form.identity.days")} label={t("form.identity.duration")} testId="package-form-duration-stepper" />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="capacityTotal"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-violet-500" aria-hidden />
                  {t("form.identity.quota")}
                </FormLabel>
                <Stepper value={field.value} onChange={field.onChange} min={0} max={10000} suffix={t("form.identity.seats")} label={t("form.identity.quota")} />
                <p className="text-[11.5px] text-zinc-500">{t("form.identity.quotaHint")}</p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </FormSection>

      <FormSection icon={Plane} tone="violet" title={t("form.identity.transport")} testId="package-form-transport">
        <FormField
          control={control}
          name="transportMode"
          render={({ field }) => (
            <FormItem>
              <ChoiceGrid
                name="package-transport"
                columns={3}
                value={field.value}
                onChange={(v) => field.onChange(v)}
                options={TRANSPORT_MODES.map((m) => ({ value: m, label: t(`transport.${m}`), hint: t(`transportHint.${m}`), ...lookOf(TRANSPORT_LOOK, m) }))}
              />
            </FormItem>
          )}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={control}
            name="baseCurrency"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                  {t("form.identity.currency")}
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-12 rounded-2xl" data-testid="package-form-currency">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PACKAGE_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11.5px] text-zinc-500">{t("form.identity.currencyHint")}</p>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="salesOpen"
            render={({ field }) => (
              <div className="self-start sm:pt-7">
                <SwitchRow
                  icon={ShoppingBag}
                  tone="emerald"
                  label={t("form.identity.salesOpen")}
                  hint={t("form.identity.salesOpenHint")}
                  checked={field.value}
                  onChange={field.onChange}
                  testId="package-form-sales-open"
                />
              </div>
            )}
          />
        </div>
      </FormSection>
    </div>
  );
}
