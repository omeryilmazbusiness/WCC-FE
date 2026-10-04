"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Contact, Landmark, Mail, MessageCircle, Receipt, UserRound } from "lucide-react";
import { LEAD_SEGMENTS, SEGMENT_LOOK } from "@/entities/lead";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui";
import type { LeadFormValues } from "../../model/form";
import { useAiField } from "../parts/ai-fields";
import { ChoiceChips } from "../parts/choice-chips";
import { FormSection, GroupLabel } from "../parts/form-section";
import { IconInput } from "../parts/icon-input";

export function ContactSection() {
  const t = useTranslations("pipeline.leadForm");
  const form = useFormContext<LeadFormValues>();
  const segment = useWatch({ control: form.control, name: "segment" });
  const name = useAiField("full_name");

  return (
    <FormSection icon={Contact} tone="sky" title={t("sections.contact.title")} hint={t("sections.contact.hint")} testId="lead-form-contact">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel className="flex items-center gap-1.5">
                {t("fields.fullName")}
                {name.badge}
              </FormLabel>
              <FormControl>
                <IconInput icon={UserRound} {...field} placeholder={t("fields.fullNamePh")} autoComplete="name" className={name.ring} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.phone")}</FormLabel>
              <FormControl>
                <IconInput icon={MessageCircle} iconClassName="text-emerald-500" {...field} dir="ltr" inputMode="tel" autoComplete="tel" placeholder="+90 532 000 00 00" />
              </FormControl>
              <p className="text-[11.5px] text-zinc-400">{t("fields.phoneHint")}</p>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.email")}</FormLabel>
              <FormControl>
                <IconInput icon={Mail} iconClassName="text-violet-500" {...field} dir="ltr" type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" />
              </FormControl>
              <p className="text-[11.5px] text-zinc-400">{t("fields.emailHint")}</p>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div>
        <GroupLabel>{t("fields.segment")}</GroupLabel>
        <FormField
          control={form.control}
          name="segment"
          render={({ field }) => (
            <ChoiceChips
              testId="lead-form-segment"
              aria-label={t("fields.segment")}
              value={field.value}
              onChange={(v) => v && field.onChange(v)}
              options={LEAD_SEGMENTS.map((s) => ({ value: s, label: t(`segments.${s}`), ...SEGMENT_LOOK[s] }))}
            />
          )}
        />
      </div>

      {segment === "b2b" ? (
      <div
        className="grid gap-4 rounded-[20px] bg-indigo-50/50 p-3.5 ring-1 ring-inset ring-indigo-100 sm:grid-cols-2"
        data-testid="lead-form-company"
      >
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>{t("fields.companyName")}</FormLabel>
              <FormControl>
                <IconInput icon={SEGMENT_LOOK.b2b.icon} iconClassName="text-indigo-500" {...field} autoComplete="organization" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="taxNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.taxNumber")}</FormLabel>
              <FormControl>
                <IconInput icon={Receipt} {...field} dir="ltr" onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="taxOffice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.taxOffice")}</FormLabel>
              <FormControl>
                <IconInput icon={Landmark} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      ) : null}
    </FormSection>
  );
}
