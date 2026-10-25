"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Stamp, Trash2 } from "lucide-react";
import { VISA_LOOK, VISA_TYPES, lookOf } from "@/entities/tourpackage";
import { useCan } from "@/entities/viewer";
import { formatMoney } from "@/shared/lib/format";
import { parseMoneyInput } from "@/shared/lib/money";
import { Button, FormControl, FormField, FormItem, FormLabel, FormMessage, FormSection, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@/shared/ui";
import { emptyVisaOfferForm, type PackageFormValues } from "../model/form";
import { MoneyInput, Stepper, SwitchRow } from "./controls";

/** One card per visa type: company price, margin, selling price, processing. */
export function VisaOffersEditor() {
  const t = useTranslations("packages");
  const locale = useLocale();
  const canPrice = useCan("hotels.pricing");
  const { control, formState } = useFormContext<PackageFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "visaOffers" });
  const [currency, offers] = useWatch({ control, name: ["baseCurrency", "visaOffers"] });
  const taken = new Set((offers ?? []).map((o) => o.type).filter(Boolean));
  const leftover = VISA_TYPES.filter((type) => !taken.has(type));
  const visaErr = formState.errors.visaOffers as { message?: string; root?: { message?: string } } | undefined;
  const listError = visaErr?.message || visaErr?.root?.message || null;

  return (
    <FormSection
      icon={Stamp}
      tone="rose"
      title={t("form.services.visaOffers")}
      hint={t("form.services.visaOffersHint")}
      testId="package-form-visa-offers"
    >
      {listError ? <p className="rounded-2xl bg-rose-50 px-3.5 py-2.5 text-[13px] font-semibold text-rose-700">{listError}</p> : null}
      {fields.length === 0 ? (
        <p className="rounded-[20px] bg-rose-50/70 px-4 py-6 text-center text-[13.5px] font-semibold text-zinc-600">{t("form.services.visaOffersEmpty")}</p>
      ) : (
        <ul className="space-y-3">
          {fields.map((field, i) => {
            const net = parseMoneyInput(offers?.[i]?.net ?? "") ?? 0;
            const sell = parseMoneyInput(offers?.[i]?.sell ?? "") ?? 0;
            const look = lookOf(VISA_LOOK, offers?.[i]?.type ?? "");
            return (
              <li key={field.id} className="rounded-[22px] bg-white px-4 py-4 ring-1 ring-rose-100" data-testid={`package-form-visa-offer-${i}`}>
                <div className="flex items-start justify-between gap-3">
                  <FormField
                    control={control}
                    name={`visaOffers.${i}.type`}
                    render={({ field: typeField }) => (
                      <FormItem className="min-w-0 flex-1">
                        <FormLabel>{t("form.services.visaType")}</FormLabel>
                        <Select value={typeField.value || undefined} onValueChange={typeField.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-2xl" data-testid={`package-form-visa-type-${i}`}>
                              <SelectValue placeholder={t("form.services.visaTypePh")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {VISA_TYPES.filter((type) => type === typeField.value || !taken.has(type)).map((type) => (
                              <SelectItem key={type} value={type}>
                                {t(`visa.${type}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="ghost" className="mt-7 h-11 px-2.5 text-rose-600" onClick={() => remove(i)} data-testid={`package-form-visa-remove-${i}`}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
                <div className={`mt-3 grid gap-3 ${canPrice ? "sm:grid-cols-2" : ""}`}>
                  {canPrice ? (
                  <FormField
                    control={control}
                    name={`visaOffers.${i}.net`}
                    render={({ field: moneyField }) => (
                      <FormItem>
                        <FormLabel>{t("form.services.visaNet")}</FormLabel>
                        <FormControl>
                          <MoneyInput value={moneyField.value ?? ""} onChange={moneyField.onChange} currency={currency} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  ) : null}
                  <FormField
                    control={control}
                    name={`visaOffers.${i}.sell`}
                    render={({ field: moneyField }) => (
                      <FormItem>
                        <FormLabel>{t("form.services.visaSell")}</FormLabel>
                        <FormControl>
                          <MoneyInput value={moneyField.value ?? ""} onChange={moneyField.onChange} currency={currency} />
                        </FormControl>
                        <p className="text-[11.5px] font-medium text-zinc-500">
                          {t("form.services.visaSellHint", { amount: formatMoney(sell || net, locale, currency) })}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={control}
                    name={`visaOffers.${i}.processingDays`}
                    render={({ field: daysField }) => (
                      <FormItem>
                        <FormLabel>{t("form.identity.processing")}</FormLabel>
                        <Stepper value={Number(daysField.value) || 0} onChange={daysField.onChange} min={0} max={90} suffix={t("form.identity.days")} label={t("form.identity.processing")} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name={`visaOffers.${i}.healthInsurance`}
                    render={({ field: insField }) => (
                      <div className="self-end">
                        <SwitchRow
                          icon={look.icon}
                          tone="rose"
                          label={t("form.services.healthInsurance")}
                          hint={t("form.services.healthInsuranceHint")}
                          checked={insField.value}
                          onChange={insField.onChange}
                        />
                      </div>
                    )}
                  />
                </div>
                <FormField
                  control={control}
                  name={`visaOffers.${i}.notes`}
                  render={({ field: notesField }) => (
                    <FormItem className="mt-3">
                      <FormLabel>{t("form.services.visaNotes")}</FormLabel>
                      <FormControl>
                        <Textarea {...notesField} rows={2} className="min-h-[60px] rounded-2xl text-[14px]" placeholder={t("form.services.visaNotesPh")} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </li>
            );
          })}
        </ul>
      )}
      {leftover.length ? (
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full gap-2 rounded-[18px]"
          onClick={() => append(emptyVisaOfferForm(leftover[0]))}
          data-testid="package-form-visa-add"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t("form.services.addVisaType")}
        </Button>
      ) : null}
    </FormSection>
  );
}
