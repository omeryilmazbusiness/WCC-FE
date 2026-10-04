"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Baby, PersonStanding, Smile, UsersRound } from "lucide-react";
import { BOARD_LOOK, BOARD_TYPES, CABIN_CLASSES, CABIN_LOOK, MAX_CHILD_AGE, MAX_CHILDREN } from "@/entities/lead";
import { cn } from "@/shared/lib/cn";
import { FormField, FormMessage, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui";
import { needsBoard, needsCabin, type LeadFormValues } from "../../model/form";
import { useAiField } from "../parts/ai-fields";
import { ChoiceChips } from "../parts/choice-chips";
import { FormSection, GroupLabel } from "../parts/form-section";
import { Stepper } from "../parts/stepper";

const MAX_ADULTS = 99;
/** Children are 2–17; younger travellers are infants. */
const MIN_CHILD_AGE = 2;
const CHILD_AGES = Array.from({ length: MAX_CHILD_AGE - MIN_CHILD_AGE + 1 }, (_, i) => i + MIN_CHILD_AGE);
const UNSET = -1;

export function TravellersSection() {
  const t = useTranslations("pipeline.leadForm");
  const form = useFormContext<LeadFormValues>();
  const [services, adults, childAges, infants] = useWatch({
    control: form.control,
    name: ["services", "adults", "childAges", "infants"],
  });
  const pax = useAiField("pax_count");
  const errors = form.formState.errors;
  const total = adults + childAges.length + infants;
  const opts = { shouldDirty: true, shouldValidate: form.formState.isSubmitted };
  const setCount = (name: "adults" | "infants", value: number) => form.setValue(name, value, opts);
  const setAges = (ages: number[]) => form.setValue("childAges", ages, opts);

  function setChildren(count: number) {
    setAges(count > childAges.length ? [...childAges, UNSET] : childAges.slice(0, count));
  }

  function setChildAge(index: number, age: number) {
    setAges(childAges.map((a, i) => (i === index ? age : a)));
  }

  const steps = { decrementLabel: t("fields.decrease"), incrementLabel: t("fields.increase") };

  return (
    <FormSection
      icon={UsersRound}
      tone="violet"
      title={t("sections.travellers.title")}
      hint={t("sections.travellers.hint")}
      testId="lead-form-travellers"
      aside={
        total > 0 ? (
          <span className={cn("rounded-full bg-violet-50 px-3 py-1 text-[12.5px] font-bold text-violet-700", pax.ring && "ring-2 ring-violet-300")} data-testid="lead-form-pax-total">
            {t("fields.total", { count: total })}
          </span>
        ) : null
      }
    >
      <div className="grid gap-2.5">
        <div>
          <Stepper
            icon={PersonStanding}
            tone="violet"
            label={t("fields.adults")}
            hint={t("fields.adultsHint")}
            value={adults}
            max={MAX_ADULTS}
            onChange={(n) => setCount("adults", n)}
            testId="lead-form-adults"
            invalid={Boolean(errors.adults)}
            {...steps}
          />
          {errors.adults?.message ? <p role="alert" className="mt-1 text-sm text-[var(--destructive)]">{errors.adults.message}</p> : null}
        </div>
        <Stepper
          icon={Smile}
          tone="amber"
          label={t("fields.children")}
          hint={t("fields.childrenHint")}
          value={childAges.length}
          max={MAX_CHILDREN}
          onChange={setChildren}
          testId="lead-form-children"
          {...steps}
        />
        {childAges.length > 0 ? (
          <div className="rounded-[20px] bg-amber-50/60 p-3 ring-1 ring-inset ring-amber-100" data-testid="lead-form-child-ages">
            <p className="mb-2 text-[12px] font-semibold text-amber-800">{t("fields.childAgesHint")}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {childAges.map((age, i) => (
                <Select key={i} value={age >= 0 ? String(age) : undefined} onValueChange={(v) => setChildAge(i, Number(v))}>
                  <SelectTrigger
                    className={cn("h-10 bg-white", age < 0 && errors.childAges && "border-rose-300")}
                    aria-label={t("fields.childAge", { n: i + 1 })}
                    data-testid={`lead-form-child-age-${i}`}
                  >
                    <SelectValue placeholder={t("fields.childAge", { n: i + 1 })} />
                  </SelectTrigger>
                  <SelectContent>
                    {CHILD_AGES.map((a) => (
                      <SelectItem key={a} value={String(a)}>
                        {t("fields.childAgeOption", { n: i + 1, age: a })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
            {errors.childAges?.message ? <p role="alert" className="mt-2 text-sm text-[var(--destructive)]">{errors.childAges.message}</p> : null}
          </div>
        ) : null}
        <div>
          <Stepper
            icon={Baby}
            tone="rose"
            label={t("fields.infants")}
            hint={t("fields.infantsHint")}
            value={infants}
            max={Math.max(adults, infants)}
            onChange={(n) => setCount("infants", n)}
            testId="lead-form-infants"
            invalid={Boolean(errors.infants)}
            {...steps}
          />
          {errors.infants?.message ? <p role="alert" className="mt-1 text-sm text-[var(--destructive)]">{errors.infants.message}</p> : null}
        </div>
      </div>

      {needsCabin(services) ? (
        <div>
          <GroupLabel>{t("fields.cabin")}</GroupLabel>
          <FormField
            control={form.control}
            name="cabinClass"
            render={({ field }) => (
              <>
                <ChoiceChips
                  clearable
                  testId="lead-form-cabin"
                  aria-label={t("fields.cabin")}
                  value={field.value}
                  onChange={field.onChange}
                  options={CABIN_CLASSES.map((c) => ({ value: c, label: t(`cabins.${c}`), ...CABIN_LOOK[c] }))}
                />
                <FormMessage />
              </>
            )}
          />
        </div>
      ) : null}

      {needsBoard(services) ? (
        <div>
          <GroupLabel>{t("fields.board")}</GroupLabel>
          <FormField
            control={form.control}
            name="boardType"
            render={({ field }) => (
              <>
                <ChoiceChips
                  clearable
                  testId="lead-form-board"
                  aria-label={t("fields.board")}
                  value={field.value}
                  onChange={field.onChange}
                  options={BOARD_TYPES.map((b) => ({ value: b, label: t(`boards.${b}`), ...BOARD_LOOK[b] }))}
                />
                <FormMessage />
              </>
            )}
          />
        </div>
      ) : null}
    </FormSection>
  );
}
