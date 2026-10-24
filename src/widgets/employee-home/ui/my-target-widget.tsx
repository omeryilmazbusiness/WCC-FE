"use client";

import { useTranslations } from "next-intl";
import { Gauge, Hourglass, Target } from "lucide-react";
import type { TargetSnapshot } from "@/entities/dashboard";
import { routes } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import { ProgressRing, TONES, WidgetCard, type Tone } from "@/shared/ui";

type Props = {
  target: TargetSnapshot;
  locale: string;
};

const STATUS_TONE: Record<TargetSnapshot["status"], Tone> = {
  ahead: "emerald",
  on_track: "sky",
  behind: "amber",
  placeholder: "zinc",
};

function compactMinor(minor: number, locale: string): string {
  if (!Number.isFinite(minor) || minor === 0) return "0";
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(Math.trunc(minor / 100));
}

/** Personal pace card — same ring + tiles language as the GM targets widget. */
export function MyTargetWidget({ target, locale }: Props) {
  const t = useTranslations("workspace");
  const tone = STATUS_TONE[target.status];
  const pct = target.targetAmount > 0 ? Math.round((target.actualAmount * 100) / target.targetAmount) : 0;
  const goal = `${compactMinor(target.targetAmount, locale)} ${target.currency}`;

  return (
    <WidgetCard title={t("targetTitle")} icon={Target} tone="emerald" href={routes.targets} hrefLabel={t("targetTitle")} data-testid="my-target">
      <div className={cn("rounded-[24px] bg-gradient-to-br p-4 ring-1 ring-zinc-200/50", TONES[tone].tint)}>
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-[15px] font-semibold tracking-tight text-zinc-950">{target.label || t("targetTitle")}</p>
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", TONES[tone].soft)}>
            {t(`targetStatus.${target.status}`)}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <ProgressRing
            value={pct}
            size={112}
            thickness={11}
            tone={tone}
            aria-label={target.label}
            label={<span className="text-[22px] font-semibold tabular-nums tracking-tight text-zinc-950">{pct}%</span>}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-[28px] font-semibold leading-none tabular-nums tracking-tight text-zinc-950">
              {compactMinor(target.actualAmount, locale)}
              <span className="ms-1.5 text-[13px] font-semibold text-zinc-400">{target.currency}</span>
            </p>
            <p className="truncate text-[13px] font-medium text-zinc-500">{t("targetOf", { goal })}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniStat icon={Hourglass} tone="violet" label={t("targetExpected")} value={compactMinor(target.expectedToDate, locale)} />
          <MiniStat icon={Gauge} tone="amber" label={t("targetActual")} value={`${pct}%`} />
        </div>
      </div>
    </WidgetCard>
  );
}

function MiniStat({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof Gauge;
  tone: Tone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-white/70 px-3 py-2.5 ring-1 ring-zinc-200/60">
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", TONES[tone].soft)}>
        <Icon className="h-4 w-4" strokeWidth={2.1} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-zinc-500">{label}</p>
        <p className="truncate text-[13px] font-semibold tabular-nums text-zinc-900">{value}</p>
      </div>
    </div>
  );
}
