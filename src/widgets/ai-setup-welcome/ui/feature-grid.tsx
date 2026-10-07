"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { TONES } from "@/shared/ui";
import { AI_FEATURES, AI_GUARDRAILS } from "../model/welcome-look";

/** "What you get": big colourful icons, one line of value each. */
export function FeatureGrid() {
  const t = useTranslations("aiSetup");
  return (
    <section aria-labelledby="ai-features-title" data-testid="ai-features">
      <h2 id="ai-features-title" className="px-1 pb-3 text-[20px] font-bold tracking-tight text-zinc-950">
        {t("featuresTitle")}
      </h2>
      <ul className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        {AI_FEATURES.map(({ id, icon: Icon, tone }) => (
          <li key={id} className="flex items-start gap-4" data-testid="ai-feature" data-feature={id}>
            <span className={cn("flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[16px]", TONES[tone].gradient)}>
              <Icon className="h-6 w-6" strokeWidth={1.9} aria-hidden />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-[15.5px] font-semibold text-zinc-950">{t(`features.${id}.title`)}</span>
              <span className="mt-0.5 block text-[13.5px] leading-snug text-zinc-500">{t(`features.${id}.body`)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Guardrails that hold whatever provider is connected. */
export function GuardrailList() {
  const t = useTranslations("aiSetup");
  return (
    <section aria-labelledby="ai-guardrails-title" data-testid="ai-guardrails">
      <h2 id="ai-guardrails-title" className="px-1 pb-3 text-[20px] font-bold tracking-tight text-zinc-950">
        {t("guardrailsTitle")}
      </h2>
      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-[24px] bg-white ring-1 ring-zinc-200/60">
        {AI_GUARDRAILS.map(({ id, icon: Icon, tone }) => (
          <li key={id} className="flex items-start gap-3.5 px-4 py-3.5" data-testid="ai-guardrail" data-guardrail={id}>
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]", TONES[tone].soft)}>
              <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[14.5px] font-semibold text-zinc-950">{t(`guardrails.${id}.title`)}</span>
              <span className="block text-[13px] leading-snug text-zinc-500">{t(`guardrails.${id}.body`)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
