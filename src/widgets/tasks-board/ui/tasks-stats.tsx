"use client";

import { useTranslations } from "next-intl";
import { AlarmClock, CircleDashed, Flame, type LucideIcon } from "lucide-react";
import type { TaskStats } from "@/entities/task";
import { cn } from "@/shared/lib/cn";
import { IconTile, type Tone } from "@/shared/ui";

export type StatFilter = "overdue" | "critical" | null;

type Props = {
  stats: TaskStats;
  locale: string;
  active: StatFilter;
  onToggle: (filter: Exclude<StatFilter, null>) => void;
};

/** Three glanceable numbers over active tasks; overdue and critical double as filters. */
export function TasksStats({ stats, locale, active, onToggle }: Props) {
  const t = useTranslations("tasks.stats");
  const num = (n: number) => n.toLocaleString(locale);
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" data-testid="tasks-stats">
      <Stat icon={CircleDashed} tone="sky" label={t("open")} value={num(stats.open)} testId="tasks-stat-open" />
      <Stat
        icon={AlarmClock}
        tone="amber"
        label={t("overdue")}
        value={num(stats.overdue)}
        hint={t("overdueHint")}
        pressed={active === "overdue"}
        onClick={() => onToggle("overdue")}
        testId="tasks-stat-overdue"
      />
      <Stat
        icon={Flame}
        tone="rose"
        label={t("critical")}
        value={num(stats.critical)}
        hint={t("criticalHint")}
        pressed={active === "critical"}
        onClick={() => onToggle("critical")}
        testId="tasks-stat-critical"
      />
    </div>
  );
}

const PRESSED: Record<Tone, string> = {
  sky: "border-sky-300 bg-sky-50/70 ring-2 ring-sky-200/60",
  indigo: "border-indigo-300 bg-indigo-50/70 ring-2 ring-indigo-200/60",
  emerald: "border-emerald-300 bg-emerald-50/70 ring-2 ring-emerald-200/60",
  amber: "border-amber-300 bg-amber-50/70 ring-2 ring-amber-200/60",
  rose: "border-rose-300 bg-rose-50/70 ring-2 ring-rose-200/60",
  violet: "border-violet-300 bg-violet-50/70 ring-2 ring-violet-200/60",
  teal: "border-teal-300 bg-teal-50/70 ring-2 ring-teal-200/60",
  zinc: "border-zinc-300 bg-zinc-50/70 ring-2 ring-zinc-200/60",
};

type StatProps = {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  hint?: string;
  pressed?: boolean;
  onClick?: () => void;
  testId: string;
};

function Stat({ icon, tone, label, value, hint, pressed, onClick, testId }: StatProps) {
  const body = (
    <>
      <IconTile icon={icon} tone={tone} size="lg" />
      <span className="min-w-0 text-start">
        <span className="block truncate text-[11px] font-medium text-zinc-400">{label}</span>
        <span className="block truncate text-[16px] font-bold leading-5 tracking-tight tabular-nums text-zinc-950">{value}</span>
      </span>
    </>
  );
  const base =
    "flex h-14 min-w-0 items-center gap-3 rounded-[20px] border bg-white px-2.5 pe-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-24px_rgba(15,23,42,0.35)]";

  if (!onClick) {
    return (
      <div className={cn(base, "border-zinc-200/60")} data-testid={testId}>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      title={hint}
      data-testid={testId}
      className={cn(
        base,
        "transition-all duration-200 hover:-translate-y-px hover:border-zinc-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300",
        pressed ? PRESSED[tone] : "border-zinc-200/60",
      )}
    >
      {body}
    </button>
  );
}
