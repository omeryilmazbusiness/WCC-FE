"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm, useFormContext, type FieldErrors, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Hotel,
  Loader2,
  Package,
  PackagePlus,
  Receipt,
  Route,
  Sparkles,
  Plane,
  type LucideIcon,
} from "lucide-react";
import type { PricingTier, TourPackage, TourPackageRepository } from "@/entities/tourpackage";
import { cn } from "@/shared/lib/cn";
import { applyFieldErrors } from "@/shared/lib/form-errors";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  TONES,
  useMutationFeedback,
  useToast,
  type Tone,
} from "@/shared/ui";
import { packageFormDefaults, packageFormSchema, toPackageInput, type PackageFormValues } from "../model/form";
import { PACKAGE_STEPS, errorPaths, firstErrorStep, stepOfPath, type PackageStep } from "../model/steps";
import { HotelsStep } from "./hotels-step";
import { IdentityStep } from "./identity-step";
import { ItineraryStep } from "./itinerary-step";
import { LogisticsStep } from "./logistics-step";
import { PricingStep } from "./pricing-step";
import { RequirementsStep } from "./requirements-step";
import { ServicesStep } from "./services-step";

const STEP_LOOK: Record<PackageStep, { icon: LucideIcon; tone: Tone }> = {
  identity: { icon: Package, tone: "indigo" },
  hotels: { icon: Hotel, tone: "emerald" },
  pricing: { icon: Receipt, tone: "amber" },
  logistics: { icon: Plane, tone: "sky" },
  services: { icon: Sparkles, tone: "violet" },
  itinerary: { icon: Route, tone: "teal" },
  requirements: { icon: ClipboardCheck, tone: "rose" },
};

/** Fields the backend may name in `error.details`, mapped onto form paths. */
const SERVER_FIELDS = ["code", "nameEn", "nameAr", "description", "category", "durationDays", "capacityTotal", "baseCurrency"] as const;

type Props = {
  repository: TourPackageRepository;
  /** Edits this package; creates a new one when absent. */
  pkg?: TourPackage | null;
  /** Codes already in use, for the code suggestion. */
  takenCodes?: readonly string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (pkg: TourPackage, created: boolean) => void;
};

