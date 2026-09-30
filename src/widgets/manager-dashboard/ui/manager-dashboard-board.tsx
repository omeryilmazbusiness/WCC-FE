"use client";

import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlarmClock, FileWarning, Kanban, Wallet } from "lucide-react";
import {
  createDashboardRepository,
  type AttentionItem,
  type DashboardKPI,
  type TargetSnapshot,
  type TeamMemberStat,
} from "@/entities/dashboard";
import { useCan } from "@/entities/viewer";
import { SetupResumeBanner } from "@/features/gm-setup";
import { routes } from "@/shared/config/routes";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { ListScreen, QueryState, SegmentedControl, StatTile } from "@/shared/ui";
import { AIExecutiveSummaryCard } from "./ai-executive-summary-card";
import { AttentionWidget } from "./attention-widget";
import { LostLeadsCard } from "./lost-leads-card";
import { CommandBar } from "./command-bar";
import { RevenueWidget } from "./revenue-widget";
import { TargetWidget } from "./target-widget";
import { TeamWidget } from "./team-widget";

const repo = createDashboardRepository();

/** The attention endpoint caps at 50; the card pages through them. */
const ATTENTION_LIMIT = 50;

type Period = "7" | "30" | "90";

type DashboardData = {
  kpi: DashboardKPI;
  team: TeamMemberStat[];
  attention: AttentionItem[];
  target: TargetSnapshot;
};

function periodRange(days: number): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - days);
  return { from, to };
}

export function ManagerDashboardBoard() {
  const t = useTranslations("manager");
  const tc = useTranslations("common");
  const locale = useLocale();
  const canAI = useCan("ai.read");
  const [period, setPeriod] = useState<Period>("30");

  const dashboard = useApiQuery(
    async (): Promise<DashboardData> => {
      const { from, to } = periodRange(Number(period));
      const [kpi, team, attention, target] = await Promise.all([
        repo.getKPIs(from, to),
        repo.getTeamStats(from, to),
        repo.getAttention(ATTENTION_LIMIT),
        repo.getTarget("branch"),
      ]);
      return { kpi, team, attention, target };
    },
    [period],
    { liveTopics: ["lead", "payment", "document", "task", "target", "conversation"] },
  );

  const periodControl = (
    <SegmentedControl<Period>
      value={period}
      onChange={setPeriod}
      aria-label={t("period")}
      options={[
        { value: "7", label: t("periodShort.d7") },
        { value: "30", label: t("periodShort.d30") },
        { value: "90", label: t("periodShort.d90") },
      ]}
    />
  );

  return (
    <ListScreen title={t("title")} description={t("subtitle")} actions={periodControl}>
      <SetupResumeBanner />
      <CommandBar />

      {dashboard.data ? (
        <DashboardGrid
          data={dashboard.data}
          locale={locale}
          aiSlot={
            canAI ? (
              <div className="grid gap-4 lg:grid-cols-2" data-testid="manager-ai-row">
                <AIExecutiveSummaryCard />
                <LostLeadsCard />
              </div>
            ) : null
          }
        />
      ) : (
        <QueryState
          loading={dashboard.loading}
          loadingLabel={tc("loading")}
          error={dashboard.error}
          onRetry={() => void dashboard.reload()}
        >
          {null}
        </QueryState>
      )}

    </ListScreen>
  );
}

function DashboardGrid({ data, locale, aiSlot }: { data: DashboardData; locale: string; aiSlot: ReactNode }) {
  const t = useTranslations("manager");
  const { kpi, team, attention, target } = data;
  const teamCollected = team.reduce((sum, m) => sum + (m.collectedAmt ?? 0), 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="manager-kpis">
        <StatTile href={routes.pipeline} label={t("kpi.leadsOpen")} value={kpi.leadsOpen} icon={Kanban} tone="sky" />
        <StatTile href={routes.tasks} label={t("kpi.tasksOverdue")} value={kpi.tasksOverdue} icon={AlarmClock} tone="amber" />
        <StatTile href={routes.bookings} label={t("kpi.bookingsUnpaid")} value={kpi.bookingsUnpaid} icon={Wallet} tone="rose" />
        <StatTile href={routes.tasks} label={t("kpi.missingDocs")} value={kpi.missingDocs} icon={FileWarning} tone="violet" />
      </div>

      {aiSlot}

      <div className="grid gap-4 lg:grid-cols-2">
        <TargetWidget target={target} locale={locale} />
        <RevenueWidget
          bookedMinor={kpi.bookedAmt ?? 0}
          collectedMinor={kpi.collectedAmt || teamCollected}
          marginMinor={kpi.marginAmt ?? 0}
          locale={locale}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AttentionWidget items={attention} />
        <TeamWidget members={team} />
      </div>
    </>
  );
}
