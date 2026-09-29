"use client";

import { useTranslations } from "next-intl";
import { Check, ChevronRight } from "lucide-react";
import type { SetupOverview, SetupStepKey } from "@/entities/setup";
import { cn } from "@/shared/lib/cn";
import { AppIcon, GlassGroup, PillButton, StepHero } from "./glass";
import { STEP_ICONS } from "./step-dock";

type Props = {
  overview: SetupOverview;
  onEdit: (step: SetupStepKey) => void;
  onFinish: () => void;
};

export function SetupDone({ overview, onEdit, onFinish }: Props) {
  const t = useTranslations("setup");
  return (
    <div className="space-y-6">
      <StepHero icon={Check} tint="done" title={t("done.title")} subtitle={t("done.subtitle")} />

      <GlassGroup title={t("done.summary")}>
        {overview.steps.map((step) => (
          <button
            key={step.key}
            type="button"
            onClick={() => onEdit(step.key)}
            className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-white/60"
            data-testid={`setup-summary-${step.key}`}
          >
            <AppIcon icon={STEP_ICONS[step.key]} tint={step.key} size="sm" />
            <span className="min-w-0 flex-1 text-[14px] font-semibold text-zinc-950">
              {t(`steps.${step.key}.label`)}
            </span>
            <span
              className={cn(
                "text-[12px] font-medium",
                step.status === "done" ? "text-emerald-600" : "text-zinc-400",
              )}
            >
              {t(`status.${step.status}`)}
            </span>
            <ChevronRight className="h-4 w-4 text-zinc-300 rtl:rotate-180" />
          </button>
        ))}
      </GlassGroup>

      <PillButton className="w-full" onClick={onFinish} data-testid="setup-go-dashboard">
        {t("done.cta")}
      </PillButton>
    </div>
  );
}
