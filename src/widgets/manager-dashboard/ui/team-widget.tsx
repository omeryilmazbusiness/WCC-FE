"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Users, UsersRound } from "lucide-react";
import {
  DEFAULT_TEAM_METRIC,
  TEAM_METRICS,
  metricValue,
  rankTeam,
  teamTotals,
  type TeamMemberStat,
  type TeamMetric,
} from "@/entities/dashboard";
import { cn } from "@/shared/lib/cn";
import { PagedList, TONES, WidgetCard } from "@/shared/ui";
import { MetricTile } from "./metric-tile";
import { formatCompactMinor } from "./money";
import { TEAM_METRIC_LOOK } from "./team-look";
import { TeamRow } from "./team-row";

type Props = { members: TeamMemberStat[]; locale: string };

/**
 * Team performance for the selected period: a tile per metric with the team
 * total (tap to rank by it) above each member's standing on that metric.
 */
export function TeamWidget({ members, locale }: Props) {
  const t = useTranslations("manager.team");
  const [metric, setMetric] = useState<TeamMetric>(DEFAULT_TEAM_METRIC);

  const totals = useMemo(() => teamTotals(members), [members]);
  const ranked = useMemo(() => rankTeam(members, metric), [members, metric]);
  const max = ranked.length > 0 ? metricValue(ranked[0], metric) : 0;
  const rankOf = useMemo(() => new Map(ranked.map((m, i) => [m.id, i])), [ranked]);
  const teamRate = totals.leads > 0 ? Math.min(100, Math.round((totals.won * 100) / totals.leads)) : null;

  return (
    <WidgetCard
      title={t("title")}
      icon={Users}
      tone="indigo"
      count={members.length}
      actions={
        teamRate !== null ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700" data-testid="team-win-rate">
            {t("winRate", { pct: teamRate })}
          </span>
        ) : null
      }
      data-testid="manager-team"
    >
      <div className="grid grid-cols-5 gap-2" role="group" aria-label={t("sortBy")}>
        {TEAM_METRICS.map((k) => {
          const look = TEAM_METRIC_LOOK[k];
          const total = totals[k];
          return (
            <MetricTile
              key={k}
              icon={look.icon}
              tone={look.tone}
              value={k === "collected" ? <CompactMoney minor={total} currency={totals.currency} locale={locale} /> : total.toLocaleString(locale)}
              label={t(`tiles.${k}`)}
              title={t("sortByMetric", { metric: t(`tiles.${k}`) })}
              active={metric === k}
              alert={look.alert && total > 0}
              compact={k === "collected"}
              onClick={() => setMetric(k)}
              data-testid={`team-tile-${k}`}
            />
          );
        })}
      </div>

      <PagedList
        className="mt-4"
        items={ranked}
        resetKey={metric}
        rowHeight={64}
        gap={4}
        getKey={(m) => m.id}
        empty={<NoActivity />}
        renderItem={(m) => <TeamRow member={m} metric={metric} rank={rankOf.get(m.id) ?? 0} max={max} locale={locale} />}
      />

      {metric === "collected" && totals.partial ? (
        <p className="-mt-1 text-center text-[11px] font-medium text-zinc-400" data-testid="team-partial">
          {t("partial")}
        </p>
      ) : null}
    </WidgetCard>
  );
}

function NoActivity() {
  const t = useTranslations("manager.team");
  return (
    <div className="flex flex-col items-center gap-3 text-center" data-testid="team-empty">
      <span className={cn("flex h-14 w-14 items-center justify-center rounded-[20px]", TONES.indigo.gradient)}>
        <UsersRound className="h-7 w-7" strokeWidth={2} />
      </span>
      <div className="space-y-0.5">
        <p className="text-[15px] font-semibold text-zinc-900">{t("empty")}</p>
        <p className="text-[13px] text-zinc-500">{t("emptyHint")}</p>
      </div>
    </div>
  );
}

function CompactMoney({ minor, currency, locale }: { minor: number; currency: string; locale: string }) {
  return (
    <>
      {currency ? <span className="me-0.5 text-[10.5px] font-semibold text-zinc-400">{currency}</span> : null}
      {formatCompactMinor(minor, locale)}
    </>
  );
}
