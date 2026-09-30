"use client";

import { type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlarmClock, FileWarning, Kanban, Wallet } from "lucide-react";
import {
  createDashboardRepository,
  type AttentionItem,
  type AttentionSummary,
  type DashboardKPI,
  type RevenueSummary,
  type TeamMemberStat,
  periodDays,
  resolveWindow,
} from "@/entities/dashboard";
import { createRevenueTargetRepository, type TargetProgress } from "@/entities/revenuetarget";
import { useCan } from "@/entities/viewer";
import { DashboardPeriodPicker, useDashboardPeriod } from "@/features/dashboard-period";
import { SetupResumeBanner } from "@/features/gm-setup";
import { routes } from "@/shared/config/routes";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { ListScreen, QueryState, StatTile } from "@/shared/ui";
import { RevenueCardState } from "./revenue-card-state";
import { AIExecutiveSummaryCard } from "./ai-executive-summary-card";
import { AttentionWidget } from "./attention-widget";
import { LostLeadsCard } from "./lost-leads-card";
import { CommandBar } from "./command-bar";
import { ActiveTargetsWidget } from "./active-targets-widget";
import { TeamWidget } from "./team-widget";

const repo = createDashboardRepository();
const targetRepo = createRevenueTargetRepository();

/** The attention endpoint caps at 50; the card pages through them. */
const ATTENTION_LIMIT = 50;

type DashboardData = {
  kpi: DashboardKPI;
  team: TeamMemberStat[];
  attention: AttentionItem[];
  attentionSummary: AttentionSummary;
};

export function ManagerDashboardBoard() {
  const t = useTranslations("manager");
  const tc = useTranslations("common");
  const locale = useLocale();
  const canAI = useCan("ai.read");
  const canFinance = useCan("payments.read");
  const canTargets = useCan("targets.read");
  const canManageTargets = useCan("targets.write");
  const { period, key: periodKey, setPeriod } = useDashboardPeriod();

  const dashboard = useApiQuery(
    async (): Promise<DashboardData> => {
      const { from, to } = resolveWindow(period, new Date());
      const [kpi, team, attention, attentionSummary] = await Promise.all([
        repo.getKPIs(from, to),
        repo.getTeamStats(from, to),
        repo.getAttention(ATTENTION_LIMIT),
        repo.getAttentionSummary(),
      ]);
      return { kpi, team, attention, attentionSummary };
    },
    [periodKey],
    { liveTopics: ["lead", "payment", "document", "task", "conversation", "booking", "departure"] },
  );

  const targets = useApiQuery(
    (): Promise<TargetProgress[]> => targetRepo.active(),
    [],
    { enabled: canTargets, liveTopics: ["target", "payment", "booking"] },
  );

  const revenue = useApiQuery(
    async (): Promise<RevenueSummary> => {
      const { from, to } = resolveWindow(period, new Date());
      return repo.getRevenue(from, to);
    },
    [periodKey],
    { enabled: canFinance, liveTopics: ["payment", "booking"] },
  );

  const periodControl = <DashboardPeriodPicker value={period} onChange={setPeriod} locale={locale} />;

  return (
    <ListScreen title={t("title")} description={t("subtitle")} actions={periodControl}>
      <SetupResumeBanner />
      <CommandBar />

      {dashboard.data ? (
        <DashboardGrid
          data={dashboard.data}
          locale={locale}
          targetSlot={
            canTargets ? (
              <ActiveTargetsWidget
                targets={targets.data ?? null}
                loading={targets.loading}
                error={targets.error}
                onRetry={() => void targets.reload()}
                locale={locale}
                canManage={canManageTargets}
              />
            ) : null
          }
          revenueSlot={
            canFinance ? (
              <RevenueCardState
                data={revenue.data}
                loading={revenue.loading}
                error={revenue.error}
                onRetry={() => void revenue.reload()}
                locale={locale}
                periodDays={periodDays(period)}
              />
            ) : null
          }
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

type GridProps = { data: DashboardData; locale: string; aiSlot: ReactNode; targetSlot: ReactNode; revenueSlot: ReactNode };

function DashboardGrid({ data, locale, aiSlot, targetSlot, revenueSlot }: GridProps) {
  const t = useTranslations("manager");
  const { kpi, team, attention, attentionSummary } = data;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="manager-kpis">
        <StatTile href={routes.pipeline} label={t("kpi.leadsOpen")} value={kpi.leadsOpen} icon={Kanban} tone="sky" />
        <StatTile href={routes.tasks} label={t("kpi.tasksOverdue")} value={kpi.tasksOverdue} icon={AlarmClock} tone="amber" />
        <StatTile href={routes.bookings} label={t("kpi.bookingsUnpaid")} value={kpi.bookingsUnpaid} icon={Wallet} tone="rose" />
        <StatTile href={routes.tasks} label={t("kpi.missingDocs")} value={kpi.missingDocs} icon={FileWarning} tone="violet" />
      </div>

      {aiSlot}

      {targetSlot && revenueSlot ? (
        <div className="grid gap-4 lg:grid-cols-3" data-testid="manager-money-row">
          {targetSlot}
          <div className="lg:col-span-2">{revenueSlot}</div>
        </div>
      ) : (
        targetSlot ?? revenueSlot
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <AttentionWidget items={attention} summary={attentionSummary} locale={locale} />
        <TeamWidget members={team} locale={locale} />
      </div>
    </>
  );
}