/** iOS-style seven-step sheet for the full Umrah / Hajj product: saves from any step. */
export function PackageFormDialog({ repository, pkg, takenCodes = [], open, onOpenChange, onSaved }: Props) {
  const t = useTranslations("packages");
  const feedback = useMutationFeedback();
  const toast = useToast();
  const creating = !pkg;
  const schema = useMemo(() => packageFormSchema((key) => t(`form.${key}`)), [t]);
  const form = useForm<PackageFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<PackageFormValues>,
    defaultValues: packageFormDefaults(pkg),
  });
  const [step, setStep] = useState<PackageStep>("identity");
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep("identity");
    form.reset(packageFormDefaults(pkg));
    setTiers([]);
    if (!pkg) return;
    let current = true;
    setLoadingTiers(true);
    repository
      .listPackageTiers(pkg.id)
      .then((rows) => {
        if (!current) return;
        setTiers(rows);
        form.reset(packageFormDefaults(pkg, rows));
      })
      .catch(() => undefined)
      .finally(() => {
        if (current) setLoadingTiers(false);
      });
    return () => {
      current = false;
    };
  }, [open, pkg, repository, form]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [step]);

  const errorSteps = new Set(errorPaths(form.formState.errors).map(stepOfPath));
  const index = PACKAGE_STEPS.indexOf(step);
  const last = index === PACKAGE_STEPS.length - 1;

  async function onSubmit(values: PackageFormValues) {
    const input = toPackageInput(values, (code) => t(`tier.${code}`), tiers);
    try {
      const saved = pkg ? await repository.updatePackage(pkg.id, input) : await repository.createPackage(input);
      feedback.success(creating ? t("form.createdTitle") : t("form.savedTitle"), saved.code);
      onSaved(saved, creating);
      onOpenChange(false);
    } catch (err) {
      if (applyFieldErrors(form.setError, err, SERVER_FIELDS)) {
        setStep(firstErrorStep(form.formState.errors) ?? "identity");
      } else {
        feedback.error(err, t("form.saveError"));
      }
    }
  }

  function onInvalid(errors: FieldErrors<PackageFormValues>) {
    const target = firstErrorStep(errors);
    if (target) setStep(target);
    toast.push({ title: t("form.fixErrors"), tone: "error" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] max-w-3xl flex-col gap-0 overflow-hidden bg-[#f4f4f7] p-0 sm:p-0" data-testid="package-form">
        <DialogHeader className="space-y-0 border-b border-zinc-200/70 bg-white/85 px-5 pb-3 pt-5 backdrop-blur sm:px-7">
          <div className="flex items-center gap-4 pe-8">
            <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]", TONES.emerald.gradient)} aria-hidden>
              {creating ? <PackagePlus className="h-7 w-7" strokeWidth={2.1} /> : <Package className="h-7 w-7" strokeWidth={2.1} />}
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[21px] tracking-tight">{creating ? t("form.createTitle") : t("form.editTitle")}</DialogTitle>
              <DialogDescription className="mt-1 text-[13px]">{creating ? t("form.createSubtitle") : t("form.editSubtitle")}</DialogDescription>
            </div>
          </div>
          <StepRail current={step} errors={errorSteps} onSelect={setStep} />
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="flex min-h-0 flex-1 flex-col" noValidate>
            <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5" data-testid={`package-form-step-${step}`}>
              {loadingTiers ? (
                <div className="flex h-40 items-center justify-center text-zinc-400">
                  <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                </div>
              ) : (
                <StepBody step={step} takenCodes={takenCodes} />
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-zinc-200/70 bg-white/90 px-5 py-3.5 backdrop-blur sm:px-7">
              <Button
                type="button"
                variant="ghost"
                className="gap-1.5"
                disabled={index === 0}
                onClick={() => setStep(PACKAGE_STEPS[Math.max(0, index - 1)])}
                data-testid="package-form-back"
              >
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
                {t("form.back")}
              </Button>
              <span className="hidden flex-1 text-center text-[12px] font-medium text-zinc-400 sm:block">
                {t("form.stepOf", { n: index + 1, total: PACKAGE_STEPS.length })}
              </span>
              <span className="flex-1 sm:hidden" />
              {!last ? (
                <Button type="button" variant="outline" className="gap-1.5" onClick={() => setStep(PACKAGE_STEPS[index + 1])} data-testid="package-form-next">
                  {t("form.next")}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                </Button>
              ) : null}
              <SubmitButton label={creating ? t("form.create") : t("form.save")} />
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton({ label }: { label: string }) {
  const {
    formState: { isSubmitting },
  } = useFormContext<PackageFormValues>();
  return (
    <Button type="submit" disabled={isSubmitting} className="gap-1.5" data-testid="package-form-submit">
      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" strokeWidth={2.6} aria-hidden />}
      {label}
    </Button>
  );
}

function StepRail({ current, errors, onSelect }: { current: PackageStep; errors: Set<PackageStep>; onSelect: (s: PackageStep) => void }) {
  const t = useTranslations("packages");
  return (
    <nav className="-mx-5 mt-4 overflow-x-auto px-5 pb-1 sm:-mx-7 sm:px-7" aria-label={t("form.stepOf", { n: PACKAGE_STEPS.indexOf(current) + 1, total: PACKAGE_STEPS.length })}>
      <ol className="flex min-w-max gap-1.5">
        {PACKAGE_STEPS.map((s, i) => {
          const look = STEP_LOOK[s];
          const Icon = look.icon;
          const active = s === current;
          const bad = errors.has(s);
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => onSelect(s)}
                aria-current={active ? "step" : undefined}
                aria-label={t(`steps.${s}.title`)}
                data-testid={`package-form-rail-${s}`}
                className={cn(
                  "relative flex items-center gap-2 rounded-2xl py-1.5 pe-3 ps-1.5 text-[12.5px] font-semibold transition",
                  active ? "bg-zinc-950 text-white shadow-[0_10px_22px_-14px_rgba(15,23,42,0.8)]" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                )}
              >
                <span
                  className={cn("flex h-8 w-8 items-center justify-center rounded-[11px]", active ? TONES[look.tone].gradient : TONES[look.tone].soft)}
                  aria-hidden
                >
                  <Icon className="h-4 w-4" strokeWidth={2.3} />
                </span>
                <span className="hidden sm:inline">{t(`steps.${s}.title`)}</span>
                <span className="sm:hidden">{i + 1}</span>
                {bad ? <span className="absolute end-1 top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" aria-label="!" /> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepBody({ step, takenCodes }: { step: PackageStep; takenCodes: readonly string[] }) {
  switch (step) {
    case "identity":
      return <IdentityStep takenCodes={takenCodes} />;
    case "hotels":
      return <HotelsStep />;
    case "pricing":
      return <PricingStep />;
    case "logistics":
      return <LogisticsStep />;
    case "services":
      return <ServicesStep />;
    case "itinerary":
      return <ItineraryStep />;
    case "requirements":
      return <RequirementsStep />;
  }
}
