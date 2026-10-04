"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Check, PencilLine, Sparkles, UserPlus } from "lucide-react";
import type { Lead, LeadOwner, LeadRepository } from "@/entities/lead";
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
  TONES,
  useMutationFeedback,
} from "@/shared/ui";
import { applyFieldErrors } from "@/shared/lib/form-errors";
import { cn } from "@/shared/lib/cn";
import {
  LEAD_FORM_FIELDS,
  makeLeadSchema,
  toLeadFormValues,
  toLeadProfile,
  toTripInterest,
  type LeadFormValues,
  type LeadPrefill,
} from "../model/form";
import { AiFieldsProvider } from "./parts/ai-fields";
import { ContactSection } from "./sections/contact-section";
import { PipelineSection } from "./sections/pipeline-section";
import { PreferencesSection } from "./sections/preferences-section";
import { ScopeSection } from "./sections/scope-section";
import { TravellersSection } from "./sections/travellers-section";

export type { LeadPrefill };

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

export function LeadFormDialog({ repository, open, onOpenChange, lead, prefill, aiFields = [], onSaved }: Props) {
  const t = useTranslations("pipeline");
  const tf = useTranslations("pipeline.leadForm");
  const tc = useTranslations("common");
  const feedback = useMutationFeedback();
  const creating = !lead;
  const schema = useMemo(() => makeLeadSchema((key) => tf(key), creating), [tf, creating]);
  const [owners, setOwners] = useState<LeadOwner[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toLeadFormValues(lead, prefill),
  });
  const ai = useMemo(() => new Set(aiFields), [aiFields]);

  useEffect(() => {
    if (open) form.reset(toLeadFormValues(lead, prefill));
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

  async function onSubmit(values: LeadFormValues) {
    const profile = toLeadProfile(values);
    const interest = toTripInterest(values);
    let saved: Lead;
    try {
      if (lead) {
        saved = await repository.update(lead.id, {
          fullName: values.fullName,
          phone: values.phone,
          notes: values.notes,
          profile,
          interest,
        });
      } else {
        const owner = owners.find((o) => o.id === values.ownerId);
        if (!owner) return;
        saved = await repository.create({
          fullName: values.fullName,
          phone: values.phone,
          source: values.source.trim(),
          notes: values.notes,
          ownerId: owner.id,
          ownerName: owner.name,
          customerId: values.customerId || null,
          profile,
          interest,
        });
      }
    } catch (err) {
      if (!applyFieldErrors(form.setError, err, LEAD_FORM_FIELDS)) feedback.error(err);
      return;
    }
    onSaved(saved);
    onOpenChange(false);
  }

  const body = useRef<HTMLDivElement>(null);
  const revealPending = useRef(false);
  const revealFirstError = () => {
    revealPending.current = true;
  };
  useEffect(() => {
    if (!revealPending.current) return;
    const alert = body.current?.querySelector('[role="alert"]');
    if (!alert) return;
    revealPending.current = false;
    alert.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  const HeaderIcon = creating ? UserPlus : PencilLine;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] max-w-3xl flex-col gap-0 overflow-hidden bg-[#f4f4f7] p-0 sm:p-0" data-testid="lead-form">
        <DialogHeader className="border-b border-zinc-200/70 bg-white/80 px-5 pb-4 pt-5 backdrop-blur sm:px-7">
          <div className="flex items-center gap-4 pe-8">
            <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]", TONES.sky.gradient)} aria-hidden>
              <HeaderIcon className="h-7 w-7" strokeWidth={2.1} />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-[21px] tracking-tight">{creating ? tf("createTitle") : tf("editTitle")}</DialogTitle>
              <DialogDescription className="mt-1.5 text-[13px]">{creating ? tf("createSubtitle") : tf("editSubtitle")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, revealFirstError)} className="flex min-h-0 flex-1 flex-col" noValidate>
            <AiFieldsProvider fields={ai} label={t("aiBadge")}>
              <div ref={body} className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                {ai.size > 0 ? (
                  <div className="flex items-start gap-3 rounded-[20px] border border-violet-200/70 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-sky-50 px-4 py-3 text-sm text-violet-900">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden />
                    <p>{t("aiBanner")}</p>
                  </div>
                ) : null}
                <ContactSection />
                <ScopeSection />
                <TravellersSection />
                <PreferencesSection packages={packages} />
                <PipelineSection creating={creating} owners={owners} customers={customers} />
              </div>
            </AiFieldsProvider>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-200/70 bg-white/90 px-5 py-3.5 backdrop-blur sm:px-7">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} data-testid="lead-form-submit" className="gap-1.5">
                <Check className="h-4 w-4" strokeWidth={2.6} aria-hidden />
                {creating ? tf("submitCreate") : tf("submitEdit")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
