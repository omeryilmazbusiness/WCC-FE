"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlarmClock, Briefcase, Kanban, Wallet } from "lucide-react";
import {
  createDashboardRepository,
  type TargetSnapshot,
} from "@/entities/dashboard";
import { createBookingWorkspaceRepository } from "@/entities/booking";
import { createLeadRepository, type Lead } from "@/entities/lead";
import {
  createTaskRepository,
  type Task,
  type TaskRepository,
} from "@/entities/task";
import { useCan } from "@/entities/viewer";
import { useSessionUser } from "@/shared/api/session-context";
import { routes } from "@/shared/config/routes";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { ListScreen, QueryState, StatTile } from "@/shared/ui";
import { CommandBar } from "@/widgets/manager-dashboard";
import { homeKpis, openLeads, orderTasks } from "../model/home-metrics";
import { MyTargetWidget } from "./my-target-widget";
import { PipelineWidget } from "./pipeline-widget";
import { TasksWidget } from "./tasks-widget";

const dashRepo = createDashboardRepository();
const defaultTaskRepository = createTaskRepository();
const leadRepo = createLeadRepository();
const bookingRepo = createBookingWorkspaceRepository();

type HomeData = {
  tasks: Task[];
  leads: Lead[];
  target: TargetSnapshot | null;
  workOrder: string[];
  paymentDue: number;
};

type Props = {
  taskRepository?: TaskRepository;
};

export function EmployeeHomeBoard({ taskRepository = defaultTaskRepository }: Props) {
  const t = useTranslations("workspace");
  const tc = useTranslations("common");
  const locale = useLocale();
  const user = useSessionUser();
  const canLeads = useCan("leads.read");
  const canTargets = useCan("targets.read");
  const canBookings = useCan("bookings.read");

  const home = useApiQuery(
    async (): Promise<HomeData> => {
      const [tasks, leads, target, work, bookingStats] = await Promise.all([
        taskRepository.listToday(user.id),
        canLeads ? leadRepo.list({ ownerId: user.id }) : Promise.resolve<Lead[]>([]),
        canTargets ? dashRepo.getTarget("personal") : Promise.resolve<TargetSnapshot | null>(null),
        dashRepo.getMyWork(30),
        canBookings ? bookingRepo.stats({ ownerId: user.id }) : Promise.resolve(null),
      ]);
      return {
        tasks,
        leads: leads.filter((l) => l.ownerId === user.id),
        target,
        workOrder: work.filter((i) => i.source === "task").map((i) => i.id),
        paymentDue: bookingStats ? bookingStats.paymentDue + bookingStats.overdue : 0,
      };
    },
    [taskRepository, user.id, canLeads, canTargets, canBookings],
    {
      liveTopics: ["task", "lead", "conversation", "target", "booking", "payment"],
      cacheKey: ["employee-home", user.id, canLeads, canTargets, canBookings],
    },
  );

  const setHome = home.setData;
  const tasks = home.data?.tasks ?? [];
  const leads = home.data?.leads ?? [];
  const target = home.data?.target ?? null;
  const workOrder = useMemo(() => home.data?.workOrder ?? [], [home.data]);
  const orderedTasks = useMemo(() => orderTasks(tasks, workOrder), [tasks, workOrder]);
  const kpis = useMemo(
    () => homeKpis({ leads, tasks: orderedTasks, paymentDue: home.data?.paymentDue ?? 0 }),
    [leads, orderedTasks, home.data?.paymentDue],
  );

  function upsert(task: Task) {
    setHome((prev) => {
      if (!prev) return prev;
      const rest = prev.tasks.filter((x) => x.id !== task.id);
      const done = task.status === "done" || task.status === "cancelled";
      return { ...prev, tasks: done ? rest : [task, ...rest] };
    });
  }

  return (
    <ListScreen title={t("title")} description={t("subtitle")}>
      <div data-testid="employee-home" className="flex flex-col gap-6">
        <CommandBar />

        {home.data ? (
          <>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-6" data-testid="home-kpis">
              {canLeads ? (
                <StatTile href={routes.pipeline} label={t("kpi.leadsOpen")} value={kpis.leadsOpen} icon={Kanban} tone="sky" />
              ) : null}
              <StatTile href={routes.tasks} label={t("kpi.tasksOverdue")} value={kpis.tasksOverdue} icon={AlarmClock} tone="amber" />
              <StatTile href={routes.tasks} label={t("kpi.tasksOpen")} value={kpis.tasksOpen} icon={Briefcase} tone="violet" />
              {canBookings ? (
                <StatTile href={routes.bookings} label={t("kpi.paymentDue")} value={kpis.paymentDue} icon={Wallet} tone="rose" />
              ) : null}
            </div>

            {target && target.status !== "placeholder" ? <MyTargetWidget target={target} locale={locale} /> : null}

            <div className="grid items-start gap-5 lg:grid-cols-2 lg:gap-6">
              <TasksWidget tasks={orderedTasks} repository={taskRepository} onChanged={upsert} />
              {canLeads ? <PipelineWidget leads={openLeads(leads)} /> : null}
            </div>
          </>
        ) : (
          <QueryState
            loadingVariant="cards"
            loading={home.loading}
            loadingLabel={tc("loading")}
            error={home.error}
            onRetry={() => void home.reload()}
          >
            {null}
          </QueryState>
        )}
      </div>
    </ListScreen>
  );
}
