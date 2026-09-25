"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  ClipboardList,
  FileWarning,
  Package,
  Plus,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import {
  createDashboardRepository,
  type AttentionItem,
  type DashboardKPI,
  type TargetSnapshot,
  type TeamMemberStat,
} from "@/entities/dashboard";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import {
  Badge,
  Button,
  DataTable,
  ListScreen,
  MetricCard,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SurfacePanel,
} from "@/shared/ui";
import { AIExecutiveSummaryCard } from "./ai-executive-summary-card";
import { BranchSetupHost } from "@/features/branch-setup";

const repo = createDashboardRepository();

function periodDays(days: number): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - days);
  return { from, to };
}

function hrefForAttention(item: AttentionItem): string {
  switch (item.hrefHint) {
    case "bookings":
      return routes.bookings;
    case "packages":
      return routes.packages;
    case "pipeline":
      return routes.pipeline;
    case "tasks":
    default:
      return routes.tasks;
  }
}

const ATTENTION_KINDS = new Set([
  "overdue_task",
  "unpaid_booking",
  "missing_doc",
  "capacity",
  "escalated_task",
]);

function attentionKindLabel(
  t: ReturnType<typeof useTranslations<"manager">>,
  kind: string,
): string {
  if (ATTENTION_KINDS.has(kind)) {
    return t(`attentionKinds.${kind}` as "attentionKinds.overdue_task");
  }
  return kind;
}

export function ManagerDashboardBoard() {
  const t = useTranslations("manager");
  const tc = useTranslations("common");
  const [days, setDays] = useState("30");
  const [kpi, setKpi] = useState<DashboardKPI | null>(null);
  const [team, setTeam] = useState<TeamMemberStat[] | null>(null);
  const [attention, setAttention] = useState<AttentionItem[]>([]);
  const [target, setTarget] = useState<TargetSnapshot | null>(null);

  useEffect(() => {
    const { from, to } = periodDays(Number(days) || 30);
    void repo.getKPIs(from, to).then(setKpi);
    void repo.getTeamStats(from, to).then(setTeam);
    void repo.getAttention(12).then(setAttention);
    void repo.getTarget("branch").then(setTarget);
  }, [days]);

  const columns = useMemo<ColumnDef<TeamMemberStat>[]>(
    () => [
      { accessorKey: "name", header: t("team.name") },
      { accessorKey: "leadsHandled", header: t("team.leads") },
      { accessorKey: "openTasks", header: t("team.openTasks") },
      { accessorKey: "overdueTasks", header: t("team.overdue") },
      { accessorKey: "revenueShare", header: t("team.wins") },
    ],
    [t],
  );

  if (!kpi || !team || !target) {
    return (
      <ListScreen title={t("title")} description={t("subtitle")}>
        <p className="text-sm font-medium text-zinc-500">{tc("loading")}</p>
      </ListScreen>
    );
  }

  const progressPct =
    target.targetAmount > 0
      ? Math.round((target.actualAmount / target.targetAmount) * 100)
      : 0;

  return (
    <ListScreen
      title={t("title")}
      description={t("subtitle")}
      actions={
        <div className="flex flex-wrap items-center gap-2" data-testid="manager-quick-actions">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px]" aria-label={t("period")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t("period7")}</SelectItem>
              <SelectItem value="30">{t("period30")}</SelectItem>
              <SelectItem value="90">{t("period90")}</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild size="sm" variant="outline">
            <Link href={routes.pipeline}>
              <Plus className="h-4 w-4" />
              {t("quick.lead")}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={routes.bookings}>
              <Plus className="h-4 w-4" />
              {t("quick.booking")}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={routes.tasks}>
              <ClipboardList className="h-4 w-4" />
              {t("quick.tasks")}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={routes.packages}>
              <Package className="h-4 w-4" />
              {t("quick.package")}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={routes.customers}>
              <Users className="h-4 w-4" />
              {t("quick.customers")}
            </Link>
          </Button>
        </div>
      }
    >
      <BranchSetupHost />

      <SurfacePanel
        title={target.label}
        description={t("targetHeroBody", { pct: progressPct })}
        icon={Target}
        accent="emerald"
        className="mb-5"
        data-testid="manager-target-hero"
      >
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("targetActual")}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-950">
              {(target.actualAmount / 100).toLocaleString()} {target.currency}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("targetGoal")}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-700">
              {(target.targetAmount / 100).toLocaleString()} {target.currency}
            </p>
          </div>
          <Badge className="bg-emerald-50 text-emerald-800">
            {t(`targetStatus.${target.status}`)}
          </Badge>
        </div>
      </SurfacePanel>

      <AIExecutiveSummaryCard />

      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="manager-kpis"
      >
        <Link href={routes.pipeline} className="block">
          <MetricCard
            label={t("kpi.leadsOpen")}
            value={kpi.leadsOpen}
            icon={ClipboardList}
            accent="sky"
          />
        </Link>
        <Link href={`${routes.tasks}`} className="block">
          <MetricCard
            label={t("kpi.tasksOverdue")}
            value={kpi.tasksOverdue}
            icon={AlertTriangle}
            accent="amber"
          />
        </Link>
        <Link href={routes.bookings} className="block">
          <MetricCard
            label={t("kpi.bookingsUnpaid")}
            value={kpi.bookingsUnpaid}
            icon={Wallet}
            accent="rose"
          />
        </Link>
        <Link href={routes.tasks} className="block">
          <MetricCard
            label={t("kpi.missingDocs")}
            value={kpi.missingDocs}
            icon={FileWarning}
            accent="violet"
          />
        </Link>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <SurfacePanel
          title={t("attentionTitle")}
          description={t("attentionBody")}
          icon={AlertTriangle}
          accent="amber"
          data-testid="manager-attention"
        >
          {attention.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("attentionEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {attention.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    href={hrefForAttention(item)}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white px-3 py-2.5 hover:border-zinc-300"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950">
                        {item.title}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {attentionKindLabel(t, item.kind)} · {item.ageHours}h
                      </p>
                    </div>
                    <Badge
                      className={
                        item.severity === "high"
                          ? "bg-rose-50 text-rose-800"
                          : "bg-amber-50 text-amber-900"
                      }
                    >
                      {item.severity}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SurfacePanel>

        <SurfacePanel
          title={t("teamTitle")}
          description={t("teamBody")}
          icon={Users}
          accent="zinc"
          data-testid="manager-team"
        >
          <DataTable
            columns={columns}
            data={team}
            emptyMessage={t("teamEmpty")}
          />
        </SurfacePanel>
      </div>
    </ListScreen>
  );
}
