"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import {
  emptyTripInterest,
  type Lead,
  type LeadOwner,
  type LeadRepository,
  type TripInterest,
} from "@/entities/lead";
import { createCustomerRepository } from "@/entities/customer";
import { createTourPackageRepository, type TourPackage } from "@/entities/tourpackage";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useMutationFeedback,
} from "@/shared/ui";
import { applyFieldErrors } from "@/shared/lib/form-errors";
import { cn } from "@/shared/lib/cn";

const NONE = "__none__";
const CURRENCIES = ["SAR", "USD", "EUR", "TRY", "AED", "GBP", "EGP", "PKR", "IDR", "MYR"];

/** Values a caller can prefill; interest amounts are in minor units. */
export type LeadPrefill = {
  fullName?: string;
  phone?: string;
  source?: string;
  notes?: string;
  interest?: TripInterest;
};

type Props = {
  repository: LeadRepository;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this lead; without it the dialog creates one. */
  lead?: Lead | null;
  prefill?: LeadPrefill;
  /** Form fields filled by AI, marked for review. */
  aiFields?: string[];
  onSaved: (lead: Lead) => void;
};

function makeSchema(t: (key: string) => string, creating: boolean) {
  return z
    .object({
      fullName: z.string().trim().min(2),
      phone: z.string().trim().min(6),
      source: z.string().optional(),
      ownerId: creating ? z.string().min(1) : z.string().optional(),
      customerId: z.string().optional(),
      notes: z.string().max(2000).optional(),
      travelDate: z.string().optional(),
      travelWindow: z.string().max(80).optional(),
      paxCount: z
        .string()
        .refine((v) => v === "" || (/^\d+$/.test(v) && +v >= 1 && +v <= 500), t("errors.pax")),
      budgetAmount: z
        .string()
        .refine((v) => v === "" || /^\d{1,10}([.,]\d{1,2})?$/.test(v.trim()), t("errors.budget")),
      budgetCurrency: z
        .string()
        .refine((v) => v === "" || /^[A-Za-z]{3}$/.test(v.trim()), t("errors.currency")),
      packageId: z.string().optional(),
      packageInterest: z.string().max(200).optional(),
    })
    .superRefine((v, ctx) => {
      if (v.budgetAmount.trim() && !v.budgetCurrency.trim()) {
        ctx.addIssue({ code: "custom", path: ["budgetCurrency"], message: t("errors.currencyRequired") });
      }
    });
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>;
const FIELDS = [
  "fullName", "phone", "source", "ownerId", "customerId", "notes", "travelDate", "travelWindow",
  "paxCount", "budgetAmount", "budgetCurrency", "packageId", "packageInterest",
] as const satisfies readonly (keyof FormValues)[];

function toValues(lead: Lead | null | undefined, prefill: LeadPrefill | undefined): FormValues {
  const interest = prefill?.interest ?? lead?.interest ?? emptyTripInterest();
  return {
    fullName: prefill?.fullName ?? lead?.fullName ?? "",
    phone: prefill?.phone ?? lead?.phone ?? "",
    source: prefill?.source ?? lead?.source ?? "",
    ownerId: "",
    customerId: "",
    notes: prefill?.notes ?? lead?.notes ?? "",
    travelDate: interest.travelDate ?? "",
    travelWindow: interest.travelWindow,
    paxCount: interest.paxCount != null ? String(interest.paxCount) : "",
    budgetAmount: interest.budgetAmount != null ? String(interest.budgetAmount / 100) : "",
    budgetCurrency: interest.budgetCurrency,
    packageId: interest.packageId ?? "",
    packageInterest: interest.packageInterest,
  };
}

function toInterest(v: FormValues): TripInterest {
  const budget = v.budgetAmount.trim();
  return {
    travelDate: v.travelDate || null,
    travelWindow: (v.travelWindow ?? "").trim(),
    paxCount: v.paxCount ? Number(v.paxCount) : null,
    budgetAmount: budget ? Math.round(Number(budget.replace(",", ".")) * 100) : null,
    budgetCurrency: v.budgetCurrency.trim().toUpperCase(),
    packageId: v.packageId || null,
    packageInterest: (v.packageInterest ?? "").trim(),
  };
}

export function LeadFormDialog({
  repository,
  open,
  onOpenChange,
  lead,
  prefill,
  aiFields = [],
  onSaved,
}: Props) {
  const t = useTranslations("pipeline");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const creating = !lead;
  const schema = useMemo(() => makeSchema(t, creating), [t, creating]);
  const [owners, setOwners] = useState<LeadOwner[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toValues(lead, prefill),
  });
  const ai = useMemo(() => new Set(aiFields), [aiFields]);

  useEffect(() => {
    if (open) form.reset(toValues(lead, prefill));
  }, [open, lead, prefill, form]);

  useEffect(() => {
    if (!open) return;
    void createTourPackageRepository()
      .listPackages(true)
      .then(setPackages)
      .catch(() => setPackages([]));
    if (!creating) return;
    void repository
      .listOwners()
      .then((list) => {
        setOwners(list);
        if (list[0] && !form.getValues("ownerId")) form.setValue("ownerId", list[0].id);
      })
      .catch((err: unknown) => feedback.error(err));
    void createCustomerRepository()
      .search("")
      .then((rows) => setCustomers(rows.map((c) => ({ id: c.id, name: c.fullName }))))
      .catch(() => setCustomers([]));
  }, [open, creating, repository, form, feedback]);

  async function onSubmit(values: FormValues) {
    const interest = toInterest(values);
    let saved: Lead;
    try {
      if (lead) {
        saved = await repository.update(lead.id, {
          fullName: values.fullName,
          phone: values.phone,
          notes: values.notes ?? "",
          interest,
        });
      } else {
        const owner = owners.find((o) => o.id === values.ownerId);
        if (!owner) return;
        saved = await repository.create({
          fullName: values.fullName,
          phone: values.phone,
          source: values.source,
          notes: values.notes,
          ownerId: owner.id,
          ownerName: owner.name,
          customerId: values.customerId || null,
          interest,
        });
      }
    } catch (err) {
      if (!applyFieldErrors(form.setError, err, FIELDS)) feedback.error(err);
      return;
    }
    onSaved(saved);
    onOpenChange(false);
  }

  const label = (field: string, text: string) => (
    <FormLabel className="flex items-center gap-1.5">
      {text}
      {ai.has(field) ? <AIBadge label={t("aiBadge")} /> : null}
    </FormLabel>
  );
  const aiRing = (field: string) =>
    ai.has(field) ? "border-violet-300 bg-violet-50/40 focus-visible:ring-violet-500/20" : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{creating ? t("create") : t("editLead")}</DialogTitle>
          <DialogDescription>{creating ? t("createHint") : t("editHint")}</DialogDescription>
        </DialogHeader>
        {ai.size > 0 ? (
          <div className="flex items-start gap-3 rounded-2xl border border-violet-200/70 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-sky-50 px-4 py-3 text-sm text-violet-900">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden />
            <p>{t("aiBanner")}</p>
          </div>
        ) : null}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Section title={t("sections.contact")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      {label("full_name", t("fields.name"))}
                      <FormControl>
                        <Input {...field} className={aiRing("full_name")} />
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
                        <Input {...field} dir="ltr" inputMode="tel" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {creating ? (
                  <>
                    <FormField
                      control={form.control}
                      name="source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("fields.source")}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ownerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("fields.owner")}</FormLabel>
                          <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {owners.map((o) => (
                                <SelectItem key={o.id} value={o.id}>
                                  {o.name}
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
                      name="customerId"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>{t("fields.customer")}</FormLabel>
                          <Select
                            value={field.value || NONE}
                            onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("optionalCustomer")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={NONE}>{t("noCustomer")}</SelectItem>
                              {customers.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : null}
              </div>
            </Section>

            <Section title={t("sections.trip")}>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="travelDate"
                  render={({ field }) => (
                    <FormItem>
                      {label("travel_date", t("fields.travelDate"))}
                      <FormControl>
                        <Input type="date" {...field} className={aiRing("travel_date")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="travelWindow"
                  render={({ field }) => (
                    <FormItem>
                      {label("travel_window", t("fields.travelWindow"))}
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("fields.travelWindowHint")}
                          className={aiRing("travel_window")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paxCount"
                  render={({ field }) => (
                    <FormItem>
                      {label("pax_count", t("fields.travellers"))}
                      <FormControl>
                        <Input
                          {...field}
                          inputMode="numeric"
                          dir="ltr"
                          className={aiRing("pax_count")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Section>

            <Section title={t("sections.budgetPackage")}>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="budgetAmount"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      {label("budget_amount", t("fields.budget"))}
                      <FormControl>
                        <Input
                          {...field}
                          inputMode="decimal"
                          dir="ltr"
                          className={aiRing("budget_amount")}
                        />
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
                      {label("budget_amount", t("fields.currency"))}
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          list="lead-form-currencies"
                          maxLength={3}
                          dir="ltr"
                          placeholder="SAR"
                          className={aiRing("budget_amount")}
                        />
                      </FormControl>
                      <datalist id="lead-form-currencies">
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="packageId"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-3">
                      {label("package_id", t("fields.package"))}
                      <Select
                        value={field.value || NONE}
                        onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                      >
                        <FormControl>
                          <SelectTrigger className={aiRing("package_id")}>
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
                    <FormItem className="sm:col-span-3">
                      {label("package_interest", t("fields.packageInterest"))}
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("fields.packageInterestHint")}
                          className={aiRing("package_interest")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Section>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  {label("notes", t("fields.notes"))}
                  <FormControl>
                    <Textarea {...field} rows={3} className={cn("min-h-[80px]", aiRing("notes"))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {tc("save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</legend>
      {children}
    </fieldset>
  );
}

function AIBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-white">
      <Sparkles className="h-2.5 w-2.5" aria-hidden />
      {label}
    </span>
  );
}
