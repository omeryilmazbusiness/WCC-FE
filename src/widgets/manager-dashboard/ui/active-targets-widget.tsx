"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Gauge, Hourglass, Plus, Target, TrendingUp } from "lucide-react";
import {
  PeriodKindIcon,
  TARGET_STATUS_TONE,
  type TargetProgress,
} from "@/entities/revenuetarget";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import { cn } from "@/shared/lib/cn";
import { Button, ErrorState, ProgressRing, TONES, WidgetCard } from "@/shared/ui";
import { formatCompactMinor } from "./money";

type Props = {
  targets: TargetProgress[] | null;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  locale: string;
  canManage: boolean;
};

const MAX_ROWS = 4;

function percent(p: TargetProgress): number {
  return p.targetAmount > 0 ? Math.round((p.actualAmount * 100) / p.targetAmount) : 0;
}

/** Every branch target running today: a hero ring for the focused one and a row per target. */
export function ActiveTargetsWidget({ targets, loading, error, onRetry, locale, canManage }: Props) {
  const t = useTranslations("manager.targets");
  const tc = useTranslations("common");
  const [focusId, setFocusId] = useState<string | null>(null);
  const items = targets ?? [];
  const focused = items.find((p) => p.targetId === focusId) ?? items[0];

  return (
    <WidgetCard
      title={t("title")}
      icon={Target}
      tone="emerald"
      count={items.length > 0 ? items.length : undefined}
      href={routes.targets}
      hrefLabel={t("manage")}
      data-testid="manager-target-hero"
    >
      {error && !targets ? (
        <ErrorState title={t("loadError")} retryLabel={tc("retry")} onRetry={onRetry} className="flex-1 py-8" />
      ) : loading && !targets ? (
        <TargetsSkeleton />
      ) : !focused ? (
        <EmptyTargets canManage={canManage} />
      ) : (
        <div className="flex flex-1 flex-col gap-4">
          <FocusedTarget target={focused} locale={locale} />
          {items.length > 1 ? (
            <ul className="space-y-1.5" data-testid="manager-target-list">
              {items.slice(0, MAX_ROWS).map((p) => (
                <TargetRow
                  key={p.targetId}
                  target={p}
                  active={p.targetId === focused.targetId}
                  onSelect={() => setFocusId(p.targetId)}
                />
              ))}
              {items.length > MAX_ROWS ? (
                <li>
                  <Link
                    href={routes.targets}
                    className="block rounded-xl px-2 py-1.5 text-center text-[12px] font-semibold text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                  >
                    {t("more", { count: items.length - MAX_ROWS })}
                  </Link>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      )}
    </WidgetCard>
  );
}

function FocusedTarget({ target, locale }: { target: TargetProgress; locale: string }) {
  const t = useTranslations("manager.targets");
  const tt = useTranslations("targets");
  const tone = TARGET_STATUS_TONE[target.status] ?? "zinc";
  const pct = percent(target);
  const reached = target.actualAmount >= target.targetAmount;
  const goal = `${formatCompactMinor(target.targetAmount, locale)} ${target.currency}`;

  return (
    <div
      className={cn("rounded-[24px] bg-gradient-to-br p-4 ring-1 ring-zinc-200/50", TONES[tone].tint)}
      data-testid="manager-target-focus"
    >
      <div className="flex items-center gap-3">
        <PeriodKindIcon kind={target.periodKind} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-tight text-zinc-950">{target.label}</p>
          <p className="truncate text-[12px] font-medium text-zinc-500">
            {tt(`kinds.${target.periodKind}`)} · {tt(`metrics.${target.metric}`)}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", TONES[tone].soft)}>
          {tt(`status.${target.status}`)}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <ProgressRing
          value={pct}
          size={112}
          thickness={11}
          tone={tone}
          aria-label={target.label}
          label={
            <span className="text-[22px] font-semibold tabular-nums tracking-tight text-zinc-950">{pct}%</span>
          }
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-[28px] font-semibold leading-none tabular-nums tracking-tight text-zinc-950">
            {formatCompactMinor(target.actualAmount, locale)}
            <span className="ms-1.5 text-[13px] font-semibold text-zinc-400">{target.currency}</span>
          </p>
          <p className="truncate text-[13px] font-medium text-zinc-500">{t("of", { goal })}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniStat
          icon={Hourglass}
          tone="violet"
          label={t("timeLeft")}
          value={target.daysLeft > 0 ? t("daysLeft", { count: target.daysLeft }) : t("ended")}
        />
        {reached ? (
          <MiniStat icon={TrendingUp} tone="emerald" label={t("pace")} value={t("reached")} />
        ) : (
          <MiniStat
            icon={Gauge}
            tone="amber"
            label={t("perDay")}
            value={formatCompactMinor(target.requiredPaceDaily, locale)}
          />
        )}
      </div>

      {target.unconverted.length > 0 ? (
        <Link
          href={routes.financeFx}
          className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-800 hover:bg-amber-100"
          data-testid="manager-target-unconverted"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate">{t("unconverted", { currencies: target.unconverted.join(", ") })}</span>
        </Link>
      ) : null}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof Gauge;
  tone: keyof typeof TONES;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-white/80 px-3 py-2.5 ring-1 ring-zinc-200/50">
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", TONES[tone].gradient)}>
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10.5px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
        <p className="truncate text-[13px] font-semibold tabular-nums text-zinc-900">{value}</p>
      </div>
    </div>
  );
}

function TargetRow({ target, active, onSelect }: { target: TargetProgress; active: boolean; onSelect: () => void }) {
  const tt = useTranslations("targets");
  const tone = TARGET_STATUS_TONE[target.status] ?? "zinc";
  const pct = percent(target);
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-start transition-colors",
          active ? "bg-zinc-50 ring-1 ring-zinc-200/80" : "hover:bg-zinc-50/80",
        )}
      >
        <PeriodKindIcon kind={target.periodKind} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[13px] font-semibold text-zinc-900">{target.label}</p>
            <p className={cn("shrink-0 text-[12px] font-semibold tabular-nums", TONES[tone].text)}>{pct}%</p>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className={cn("h-full rounded-full transition-[width] duration-700", TONES[tone].dot)}
              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
          </div>
          <p className="mt-1 truncate text-[11px] font-medium text-zinc-400">{tt(`kinds.${target.periodKind}`)}</p>
        </div>
      </button>
    </li>
  );
}

function EmptyTargets({ canManage }: { canManage: boolean }) {
  const t = useTranslations("manager.targets");
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center" data-testid="manager-target-empty">
      <span className={cn("flex h-16 w-16 items-center justify-center rounded-[22px]", TONES.emerald.gradient)}>
        <Target className="h-8 w-8" strokeWidth={2} />
      </span>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-zinc-900">{t("empty")}</p>
        <p className="mx-auto max-w-[16rem] text-[13px] text-zinc-500">{t("emptyHint")}</p>
      </div>
      {canManage ? (
        <Button asChild size="sm">
          <Link href={routes.targets}>
            <Plus className="me-1.5 h-4 w-4" strokeWidth={2.25} />
            {t("create")}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function TargetsSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3" aria-busy>
      <div className="h-[220px] animate-pulse rounded-[24px] bg-zinc-100/80" />
      <div className="h-12 animate-pulse rounded-2xl bg-zinc-100/70" />
    </div>
  );
}
