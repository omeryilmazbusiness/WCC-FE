"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import type { WizardStep } from "../model/use-import-wizard";

const STEPS: readonly WizardStep[] = ["upload", "match", "review", "done"];

/** iOS-style progress pills: done steps are checked, the current one is filled. */
export function WizardStepper({ step }: { step: WizardStep }) {
  const t = useTranslations("importExport.steps");
  const current = STEPS.indexOf(step);
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label={t("label")} data-testid="ie-stepper">
      {STEPS.map((s, i) => {
        const state = i < current || step === "done" ? "done" : i === current ? "current" : "todo";
        return (
          <li key={s} aria-current={state === "current" ? "step" : undefined} className="min-w-0">
            <div className={cn("h-1.5 rounded-full transition-colors duration-500", state === "todo" ? "bg-zinc-200" : state === "done" ? "bg-emerald-500" : "bg-sky-500")} />
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold",
                  state === "done" ? "bg-emerald-500 text-white" : state === "current" ? "bg-sky-500 text-white" : "bg-zinc-100 text-zinc-400",
                )}
                aria-hidden
              >
                {state === "done" ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("truncate text-[12px] font-semibold", state === "todo" ? "text-zinc-400" : "text-zinc-800")}>{t(s)}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
