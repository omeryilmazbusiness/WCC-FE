"use client";

import { useTranslations } from "next-intl";
import { Building2, Check, MessageCircle, Minus, Sparkles, Users, type LucideIcon } from "lucide-react";
import type { SetupStep, SetupStepKey } from "@/entities/setup";
import { cn } from "@/shared/lib/cn";

export const STEP_ICONS: Record<SetupStepKey, LucideIcon> = {
  company: Building2,
  staff: Users,
  ai: Sparkles,
  channels: MessageCircle,
};

type Props = {
  steps: SetupStep[];
  active: SetupStepKey | null;
  onSelect: (step: SetupStepKey) => void;
  /** Steps after an unsaved company can't be opened yet. */
  locked: (step: SetupStepKey) => boolean;
};

export function StepDock({ steps, active, onSelect, locked }: Props) {
  const t = useTranslations("setup.steps");
  const settled = steps.filter((s) => s.status !== "pending").length;
  const fill = steps.length > 1 ? Math.min(settled, steps.length - 1) / (steps.length - 1) : 0;

  return (
    <nav aria-label={t("aria")} className="relative mx-auto w-full max-w-[560px]">
      <div className="absolute inset-x-[12.5%] top-[22px] h-[2px] rounded-full bg-zinc-900/[0.08]" aria-hidden>
        <div
          className="h-full rounded-full bg-zinc-950 transition-[width] duration-700 ease-out rtl:ms-auto"
          style={{ width: `${fill * 100}%` }}
        />
      </div>
      <ol className="relative grid grid-cols-4">
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[step.key];
          const isActive = step.key === active;
          const disabled = locked(step.key);
          return (
            <li key={step.key} className="flex justify-center">
              <button
                type="button"
                onClick={() => onSelect(step.key)}
                disabled={disabled}
                aria-current={isActive ? "step" : undefined}
                data-testid={`setup-dock-${step.key}`}
                className="group flex flex-col items-center gap-2 disabled:cursor-not-allowed"
              >
                <span
                  className={cn(
                    "relative flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300",
                    step.status === "done" && "bg-zinc-950 text-white shadow-[0_8px_18px_-10px_rgba(15,23,42,0.8)]",
                    step.status === "skipped" && "glass-pill text-zinc-400",
                    step.status === "pending" && "glass-pill text-zinc-500",
                    isActive && "scale-110 ring-[3px] ring-sky-500/35 ring-offset-2 ring-offset-transparent",
                    !disabled && !isActive && "group-hover:scale-105",
                  )}
                >
                  {step.status === "done" ? (
                    <Check className="h-[18px] w-[18px]" strokeWidth={2.5} />
                  ) : step.status === "skipped" ? (
                    <Minus className="h-[18px] w-[18px]" strokeWidth={2.25} />
                  ) : (
                    <Icon className={cn("h-[18px] w-[18px]", isActive && "text-zinc-950")} strokeWidth={1.9} />
                  )}
                </span>
                <span className="flex flex-col items-center leading-tight">
                  <span className="text-[10px] font-medium tabular-nums text-zinc-400">{i + 1}</span>
                  <span
                    className={cn(
                      "text-[12px] font-semibold tracking-[-0.01em]",
                      isActive ? "text-zinc-950" : "text-zinc-500",
                    )}
                  >
                    {t(`${step.key}.label`)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
