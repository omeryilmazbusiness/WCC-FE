"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  PERIOD_KIND_META,
  PeriodKindIcon,
  TARGET_PERIOD_KINDS,
  daysInclusive,
  isCalendarPeriod,
  shiftPeriod,
  todayISO,
  type RevenueTarget,
  type RevenueTargetRepository,
  type TargetPeriodKind,
} from "@/entities/revenuetarget";
import { useCan } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  SegmentedControl,
  TONES,
  useMutationFeedback,
} from "@/shared/ui";
import {
  draftRange,
  formatRange,
  suggestLabel,
  validateDraft,
  type DraftErrors,
  type TargetDraft,
} from "../model/draft";

type Props = {
  repository: RevenueTargetRepository;
  onCreated: (target: RevenueTarget) => void;
  /** Custom trigger; defaults to a "New target" button. */
  trigger?: ReactNode;
};

function freshDraft(kind: TargetPeriodKind = "monthly"): TargetDraft {
  const today = todayISO();
  const inMonth = new Date(`${today}T00:00:00Z`);
  inMonth.setUTCMonth(inMonth.getUTCMonth() + 3);
  return {
    kind,
    start: today,
    end: inMonth.toISOString().slice(0, 10),
    amount: "",
    currency: "",
    metric: "collected",
    label: "",
  };
}

