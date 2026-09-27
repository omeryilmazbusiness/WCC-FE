"use client";

import { useTranslations } from "next-intl";
import { Target } from "lucide-react";
import type { TargetSnapshot } from "@/entities/dashboard";
import { cn } from "@/shared/lib/cn";
import { ProgressRing, TONES, WidgetCard, type Tone } from "@/shared/ui";
import { formatCompactMinor } from "./money";

const STATUS_TONE: Record<TargetSnapshot["status"], Tone> = {
  ahead: "emerald",
  on_track: "sky",
  behind: "rose",
  placeholder: "zinc",
};

type Props = { target: TargetSnapshot; locale: string };

export function TargetWidget({ target, locale }: Props) {
  const t = useTranslations("manager");
  const tone = STATUS_TONE[target.status] ?? "zinc";
  const hasTarget = target.status !== "placeholder" && target.targetAmount > 0;
  const pct = hasTarget ? Math.round((target.actualAmount * 100) / target.targetAmount) : 0;

  return (
    <WidgetCard title={target.label} icon={Target} tone="emerald" data-testid="manager-target-hero">
      <div className="flex flex-1 items-center gap-6">
        <ProgressRing
          value={pct}
          tone={tone}
          aria-label={target.label}
          label={
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-950">
              {hasTarget ? `${pct}%` : "—"}
            </span>
          }
        />
        <div className="min-w-0 space-y-2">
          {hasTarget ? (
            <>
              <p className="truncate text-3xl font-semibold tabular-nums tracking-tight text-zinc-950">
                {formatCompactMinor(target.actualAmount, locale)}
                <span className="ms-1.5 text-sm font-semibold text-zinc-400">{target.currency}</span>
              </p>
              <p className="truncate text-sm font-medium text-zinc-500">
                {t("targetOf", { goal: `${formatCompactMinor(target.targetAmount, locale)} ${target.currency}` })}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium text-zinc-500">{t("targetEmpty")}</p>
          )}
          <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", TONES[tone].soft)}>
            {t(`targetStatus.${target.status}`)}
          </span>
        </div>
      </div>
    </WidgetCard>
  );
}
