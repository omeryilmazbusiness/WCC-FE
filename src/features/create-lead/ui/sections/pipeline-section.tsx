"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { BellRing, Megaphone, Target, UserCog, UserRound } from "lucide-react";
import {
  LEAD_PRIORITIES,
  LEAD_SOURCE_LOOK,
  LEAD_SOURCE_PRESETS,
  PRIORITY_LOOK,
  leadSourceKind,
  stageLook,
  suggestedPriority,
  type LeadOwner,
} from "@/entities/lead";
import { cn } from "@/shared/lib/cn";
import {
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
  TONES,
} from "@/shared/ui";
import { toLocalDateTime, type LeadFormValues } from "../../model/form";
import { useAiField } from "../parts/ai-fields";
import { ChoiceChips } from "../parts/choice-chips";
import { FormSection, GroupLabel } from "../parts/form-section";
import { IconInput } from "../parts/icon-input";

const NONE = "__none__";
const OTHER = "__other__";

type Props = {
  creating: boolean;
  owners: LeadOwner[];
  customers: { id: string; name: string }[];
};

/** Quick follow-up times relative to now, in local time. */
function followUpPresets(now: Date) {
  const at = (days: number, hour?: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    if (hour != null) d.setHours(hour, 0, 0, 0);
    return d;
  };
  const inHour = new Date(now.getTime() + 3600_000);
  inHour.setSeconds(0, 0);
  return [
    { id: "hour", at: inHour },
    { id: "tomorrow", at: at(1, 10) },
    { id: "days3", at: at(3, 10) },
    { id: "week", at: at(7, 10) },
  ] as const;
}

export function PipelineSection({ creating, owners, customers }: Props) {
  const t = useTranslations("pipeline.leadForm");
  const tp = useTranslations("pipeline");
  const form = useFormContext<LeadFormValues>();
  const [source, travelDate, priority, followUp] = useWatch({
    control: form.control,
    name: ["source", "travelDate", "priority", "nextFollowUpAt"],
  });
  const notes = useAiField("notes");
  const [otherSource, setOtherSource] = useState(false);
  const presets = useMemo(() => followUpPresets(new Date()), []);
  const minFollowUp = useMemo(() => toLocalDateTime(new Date()), []);
  const suggested = suggestedPriority(travelDate || null);
  const autoHigh = creating && suggested === "high" && priority === "high" && !form.getFieldState("priority").isDirty;

  useEffect(() => {
    if (!creating || form.getFieldState("priority").isDirty) return;
    form.setValue("priority", suggested);
  }, [creating, suggested, form]);

  const preset = LEAD_SOURCE_PRESETS.find((p) => p.value.toLowerCase() === source.trim().toLowerCase());
  const sourceChoice = preset ? preset.id : otherSource || source.trim() ? OTHER : "";
  const stage = stageLook("new");
  const StageIcon = stage.icon;

  return (
    <FormSection
      icon={Target}
      tone="amber"
      title={t("sections.pipeline.title")}
      hint={t("sections.pipeline.hint")}
      testId="lead-form-pipeline"
      aside={
        creating ? (
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold", TONES[stage.tone].soft)}>
            <StageIcon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
            {t("stageNote", { stage: tp("stages.new") })}
          </span>
        ) : null
      }
    >
      {creating ? (
        <div>
          <GroupLabel>{t("fields.source")}</GroupLabel>
          <ChoiceChips
            clearable
            testId="lead-form-source"
            aria-label={t("fields.source")}
            value={sourceChoice}
            onChange={(id) => {
              const picked = LEAD_SOURCE_PRESETS.find((p) => p.id === id);
              setOtherSource(id === OTHER);
              form.setValue("source", picked ? picked.value : "", { shouldDirty: true });
            }}
            options={[
              ...LEAD_SOURCE_PRESETS.map((p) => ({ value: p.id as string, label: t(`sources.${p.id}`), ...LEAD_SOURCE_LOOK[leadSourceKind(p.value)] })),
              { value: OTHER, label: t("sources.other"), ...LEAD_SOURCE_LOOK.other },
            ]}
          />
          {sourceChoice === OTHER ? (
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem className="mt-2.5">
                  <FormControl>
                    <IconInput
                      icon={Megaphone}
                      {...field}
                      autoFocus={otherSource && !field.value}
                      placeholder={t("fields.sourceOtherPh")}
                      data-testid="lead-form-source-other"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </div>
      ) : null}

      {creating ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="ownerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.owner")}</FormLabel>
                <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                  <FormControl>
                    <SelectTrigger className="h-12" data-testid="lead-form-owner">
                      <span className="flex min-w-0 items-center gap-2">
                        <UserCog className="h-[18px] w-[18px] shrink-0 text-amber-500" aria-hidden />
                        <SelectValue />
                      </span>
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
              <FormItem>
                <FormLabel>{t("fields.customer")}</FormLabel>
                <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                  <FormControl>
                    <SelectTrigger className="h-12">
                      <span className="flex min-w-0 items-center gap-2">
                        <UserRound className="h-[18px] w-[18px] shrink-0 text-indigo-500" aria-hidden />
                        <SelectValue placeholder={tp("optionalCustomer")} />
                      </span>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>{tp("noCustomer")}</SelectItem>
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
        </div>
      ) : null}

      <div>
        <GroupLabel
          extra={
            autoHigh ? (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700" data-testid="lead-form-priority-auto">
                {t("fields.prioritySuggested")}
              </span>
            ) : null
          }
        >
          {t("fields.priority")}
        </GroupLabel>
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <ChoiceChips
              testId="lead-form-priority"
              aria-label={t("fields.priority")}
              value={field.value}
              onChange={(v) => v && field.onChange(v)}
              options={LEAD_PRIORITIES.map((p) => ({ value: p, label: t(`priorities.${p}`), hint: t(`priorityHints.${p}`), ...PRIORITY_LOOK[p] }))}
            />
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="nextFollowUpAt"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("fields.followUp")}</FormLabel>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => {
                const value = toLocalDateTime(p.at);
                const on = followUp === value;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => field.onChange(on ? "" : value)}
                    aria-pressed={on}
                    data-testid={`lead-form-followup-${p.id}`}
                    className={cn(
                      "inline-flex h-9 items-center rounded-full px-3.5 text-[12.5px] font-semibold transition",
                      on ? "bg-zinc-900 text-white shadow-sm" : "bg-zinc-50 text-zinc-600 ring-1 ring-inset ring-zinc-200/70 hover:bg-white hover:text-zinc-900",
                    )}
                  >
                    {t(`followUpQuick.${p.id}`)}
                  </button>
                );
              })}
            </div>
            <FormControl>
              <div className="relative">
                <BellRing className="pointer-events-none absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-amber-500" aria-hidden />
                <Input type="datetime-local" min={minFollowUp} {...field} className="h-12 ps-11" data-testid="lead-form-followup" />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1.5">
              {t("fields.notes")}
              {notes.badge}
            </FormLabel>
            <FormControl>
              <Textarea {...field} rows={3} placeholder={t("fields.notesPh")} className={cn("min-h-[88px] rounded-2xl", notes.ring)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormSection>
  );
}
