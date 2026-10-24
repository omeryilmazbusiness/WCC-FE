"use client";

import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import type { BookingRepository } from "@/entities/booking";
import { createCustomerRepository } from "@/entities/customer";
import { createTourPackageRepository } from "@/entities/tourpackage";
import { useCan } from "@/entities/viewer";
import { pickOf } from "@/features/package-link";
import { useRouter } from "@/shared/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  GlyphTile,
  TONES,
  useMutationFeedback,
  useToast,
} from "@/shared/ui";
import {
  BOOKING_CREATE_STEPS,
  draftIssues,
  emptyBookingDraft,
  firstIssueStep,
  toCreateInput,
  type BookingCreateStep,
  type BookingDraft,
} from "../model/draft";
import { CREATE_LOOK, STEP_LOOK } from "./look";
import { BookingCreateStepBody } from "./steps";

type Props = {
  repository: BookingRepository;
  defaultCustomerId?: string;
  defaultDepartureId?: string;
  /** Preselects a package; its soonest bookable departure is suggested. */
  defaultPackageId?: string;
  onCreated?: (bookingId: string) => void;
  /** Replaces the default button. */
  trigger?: ReactElement;
};

export function CreateBookingDialog({
  repository,
  defaultCustomerId,
  defaultDepartureId,
  defaultPackageId,
  onCreated,
  trigger,
}: Props) {
  const allowed = useCan("bookings.write");
  const canDiscount = useCan("bookings.discount");
  const t = useTranslations("bookings");
  const tf = useTranslations("bookings.form");
  const { push } = useToast();
  const feedback = useMutationFeedback();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<BookingCreateStep>("party");
  const [draft, setDraft] = useState<BookingDraft>(() =>
    emptyBookingDraft({ customerId: defaultCustomerId, packageId: defaultPackageId, departureId: defaultDepartureId }),
  );
  const [busy, setBusy] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customers, setCustomers] = useState<{ id: string; label: string }[]>([]);
  const custRepo = useMemo(() => createCustomerRepository(), []);
  const pkgRepo = useMemo(() => createTourPackageRepository(), []);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep("party");
    setCustomerQuery("");
    setDraft(emptyBookingDraft({ customerId: defaultCustomerId, packageId: defaultPackageId, departureId: defaultDepartureId }));
    let alive = true;
    void custRepo.search("").then((list) => {
      if (!alive) return;
      const opts = list.slice(0, 80).map((c) => ({ id: c.id, label: c.fullName }));
      setCustomers(opts);
      setDraft((cur) => {
        const match = opts.find((c) => c.id === (cur.customerId || defaultCustomerId));
        if (!match) return cur;
        const travellers = [...cur.travellers];
        if (travellers[0] && !travellers[0].fullName.trim()) travellers[0] = { ...travellers[0], fullName: match.label };
        return { ...cur, customerId: match.id, customerLabel: match.label, travellers };
      });
    });
    if (defaultDepartureId && !defaultPackageId) {
      void pkgRepo
        .getDeparture(defaultDepartureId)
        .then((d) => {
          if (alive) setDraft((cur) => ({ ...cur, packageId: d.packageId, departureId: d.id }));
        })
        .catch(() => undefined);
    }
    return () => {
      alive = false;
    };
  }, [open, custRepo, pkgRepo, defaultCustomerId, defaultDepartureId, defaultPackageId]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [step]);

  if (!allowed) return null;

  const issues = draftIssues(draft);
  const errorSteps = new Set(BOOKING_CREATE_STEPS.filter((s) => (issues[s]?.length ?? 0) > 0));
  const index = BOOKING_CREATE_STEPS.indexOf(step);
  const last = index === BOOKING_CREATE_STEPS.length - 1;

  function patch(next: Partial<BookingDraft>) {
    setDraft((cur) => ({ ...cur, ...next }));
  }

  function goNext() {
    const currentIssues = issues[step] ?? [];
    if (currentIssues.length) {
      push({ title: tf("fixErrors"), tone: "error" });
      return;
    }
    setStep(BOOKING_CREATE_STEPS[Math.min(index + 1, BOOKING_CREATE_STEPS.length - 1)]);
  }

  async function submit() {
    const blocking = firstIssueStep(issues);
    if (blocking) {
      setStep(blocking);
      push({ title: tf("fixErrors"), tone: "error" });
      return;
    }
    const input = toCreateInput(draft);
    if (!canDiscount) input.discountAmt = 0;
    setBusy(true);
    try {
      const b = await repository.create(input);
      push({ title: t("createdTitle"), tone: "success" });
      setOpen(false);
      onCreated?.(b.id);
      router.push(routes.booking(b.id));
    } catch (err) {
      feedback.error(err, t("saveError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger ?? <Button type="button">{t("create")}</Button>}</DrawerTrigger>
      <DrawerContent
        className="max-w-[min(100vw,800px)] overflow-hidden bg-[linear-gradient(180deg,#f7f7fa_0%,#eef1f6_48%,#f7f7fa_100%)]"
        data-testid="create-booking-dialog"
      >
        <DrawerHeader className="space-y-0 border-zinc-200/50 bg-white/80 backdrop-blur-xl">
          <div className="flex items-center gap-3.5">
            <GlyphTile icon={CREATE_LOOK.icon} tone={CREATE_LOOK.tone} size="xl" />
            <div className="min-w-0 flex-1 pe-1">
              <DrawerTitle className="text-[20px] leading-tight tracking-tight sm:text-[22px]">{tf("createTitle")}</DrawerTitle>
              <DrawerDescription className="mt-1 text-[13px] leading-snug sm:text-[13.5px]">{tf("createSubtitle")}</DrawerDescription>
            </div>
          </div>
          <StepRail current={step} errors={errorSteps} onSelect={setStep} />
        </DrawerHeader>

        <DrawerBody ref={bodyRef} className="bg-transparent px-5 py-5 sm:px-6" data-testid={`create-booking-step-${step}`}>
          <BookingCreateStepBody
            step={step}
            draft={draft}
            issues={issues}
            customers={customers}
            customerQuery={customerQuery}
            onCustomerQuery={setCustomerQuery}
            onPatch={patch}
            canDiscount={canDiscount}
            onCustomerCreated={(c) => {
              setCustomers((list) => [{ id: c.id, label: c.fullName }, ...list.filter((x) => x.id !== c.id)]);
            }}
          />
        </DrawerBody>

        <DrawerFooter className="flex-nowrap items-center justify-between gap-2 border-zinc-200/60 bg-white/80 px-5 py-3.5 backdrop-blur-xl sm:px-6">
          <Button
            type="button"
            variant="ghost"
            className="h-11 shrink-0 gap-1.5 px-3 sm:px-4"
            disabled={index === 0}
            onClick={() => setStep(BOOKING_CREATE_STEPS[Math.max(0, index - 1)])}
            data-testid="create-booking-back"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {tf("back")}
          </Button>
          <span className="min-w-0 flex-1 truncate text-center text-[12px] font-medium text-zinc-400 sm:text-[12.5px]">
            {tf("stepOf", { n: index + 1, total: BOOKING_CREATE_STEPS.length })}
          </span>
          {!last ? (
            <Button type="button" className="h-11 shrink-0 gap-1.5 px-4 sm:px-5" onClick={goNext} data-testid="create-booking-next">
              {tf("next")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </Button>
          ) : (
            <Button type="button" disabled={busy} onClick={() => void submit()} className="h-11 shrink-0 gap-1.5 px-4 sm:px-5" data-testid="create-booking-submit">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" strokeWidth={2.6} aria-hidden />}
              {tf("create")}
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function StepRail({
  current,
  errors,
  onSelect,
}: {
  current: BookingCreateStep;
  errors: Set<BookingCreateStep>;
  onSelect: (s: BookingCreateStep) => void;
}) {
  const t = useTranslations("bookings");
  return (
    <nav className="mt-4" aria-label={t("form.stepOf", { n: BOOKING_CREATE_STEPS.indexOf(current) + 1, total: BOOKING_CREATE_STEPS.length })}>
      <ol className="grid grid-cols-5 items-stretch gap-1 sm:gap-1.5">
        {BOOKING_CREATE_STEPS.map((s) => {
          const look = STEP_LOOK[s];
          const Icon = look.icon;
          const active = s === current;
          return (
            <li key={s} className="min-w-0">
              <button
                type="button"
                onClick={() => onSelect(s)}
                aria-current={active ? "step" : undefined}
                aria-label={t(`steps.${s}.title`)}
                data-testid={`create-booking-rail-${s}`}
                className={cn(
                  "relative flex h-full min-h-[4.75rem] w-full flex-col items-center justify-center gap-1 rounded-[18px] px-0.5 py-2 transition sm:min-h-[5.25rem] sm:gap-1.5 sm:rounded-[20px] sm:py-2.5",
                  active ? "bg-zinc-950 text-white shadow-[0_14px_28px_-18px_rgba(15,23,42,0.65)]" : "text-zinc-500 hover:bg-white/80 hover:text-zinc-900",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-[12px] sm:h-11 sm:w-11 sm:rounded-[14px]",
                    active ? TONES[look.tone].gradient : TONES[look.tone].soft,
                  )}
                  aria-hidden
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.15} />
                </span>
                <span className="w-full truncate px-0.5 text-center text-[10px] font-semibold leading-none sm:text-[11px]">{t(`steps.${s}.title`)}</span>
                {errors.has(s) ? <span className="absolute end-1 top-1 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white sm:end-1.5 sm:top-1.5 sm:h-2 sm:w-2" /> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
