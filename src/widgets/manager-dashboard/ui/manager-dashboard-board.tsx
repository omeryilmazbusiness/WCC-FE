"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  ClipboardList,
  FileWarning,
  Plus,
  Users,
  Wallet,
} from "lucide-react";
import {
  getMemoryDashboardRepository,
  type DashboardKPI,
  type TeamMemberStat,
} from "@/entities/dashboard";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import {
  Button,
  DataTable,
  ListScreen,
  MetricCard,
  SurfacePanel,
} from "@/shared/ui";

export function ManagerDashboardBoard() {
  const t = useTranslations("manager");
  const tc = useTranslations("common");
  const [kpi, setKpi] = useState<DashboardKPI | null>(null);
  const [team, setTeam] = useState<TeamMemberStat[] | null>(null);

  useEffect(() => {
    const repo = getMemoryDashboardRepository();
    void repo.getKPIs().then(setKpi);
    void repo.getTeamStats().then(setTeam);
  }, []);

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

  if (!kpi || !team) {
    return (
      <ListScreen title={t("title")} description={t("subtitle")}>
        <p className="text-sm font-medium text-zinc-500">{tc("loading")}</p>
      </ListScreen>
    );
  }

  return (
    <ListScreen
      title={t("title")}
      description={t("subtitle")}
      actions={
        <div className="flex flex-wrap gap-2" data-testid="manager-quick-actions">
          <Button asChild size="sm" variant="outline">
            <Link href={routes.pipeline}>
              <Plus className="h-4 w-4" />
              {t("quick.lead")}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={routes.tasks}>
              <ClipboardList className="h-4 w-4" />
              {t("quick.tasks")}
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
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="manager-kpis"
      >
        <MetricCard
          label={t("kpi.leadsOpen")}
          value={kpi.leadsOpen}
          icon={ClipboardList}
          accent="sky"
        />
        <MetricCard
          label={t("kpi.tasksOverdue")}
          value={kpi.tasksOverdue}
          icon={AlertTriangle}
          accent="amber"
        />
        <MetricCard
          label={t("kpi.bookingsUnpaid")}
          value={kpi.bookingsUnpaid}
          icon={Wallet}
          accent="rose"
        />
        <MetricCard
          label={t("kpi.missingDocs")}
          value={kpi.missingDocs}
          icon={FileWarning}
          accent="violet"
        />
      </div>

      <SurfacePanel
        title={t("teamTitle")}
        description={t("teamBody")}
        icon={Users}
        accent="zinc"
        className="mt-5"
        data-testid="manager-team"
      >
        <DataTable
          columns={columns}
          data={team}
          emptyMessage={t("teamEmpty")}
        />
      </SurfacePanel>
    </ListScreen>
  );
}
