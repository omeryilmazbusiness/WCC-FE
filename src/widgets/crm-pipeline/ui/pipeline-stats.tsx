"use client";

import { useTranslations } from "next-intl";
import { BellOff, Users, Wallet, type LucideIcon } from "lucide-react";
import { combineBudgets, isOpenStage, valueFromBudgets, type BoardColumn } from "@/entities/lead";
import { cn } from "@/shared/lib/cn";
import { formatMoneyShort, formatMoneyWhole } from "@/shared/lib/format";
import { IconTile, type Tone } from "@/shared/ui";

type Props = {
  /** Lane totals for the current filters; null while the first load runs. */
  columns: BoardColumn[] | null;
  locale: string;
  noFollowOnly: boolean;
  onToggleNoFollow: () => void;
};

/** Three glanceable numbers for the filtered pipeline; the follow-up tile doubles as a filter. */
export function PipelineStats({ columns, locale, noFollowOnly, onToggleNoFollow }: Props) {
  const t = useTranslations("pipeline.stats");
  const open = (columns ?? []).filter((c) => isOpenStage(c.stage));
  const openCount = open.reduce((n, c) => n + c.total, 0);
  const value = valueFromBudgets(open.reduce((acc, c) => combineBudgets(acc, c.budgets), [] as BoardColumn["budgets"]));
  const noFollow = open.reduce((n, c) => n + c.noFollowUp, 0);
  const num = (n: number) => (columns ? n.toLocaleString(locale) : "—");

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" data-testid="pipeline-stats">
      <Stat icon={Users} tone="sky" label={t("open")} value={num(openCount)} testId="pipeline-stat-open" />
      <Stat
        icon={Wallet}
        tone="emerald"
        label={t("value")}
        value={value ? formatMoneyShort(value.amount, locale, value.currency) : t("noValue")}
        muted={!value}
        hint={value?.partial ? t("partial") : undefined}
        title={
          value
            ? [formatMoneyWhole(value.amount, locale, value.currency), value.partial ? t("partial") : ""].filter(Boolean).join(" · ")
            : undefined
        }
        testId="pipeline-stat-value"
      />
      <Stat
        icon={BellOff}
        tone="amber"
        label={t("noFollowUp")}
        value={num(noFollow)}
        pressed={noFollowOnly}
        onClick={onToggleNoFollow}
        hint={t("noFollowUpHint")}
        testId="pipeline-stat-nofollow"
      />
    </div>
  );
}

type StatProps = {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  hint?: string;
  /** Tooltip; defaults to the hint. */
  title?: string;
  muted?: boolean;
  pressed?: boolean;
  onClick?: () => void;
  testId: string;
};

function Stat({ icon, tone, label, value, hint, title = hint, muted, pressed, onClick, testId }: StatProps) {
  const body = (
    <>
      <IconTile icon={icon} tone={tone} size="lg" />
      <span className="min-w-0 text-start">
        <span className="block truncate text-[11px] font-medium text-zinc-400">{label}</span>
        <span
          className={cn(
            "block truncate text-[16px] font-bold leading-5 tracking-tight tabular-nums",
            muted ? "text-[13px] font-semibold text-zinc-400" : "text-zinc-950",
          )}
        >
          {value}
          {hint && !onClick ? <span className="ms-0.5 text-zinc-400">*</span> : null}
        </span>
      </span>
    </>
  );
  const base =
    "flex h-14 min-w-0 items-center gap-3 rounded-[20px] border bg-white px-2.5 pe-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-24px_rgba(15,23,42,0.35)]";

  if (!onClick) {
    return (
      <div className={cn(base, "border-zinc-200/60")} title={title} data-testid={testId}>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      title={title}
      data-testid={testId}
      className={cn(
        base,
        "transition-all duration-200 hover:-translate-y-px hover:border-zinc-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
        pressed ? "border-amber-300 bg-amber-50/70 ring-2 ring-amber-200/60" : "border-zinc-200/60",
      )}
    >
      {body}
    </button>
  );
}