export function CreateTargetDialog({ repository, onCreated, trigger }: Props) {
  const allowed = useCan("targets.write");
  const t = useTranslations("targets");
  const tc = useTranslations("common");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TargetDraft>(() => freshDraft());
  const [labelEdited, setLabelEdited] = useState(false);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const period = draftRange(draft);
  const suggested = useMemo(
    () =>
      period.ok
        ? suggestLabel(draft.kind, period.range, locale, {
            week: (v) => t("form.labelWeekly", v),
            year: (v) => t("form.labelYearly", v),
            season: (v) => t("form.labelSeason", v),
            custom: (v) => t("form.labelCustom", v),
          })
        : "",
    [draft.kind, period, locale, t],
  );
  const label = labelEdited ? draft.label : suggested;

  function update(patch: Partial<TargetDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors({});
  }

  function reset() {
    setDraft(freshDraft());
    setLabelEdited(false);
    setErrors({});
  }

  async function submit() {
    const { errors: found, input } = validateDraft({ ...draft, label });
    setErrors(found);
    if (!input) return;
    setSubmitting(true);
    try {
      const created = await repository.create(input);
      feedback.success(t("created"));
      onCreated(created);
      setOpen(false);
      reset();
    } catch (err) {
      feedback.error(err, t("saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!allowed) return null;

  const periodError = !period.ok ? t(`form.errors.period.${period.error}`) : undefined;
  const tone = PERIOD_KIND_META[draft.kind].tone;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" data-testid="create-target-open">
            <Plus className="me-1.5 h-4 w-4" strokeWidth={2.25} />
            {t("create")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto" data-testid="create-target-dialog">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>{t("form.hint")}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <fieldset className="space-y-2.5">
            <legend className="mb-2.5 text-[13px] font-semibold text-zinc-700">{t("form.kindLabel")}</legend>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5" role="radiogroup" aria-label={t("form.kindLabel")}>
              {TARGET_PERIOD_KINDS.map((kind) => {
                const active = draft.kind === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-testid={`target-kind-${kind}`}
                    onClick={() => update({ kind })}
                    className={cn(
                      "group flex flex-col items-center gap-2.5 rounded-[22px] border px-2 pb-3.5 pt-4 text-center transition-all",
                      active
                        ? "border-transparent bg-white shadow-[0_18px_40px_-22px_rgba(15,23,42,0.45)] ring-2 ring-zinc-900/80"
                        : "border-zinc-200/70 bg-zinc-50/60 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_30px_-24px_rgba(15,23,42,0.45)]",
                    )}
                  >
                    <PeriodKindIcon kind={kind} size="lg" className={cn("transition-transform", active ? "scale-105" : "group-hover:scale-105")} />
                    <span className="text-[13px] font-semibold text-zinc-900">{t(`kinds.${kind}`)}</span>
                    <span className="text-[11px] font-medium leading-snug text-zinc-500">{t(`kindHints.${kind}`)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <section className={cn("rounded-[22px] bg-gradient-to-br p-4 ring-1 ring-zinc-200/60", TONES[tone].tint)}>
            {isCalendarPeriod(draft.kind) ? (
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("form.previous")}
                  onClick={() => update({ start: shiftPeriod(draft.kind, draft.start, -1) })}
                >
                  <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
                </Button>
                <div className="min-w-0 flex-1 text-center">
                  <p className="truncate text-[17px] font-semibold tracking-tight text-zinc-950" data-testid="target-period-title">
                    {suggested || "—"}
                  </p>
                  {period.ok ? (
                    <p className="text-[12px] font-medium text-zinc-500">{formatRange(period.range, locale)}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("form.next")}
                  onClick={() => update({ start: shiftPeriod(draft.kind, draft.start, 1) })}
                >
                  <ChevronRight className="h-5 w-5 rtl:rotate-180" />
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="target-start">{t("fields.periodStart")}</Label>
                  <Input
                    id="target-start"
                    type="date"
                    value={draft.start}
                    onChange={(e) => update({ start: e.target.value })}
                    data-testid="target-start"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="target-end">{t("fields.periodEnd")}</Label>
                  <Input
                    id="target-end"
                    type="date"
                    min={draft.start}
                    value={draft.end}
                    onChange={(e) => update({ end: e.target.value })}
                    data-testid="target-end"
                  />
                </div>
              </div>
            )}
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] font-medium text-zinc-500">
              <CalendarClock className={cn("h-3.5 w-3.5", TONES[tone].text)} />
              {period.ok ? (
                <span data-testid="target-period-summary">
                  {t("form.days", { count: daysInclusive(period.range.start, period.range.end) })}
                </span>
              ) : (
                <span className="text-rose-600">{periodError}</span>
              )}
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
            <FieldBlock id="target-amount" label={t("fields.amount")} error={errors.amount ? t(`form.errors.amount.${errors.amount}`) : undefined}>
              <Input
                id="target-amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="250,000"
                value={draft.amount}
                onChange={(e) => update({ amount: e.target.value })}
                className="h-12 text-lg font-semibold tabular-nums"
                data-testid="target-amount"
              />
            </FieldBlock>
            <FieldBlock id="target-currency" label={t("fields.currency")} error={errors.currency ? t("form.errors.currency") : undefined}>
              <Input
                id="target-currency"
                maxLength={3}
                placeholder={t("form.currencyAuto")}
                value={draft.currency}
                onChange={(e) => update({ currency: e.target.value.toUpperCase() })}
                className="h-12 text-center font-semibold uppercase"
                data-testid="target-currency"
              />
            </FieldBlock>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col items-start gap-1.5">
              <Label>{t("fields.metric")}</Label>
              <SegmentedControl
                value={draft.metric}
                onChange={(metric) => update({ metric })}
                aria-label={t("fields.metric")}
                options={[
                  { value: "collected", label: t("metrics.collected") },
                  { value: "booked", label: t("metrics.booked") },
                ]}
              />
            </div>
            <FieldBlock id="target-label" label={t("fields.label")} error={errors.label ? t("form.errors.label") : undefined}>
              <Input
                id="target-label"
                value={label}
                maxLength={120}
                onChange={(e) => {
                  setLabelEdited(true);
                  update({ label: e.target.value });
                }}
                data-testid="target-label"
              />
            </FieldBlock>
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={submitting} data-testid="create-target-submit">
              {submitting ? t("form.saving") : t("form.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldBlock({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-[12px] font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
