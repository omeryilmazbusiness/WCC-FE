"use client";

import { useTranslations } from "next-intl";
import {
  colorIndex,
  initials,
  metricValue,
  winRate,
  type TeamMemberStat,
  type TeamMetric,
} from "@/entities/dashboard";
import { cn } from "@/shared/lib/cn";
import { TONES } from "@/shared/ui";
import { formatCompactMoney } from "./money";
import { AVATAR_TONES, RANK_BADGE, TEAM_METRIC_LOOK } from "./team-look";

type Props = {
  member: TeamMemberStat;
  metric: TeamMetric;
  /** 0-based position on the active metric. */
  rank: number;
  /** Highest value of the active metric in the team; scales the bar. */
  max: number;
  locale: string;
};

/** One teammate: who they are, how they convert, and where they stand on the chosen metric. */
export function TeamRow({ member: m, metric, rank, max, locale }: Props) {
  const t = useTranslations("manager.team");
  const look = TEAM_METRIC_LOOK[metric];
  const value = metricValue(m, metric);
  const pct = max > 0 && value > 0 ? Math.max(4, Math.round((value * 100) / max)) : 0;
  const rate = winRate(m);
  const avatarTone = AVATAR_TONES[colorIndex(m.id, AVATAR_TONES.length)];
  const podium = !look.alert && value > 0 && rank < RANK_BADGE.length;
  const roleLabel = t.has(`roles.${m.role}`) ? t(`roles.${m.role}` as "roles.employee") : m.role;

  const display = metric === "collected" ? formatCompactMoney(value, m.currency, locale) : value.toLocaleString(locale);
  const missing = metric === "collected" && m.unconverted.length > 0;

  return (
    <div className="flex h-full items-center gap-3.5 rounded-[20px] px-2.5" data-testid="team-row" data-member={m.id}>
      <span
        className={cn(
          "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[13px] font-bold tracking-wide",
          TONES[avatarTone].gradient,
          "shadow-[0_6px_12px_-6px_rgba(15,23,42,0.28)]",
        )}
        aria-hidden
      >
        {initials(m.name)}
        {podium ? (
          <span
            className={cn(
              "absolute -end-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white text-[9.5px] font-bold",
              RANK_BADGE[rank],
            )}
            data-testid="team-rank"
          >
            {rank + 1}
          </span>
        ) : null}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p dir="auto" className="truncate text-[14px] font-semibold tracking-tight text-zinc-900">
            {m.name || t("unnamed")}
          </p>
          {roleLabel ? (
            <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10.5px] font-semibold text-zinc-600">
              {roleLabel}
            </span>
          ) : null}
        </div>
        <p className="truncate text-[12px] font-medium text-zinc-500">
          {m.leadsHandled > 0 || m.leadsWon > 0 ? t("summary", { won: m.leadsWon, leads: m.leadsHandled }) : t("noLeads")}
          {rate !== null ? <span className="text-emerald-600"> · {t("winRate", { pct: rate })}</span> : null}
          {m.overdueTasks > 0 && metric !== "overdue" ? (
            <span className="text-rose-600"> · {t("overdueCount", { count: m.overdueTasks })}</span>
          ) : null}
        </p>
      </div>

      <div className="w-24 shrink-0 text-end" title={missing ? t("excludes", { currencies: m.unconverted.join(", ") }) : undefined}>
        <p
          className={cn(
            "truncate text-[14px] font-semibold tabular-nums tracking-tight",
            look.alert && value > 0 ? "text-rose-600" : "text-zinc-900",
          )}
          data-testid="team-value"
        >
          {display}
          {missing ? <span className="text-zinc-400">*</span> : null}
        </p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div className={cn("h-full rounded-full transition-[width] duration-500", TONES[look.tone].dot)} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
