"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  BookUser,
  CalendarDays,
  Check,
  Contact,
  Flag,
  Globe2,
  IdCard,
  Mail,
  MessageCircle,
  StickyNote,
  UserRound,
  UserRoundPen,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import {
  CustomerAvatar,
  PASSPORT_LOOK,
  passportStatus,
  type Customer,
  type CustomerRepository,
  type DuplicateMatch,
} from "@/entities/customer";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { applyFieldErrors } from "@/shared/lib/form-errors";
import { localDay } from "@/shared/lib/day";
import { formatDay } from "@/shared/lib/format";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
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
  FormSection,
  IconInput,
  Textarea,
  TONES,
  useMutationFeedback,
} from "@/shared/ui";
import {
  CUSTOMER_FORM_FIELDS,
  customerFormDefaults,
  customerFormSchema,
  toCreateInput,
  toUpdateInput,
  type CustomerFormValues,
} from "../model/form";

export type CustomerSaved = { customer: Customer; created: boolean; duplicates: number };

type Props = {
  repository: CustomerRepository;
  /** Edits this customer; creates a new one when absent. */
  customer?: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (result: CustomerSaved) => void;
};

/** iOS-style create / edit sheet for a customer profile. */
export function CustomerFormDialog({ repository, customer, open, onOpenChange, onSaved }: Props) {
  const t = useTranslations("customers.form");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const creating = !customer;
  const schema = useMemo(() => customerFormSchema((key) => t(key)), [t]);
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: customerFormDefaults(customer),
  });

  useEffect(() => {
    if (open) form.reset(customerFormDefaults(customer));
  }, [open, customer, form]);

  async function onSubmit(values: CustomerFormValues) {
    try {
      if (customer) {
        onSaved({ customer: await repository.update(customer.id, toUpdateInput(values)), created: false, duplicates: 0 });
      } else {
        const res = await repository.create(toCreateInput(values));
        onSaved({ customer: res.customer, created: true, duplicates: res.duplicateWarn ? (res.duplicates?.length ?? 0) : 0 });
      }
      onOpenChange(false);
    } catch (err) {
      if (!applyFieldErrors(form.setError, err, CUSTOMER_FORM_FIELDS)) {
        feedback.error(err, creating ? t("createError") : t("saveError"));
      }
    }
  }

  const HeaderIcon = creating ? UserRoundPlus : UserRoundPen;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[94vh] max-w-2xl flex-col gap-0 overflow-hidden bg-[#f4f4f7] p-0 sm:p-0"
        data-testid="customer-form"
      >
        <DialogHeader className="border-b border-zinc-200/70 bg-white/80 px-5 pb-4 pt-5 backdrop-blur sm:px-7">
          <div className="flex items-center gap-4 pe-8">
            {customer ? (
              <CustomerAvatar id={customer.id} name={customer.fullName} size="lg" />
            ) : (
              <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]", TONES.indigo.gradient)} aria-hidden>
                <HeaderIcon className="h-7 w-7" strokeWidth={2.1} />
              </span>
            )}
            <div className="min-w-0">
              <DialogTitle className="text-[21px] tracking-tight">{creating ? t("createTitle") : t("editTitle")}</DialogTitle>
              <DialogDescription className="mt-1.5 text-[13px]">
                {creating ? t("createSubtitle") : t("editSubtitle")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
            <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              <IdentitySection control={form.control} />
              <ContactSection control={form.control} repository={repository} checkDuplicates={creating && open} />
              <DocumentsSection control={form.control} customer={customer ?? null} />
              <NotesSection control={form.control} />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-200/70 bg-white/90 px-5 py-3.5 backdrop-blur sm:px-7">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="gap-1.5" data-testid="customer-form-submit">
                <Check className="h-4 w-4" strokeWidth={2.6} aria-hidden />
                {creating ? t("submitCreate") : t("submitEdit")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type SectionProps = { control: Control<CustomerFormValues> };

function IdentitySection({ control }: SectionProps) {
  const t = useTranslations("customers.form");
  return (
    <FormSection icon={UserRound} tone="sky" title={t("sections.identity.title")} hint={t("sections.identity.hint")} testId="customer-form-identity">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="fullName"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>{t("fields.fullName")}</FormLabel>
              <FormControl>
                <IconInput icon={UserRound} {...field} autoComplete="name" placeholder={t("fields.fullNamePh")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="fullNameAr"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>{t("fields.fullNameAr")}</FormLabel>
              <FormControl>
                <IconInput icon={Globe2} {...field} dir="rtl" lang="ar" placeholder="الاسم الكامل" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.dateOfBirth")}</FormLabel>
              <FormControl>
                <IconInput icon={CalendarDays} iconClassName="text-sky-500" type="date" max={localDay()} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="nationality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.nationality")}</FormLabel>
              <FormControl>
                <IconInput icon={Flag} iconClassName="text-rose-500" {...field} autoComplete="country-name" placeholder={t("fields.nationalityPh")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormSection>
  );
}

function ContactSection({
  control,
  repository,
  checkDuplicates,
}: SectionProps & { repository: CustomerRepository; checkDuplicates: boolean }) {
  const t = useTranslations("customers.form");
  const [phone, email] = useWatch({ control, name: ["phone", "email"] });
  const probe = useDebouncedValue(`${phone.trim()}|${email.trim()}`, 450);
  const [matches, setMatches] = useState<DuplicateMatch[]>([]);

  useEffect(() => {
    const [p, e] = probe.split("|");
    const usable = p.replace(/\D/g, "").length >= 6 || /.+@.+\..+/.test(e);
    if (!checkDuplicates || !usable) {
      setMatches([]);
      return;
    }
    let current = true;
    repository
      .checkDuplicates({ phone: p || undefined, email: e || undefined })
      .then((rows) => {
        if (current) setMatches(rows.slice(0, 3));
      })
      .catch(() => {
        if (current) setMatches([]);
      });
    return () => {
      current = false;
    };
  }, [probe, checkDuplicates, repository]);

  return (
    <FormSection icon={Contact} tone="emerald" title={t("sections.contact.title")} hint={t("sections.contact.hint")} testId="customer-form-contact">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.phone")}</FormLabel>
              <FormControl>
                <IconInput icon={MessageCircle} iconClassName="text-emerald-500" {...field} dir="ltr" inputMode="tel" autoComplete="tel" placeholder="+966 50 000 0000" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.email")}</FormLabel>
              <FormControl>
                <IconInput icon={Mail} iconClassName="text-violet-500" {...field} dir="ltr" type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {matches.length ? (
        <div className="rounded-[20px] border border-amber-200/70 bg-amber-50/70 p-3" data-testid="customer-form-duplicates" role="status">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-amber-900">
            <UsersRound className="h-4 w-4" aria-hidden />
            {t("duplicates.title", { count: matches.length })}
          </p>
          <ul className="mt-2 space-y-1.5">
            {matches.map((m) => (
              <li key={m.customer.id}>
                <Link
                  href={routes.customer(m.customer.id)}
                  className="flex items-center gap-3 rounded-2xl bg-white/90 p-2 ring-1 ring-inset ring-amber-100 transition hover:bg-white"
                >
                  <CustomerAvatar id={m.customer.id} name={m.customer.fullName} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-start text-[13.5px] font-semibold text-zinc-900">
                      <bdi>{m.customer.fullName}</bdi>
                    </span>
                    <span className="block truncate text-[11.5px] text-zinc-500">
                      {m.reasons.map((r) => (t.has(`duplicates.reasons.${r}`) ? t(`duplicates.reasons.${r as "phone"}`) : r)).join(" · ")}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-zinc-400 rtl:rotate-180" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </FormSection>
  );
}

function DocumentsSection({ control, customer }: SectionProps & { customer: Customer | null }) {
  const t = useTranslations("customers.form");
  const tp = useTranslations("customers.passportStatus");
  const locale = useLocale();
  const [passportNo, expires] = useWatch({ control, name: ["passportNo", "passportExpiresAt"] });
  const status = passportStatus(
    { passportLast4: passportNo.trim() || customer?.passportLast4 || "", passportExpiresAt: expires || null },
    localDay(),
  );
  const look = PASSPORT_LOOK[status];
  const StatusIcon = look.icon;

  return (
    <FormSection
      icon={BookUser}
      tone="violet"
      title={t("sections.documents.title")}
      hint={t("sections.documents.hint")}
      testId="customer-form-documents"
      aside={
        status !== "missing" ? (
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold", TONES[look.tone].soft)}>
            <StatusIcon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
            {tp(status)}
          </span>
        ) : null
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="passportNo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.passportNo")}</FormLabel>
              <FormControl>
                <IconInput
                  icon={IdCard}
                  iconClassName="text-violet-500"
                  {...field}
                  dir="ltr"
                  autoComplete="off"
                  spellCheck={false}
                  className="uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal"
                  placeholder={customer?.passportNo ? t("fields.passportKeep", { masked: customer.passportNo }) : "U12345678"}
                />
              </FormControl>
              {customer?.passportNo ? <p className="text-[11.5px] text-zinc-400">{t("fields.passportKeepHint")}</p> : null}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="passportExpiresAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fields.passportExpiresAt")}</FormLabel>
              <FormControl>
                <IconInput icon={CalendarDays} iconClassName="text-violet-500" type="date" {...field} />
              </FormControl>
              {status === "expiring" || status === "expired" ? (
                <p className={cn("text-[11.5px] font-medium", TONES[look.tone].text)}>
                  {status === "expired"
                    ? t("fields.passportExpiredHint")
                    : t("fields.passportExpiringHint", { date: formatDay(expires, locale) })}
                </p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormSection>
  );
}

function NotesSection({ control }: SectionProps) {
  const t = useTranslations("customers.form");
  return (
    <FormSection icon={StickyNote} tone="amber" title={t("sections.notes.title")} hint={t("sections.notes.hint")} testId="customer-form-notes">
      <FormField
        control={control}
        name="specialRequirements"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("fields.specialRequirements")}</FormLabel>
            <FormControl>
              <Textarea {...field} dir="auto" rows={2} placeholder={t("fields.specialRequirementsPh")} className="min-h-[72px] rounded-2xl text-[14.5px]" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("fields.notes")}</FormLabel>
            <FormControl>
              <Textarea {...field} dir="auto" rows={3} placeholder={t("fields.notesPh")} className="min-h-[96px] rounded-2xl text-[14.5px]" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormSection>
  );
}
