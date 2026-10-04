"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { Package, Wallet } from "lucide-react";
import {
  FLIGHT_PREFERENCES,
  INTENT_LOOK,
  LEAD_INTENTS,
  PREFERENCE_LOOK,
  TRIP_PREFERENCES,
} from "@/entities/lead";
import type { TourPackage } from "@/entities/tourpackage";
import { cn } from "@/shared/lib/cn";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import { needsCabin, type LeadFormValues } from "../../model/form";
import { useAiField } from "../parts/ai-fields";
import { ChoiceChips } from "../parts/choice-chips";
import { FormSection, GroupLabel } from "../parts/form-section";
import { IconInput } from "../parts/icon-input";

const NONE = "__none__";
const CURRENCIES = ["TRY", "USD", "EUR", "GBP", "SAR", "AED", "SYP", "EGP", "PKR", "IDR", "MYR"];

export function PreferencesSection({ packages }: { packages: TourPackage[] }) {
  const t = useTranslations("pipeline.leadForm");
  const locale = useLocale();
  const form = useFormContext<LeadFormValues>();
  const [services, currency] = useWatch({ control: form.control, name: ["services", "budgetCurrency"] });
  const budget = useAiField("budget_amount");
  const pkg = useAiField("package_id");
  const interest = useAiField("package_interest");
  const flight = needsCabin(services);
  const preferences = TRIP_PREFERENCES.filter((p) => flight || !FLIGHT_PREFERENCES.includes(p));
  const currencies = currency && !CURRENCIES.includes(currency) ? [currency, ...CURRENCIES] : CURRENCIES;

  return (
    <FormSection icon={Wallet} tone="emerald" title={t("sections.preferences.title")} hint={t("sections.preferences.hint")} testId="lead-form-preferences">
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <FormField
          control={form.control}
          name="budgetAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                {t("fields.budget")}
                {budget.badge}
              </FormLabel>
              <FormControl>
                <IconInput icon={Wallet} iconClassName="text-emerald-500" {...field} inputMode="decimal" dir="ltr" placeholder="25000" className={budget.ring} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="budgetCurrency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.currency")}</FormLabel>
              <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                <FormControl>
                  <SelectTrigger className={cn("h-12", budget.ring)} data-testid="lead-form-currency">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {currencies.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="packageId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                {t("fields.package")}
                {pkg.badge}
              </FormLabel>
              <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                <FormControl>
                  <SelectTrigger className={cn("h-12", pkg.ring)}>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NONE}>{t("fields.packageNone")}</SelectItem>
                  {packages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} · {locale === "ar" && p.nameAr ? p.nameAr : p.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="packageInterest"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                {t("fields.packageInterest")}
                {interest.badge}
              </FormLabel>
              <FormControl>
                <IconInput icon={Package} iconClassName="text-amber-500" {...field} placeholder={t("fields.packageInterestPh")} className={interest.ring} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div>
        <GroupLabel>{t("fields.preferences")}</GroupLabel>
        <FormField
          control={form.control}
          name="preferences"
          render={({ field }) => (
            <ChoiceChips
              multiple
              testId="lead-form-preferences-chips"
              aria-label={t("fields.preferences")}
              value={field.value}
              onChange={field.onChange}
              options={preferences.map((p) => ({ value: p, label: t(`preferences.${p}`), ...PREFERENCE_LOOK[p] }))}
            />
          )}
        />
      </div>

      <div>
        <GroupLabel>{t("fields.intent")}</GroupLabel>
        <FormField
          control={form.control}
          name="intent"
          render={({ field }) => (
            <ChoiceChips
              clearable
              testId="lead-form-intent"
              aria-label={t("fields.intent")}
              value={field.value}
              onChange={field.onChange}
              options={LEAD_INTENTS.map((i) => ({ value: i, label: t(`intents.${i}`), ...INTENT_LOOK[i] }))}
            />
          )}
        />
      </div>
    </FormSection>
  );
}
