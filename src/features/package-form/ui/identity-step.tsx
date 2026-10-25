"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Banknote, CalendarDays, Globe2, Hash, MapPinned, Package, Plane, ShoppingBag, Sparkles, Ticket, Users, Wand2 } from "lucide-react";
import { isCountryName, isCityName, normalizeCity, normalizeCountry } from "@/entities/company";
import {
  CATEGORY_LOOK,
  KIND_LOOK,
  PACKAGE_CURRENCIES,
  PACKAGE_KINDS,
  PACKAGE_TIERS,
  TRANSPORT_LOOK,
  TRANSPORT_MODES,
  categoriesFor,
  isPersonalCategory,
  isPilgrimage,
  isVisaKind,
  lookOf,
  suggestPackageCode,
  stayPlanNights,
  syncStaysWithDistricts,
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
import { emptyVisaOfferForm, type PackageFormValues } from "../model/form";
import { AddableChipSet } from "./addable-chips";
import { ChoiceGrid, Stepper, SwitchRow } from "./controls";
import { PersonalCustomerField } from "./personal-customer-field";

export function IdentityStep({ takenCodes }: { takenCodes: readonly string[] }) {
  const t = useTranslations("packages");
  const { control, setValue, getValues, clearErrors } = useFormContext<PackageFormValues>();
  const [kind, category, durationDays, nights, stays] = useWatch({
    control,
    name: ["kind", "category", "durationDays", "spec.nights", "spec.stays"],
  });
  const categories = categoriesFor(kind, category);

  function changeKind(next: PackageKind) {
    if (next === getValues("kind")) return;
    setValue("kind", next, { shouldDirty: true });
    if (!PACKAGE_TIERS.includes(getValues("category") as (typeof PACKAGE_TIERS)[number])) {
      setValue("category", "standard", { shouldDirty: true });
    }
    setValue("spec.visa.type", next === "hajj" ? "HAJJ_VISA" : next === "other" || next === "visa" ? "" : "UMRAH_VISA", { shouldDirty: true });
    if (next === "visa") {
      setValue("transportMode", "road", { shouldDirty: true });
      setValue(
        "visaOffers",
        getValues("visaOffers").length ? getValues("visaOffers") : [emptyVisaOfferForm("UMRAH_VISA")],
        { shouldDirty: true },
      );
    } else {
      setValue("visaOffers", [], { shouldDirty: true });
    }
    if (next === "other") {
      setValue("spec.visa.healthInsurance", false, { shouldDirty: true });
      setValue("spec.kit", [], { shouldDirty: true });
      setValue("spec.ziyarat", { makkah: [], madinah: [] }, { shouldDirty: true });
      setValue("spec.guidance.femaleGuide", false, { shouldDirty: true });
      setValue("spec.included", [], { shouldDirty: true });
      setValue("spec.requirements.mahram", false, { shouldDirty: true });
      setValue("spec.requirements.meningitis", false, { shouldDirty: true });
    } else {
      setValue("spec.services", [], { shouldDirty: true });
      setValue("spec.activities", [], { shouldDirty: true });
    }
    clearErrors("category");
  }

  function suggest() {
    const code = suggestPackageCode(getValues("kind"), getValues("category"), new Date().getFullYear(), takenCodes);
    setValue("code", code, { shouldDirty: true, shouldValidate: true });
  }

  return (
    <div className="space-y-3.5">
      <FormSection icon={Sparkles} tone="emerald" title={t("form.identity.category")} hint={t("form.identity.categoryHint")} testId="package-form-tier">
        <FormField
          control={control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <ChoiceGrid
                name="package-category"
                columns={4}
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  if (!isPersonalCategory(v)) {
                    setValue("customerId", "", { shouldDirty: true });
                    setValue("customerName", "", { shouldDirty: true });
                  }
                }}
                options={categories.map((c) => ({ value: c, label: t(`category.${c}`), hint: t(`categoryHint.${c}`), ...lookOf(CATEGORY_LOOK, c) }))}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      {isPersonalCategory(category) ? (
        <FormSection
          icon={Users}
          tone="violet"
          title={t("form.identity.customer")}
          hint={t("form.identity.customerHint")}
          testId="package-form-personal"
        >
          <PersonalCustomerField />
        </FormSection>
      ) : null}

      <FormSection icon={Ticket} tone="indigo" title={t("form.identity.kind")} hint={t("steps.identity.hint")} testId="package-form-kind">
        <ChoiceGrid
          name="package-kind"
          columns={4}
          value={kind}
          onChange={changeKind}
          options={PACKAGE_KINDS.map((k) => ({ value: k, label: t(`kind.${k}`), hint: t(`kindHint.${k}`), ...lookOf(KIND_LOOK, k) }))}
        />
      </FormSection>

      {kind === "other" ? <DestinationFields /> : null}

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
        title={isVisaKind(kind) ? t("form.identity.processing") : t("form.identity.duration")}
        hint={isVisaKind(kind) ? t("form.identity.processingHint") : t("form.identity.nightsSummary", { days: durationDays, nights: Math.max(0, durationDays - 1) })}
        testId="package-form-duration"
        aside={
          isPilgrimage(kind) && totalNights({ nights }) > 0 ? (
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11.5px] font-semibold text-sky-700">
              {t("card.split", { makkah: nights.makkah, madinah: nights.madinah })}
            </span>
          ) : kind === "other" && stayPlanNights({ stays }) > 0 ? (
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11.5px] font-semibold text-sky-700">
              {t("form.hotels.stayNights", { n: stayPlanNights({ stays }) })}
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
                <FormLabel>{isVisaKind(kind) ? t("form.identity.processing") : t("form.identity.duration")}</FormLabel>
                <Stepper value={field.value} onChange={field.onChange} min={1} max={60} suffix={t("form.identity.days")} label={isVisaKind(kind) ? t("form.identity.processing") : t("form.identity.duration")} testId="package-form-duration-stepper" />
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

      <FormSection icon={isVisaKind(kind) ? Banknote : Plane} tone="violet" title={isVisaKind(kind) ? t("form.identity.currency") : t("form.identity.transport")} testId="package-form-transport">
        {isVisaKind(kind) ? null : (
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
        )}
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

function DestinationFields() {
  const t = useTranslations("packages");
  const { control, setValue, getValues } = useFormContext<PackageFormValues>();

  function setDistricts(districts: string[]) {
    const clean = districts.map(normalizeCity).filter(isCityName);
    setValue("spec.destination.districts", clean, { shouldDirty: true, shouldValidate: true });
    setValue("spec.stays", syncStaysWithDistricts(getValues("spec.stays"), clean), { shouldDirty: true });
  }

  return (
    <FormSection icon={MapPinned} tone="teal" title={t("form.identity.destination")} hint={t("form.identity.destinationHint")} testId="package-form-destination">
      <FormField
        control={control}
        name="spec.destination.country"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("form.identity.country")}</FormLabel>
            <FormControl>
              <IconInput
                icon={Globe2}
                iconClassName="text-teal-500"
                {...field}
                onChange={(e) => field.onChange(normalizeCountry(e.target.value))}
                dir="auto"
                placeholder={t("form.identity.countryPh")}
                data-testid="package-form-country"
              />
            </FormControl>
            {field.value && !isCountryName(field.value) ? <p className="text-[12px] font-medium text-rose-600">{t("form.errors.country")}</p> : <FormMessage />}
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="spec.destination.districts"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("form.identity.districts")}</FormLabel>
            <AddableChipSet
              name="package-districts"
              tone="teal"
              values={field.value}
              onChange={setDistricts}
              addLabel={t("form.identity.addDistrict")}
              placeholder={t("form.identity.districtPh")}
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </FormSection>
  );
}
