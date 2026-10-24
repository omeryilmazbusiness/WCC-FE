"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2, type LucideIcon } from "lucide-react";
import { emptyActivity } from "@/entities/tourpackage";
import { Button, FormControl, FormField, FormItem, FormMessage, FormSection, Input, Textarea, type Tone } from "@/shared/ui";
import type { PackageFormValues } from "../model/form";

type NamedList = "spec.services" | "spec.activities";

/** Title + details rows for custom-tour services or activities. */
export function NamedItemsEditor({
  name,
  icon,
  tone,
  title,
  hint,
  testId,
  empty,
  addLabel,
  removeLabel,
  titlePlaceholder,
  detailsPlaceholder,
}: {
  name: NamedList;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  hint: string;
  testId: string;
  empty: string;
  addLabel: string;
  removeLabel: string;
  titlePlaceholder: string;
  detailsPlaceholder: string;
}) {
  const { control } = useFormContext<PackageFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <FormSection icon={icon} tone={tone} title={title} hint={hint} testId={testId}>
      {fields.length === 0 ? (
        <p className="rounded-[20px] border border-dashed border-zinc-200 px-4 py-8 text-center text-[13px] font-medium text-zinc-500">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {fields.map((f, i) => (
            <li key={f.id} className="space-y-2 rounded-[20px] bg-zinc-50/80 p-3 ring-1 ring-inset ring-zinc-900/[0.04]">
              <div className="flex items-start gap-2">
                <FormField
                  control={control}
                  name={`${name}.${i}.title`}
                  render={({ field }) => (
                    <FormItem className="min-w-0 flex-1">
                      <FormControl>
                        <Input {...field} dir="auto" placeholder={titlePlaceholder} className="h-10 bg-white font-semibold" data-testid={`${testId}-title-${i}`} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" size="icon" variant="ghost" className="h-10 w-10 shrink-0 text-zinc-400 hover:text-rose-600" onClick={() => remove(i)} aria-label={removeLabel}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <FormField
                control={control}
                name={`${name}.${i}.details`}
                render={({ field }) => (
                  <Textarea {...field} dir="auto" rows={2} placeholder={detailsPlaceholder} className="min-h-[56px] rounded-xl bg-white text-[13.5px]" />
                )}
              />
            </li>
          ))}
        </ul>
      )}
      <Button type="button" variant="outline" className="w-full gap-1.5 rounded-2xl" onClick={() => append(emptyActivity())} data-testid={`${testId}-add`}>
        <Plus className="h-4 w-4" aria-hidden />
        {addLabel}
      </Button>
    </FormSection>
  );
}
