"use client";

import { useTranslations } from "next-intl";
import { CheckCheck, CircleDot, Flame, type LucideIcon } from "lucide-react";
import type { NotificationTotals } from "@/entities/notification";
import { cn } from "@/shared/lib/cn";
import { TONES, type Tone } from "@/shared/ui";
import type { NotificationStatusFilter } from "../model/use-notification-center";

type Props = {
  totals: NotificationTotals;
  locale: string;
  status: NotificationStatusFilter;
  onSelectStatus: (status: NotificationStatusFilter) => void;
};

/** Three glanceable counts; "new" and "seen" double as status shortcuts (tap again to clear). */
export function NotificationStats({ totals, locale, status, onSelectStatus }: Props) {
  const t = useTranslations("notificationCenter.stats");
  const num = (n: number) => n.toLocaleString(locale);
  const toggle = (next: NotificationStatusFilter) => onSelectStatus(status === next ? "active" : next);
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3" data-testid="notification-stats">
      <Stat
        icon={CircleDot}
        tone="rose"
        label={t("open")}
        hint={t("openHint")}
        value={num(totals.open)}
        pressed={status === "open"}
        onClick={() => toggle("open")}
        testId="notification-stat-open"
      />
      <Stat
        icon={CheckCheck}
        tone="amber"
        label={t("acknowledged")}
        hint={t("acknowledgedHint")}
        value={num(totals.acknowledged)}
        pressed={status === "acknowledged"}
        onClick={() => toggle("acknowledged")}
        testId="notification-stat-acknowledged"
      />
      <Stat icon={Flame} tone="violet" label={t("critical")} hint={t("criticalHint")} value={num(totals.critical)} testId="notification-stat-critical" />
    </div>
  );
}

const PRESSED: Record<Tone, string> = {
  sky: "ring-2 ring-sky-300/70 bg-sky-50/60",
  indigo: "ring-2 ring-indigo-300/70 bg-indigo-50/60",
  emerald: "ring-2 ring-emerald-300/70 bg-emerald-50/60",
  amber: "ring-2 ring-amber-300/70 bg-amber-50/60",
  rose: "ring-2 ring-rose-300/70 bg-rose-50/60",
  violet: "ring-2 ring-violet-300/70 bg-violet-50/60",
  teal: "ring-2 ring-teal-300/70 bg-teal-50/60",
  zinc: "ring-2 ring-zinc-300/70 bg-zinc-50/60",
};

type StatProps = {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  hint: string;
  value: string;
  pressed?: boolean;
  onClick?: () => void;
  testId: string;
};

function Stat({ icon: Icon, tone, label, hint, value, pressed, onClick, testId }: StatProps) {
  const body = (
    <>
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px]", TONES[tone].gradient)} aria-hidden>
        <Icon className="h-[22px] w-[22px]" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 text-start">
        <span className="block truncate text-[12px] font-medium text-zinc-500">{label}</span>
        <span className="block truncate text-[24px] font-bold leading-7 tracking-tight tabular-nums text-zinc-950">{value}</span>
      </span>
    </>
  );
  const base =
    "flex min-w-0 items-center gap-3.5 rounded-[24px] bg-white p-3 pe-4 ring-1 ring-zinc-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_32px_-26px_rgba(15,23,42,0.4)]";
  if (!onClick) {
    return (
      <div className={base} title={hint} data-testid={testId}>
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
        "transition-all duration-200 hover:-translate-y-px hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_36px_-24px_rgba(15,23,42,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300",
        pressed && PRESSED[tone],
      )}
    >
      {body}
    </button>
  );
}
