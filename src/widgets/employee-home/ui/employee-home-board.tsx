"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Briefcase, GitBranch, Target } from "lucide-react";
import {
  getMemoryDashboardRepository,
  type TargetSnapshot,
} from "@/entities/dashboard";
import {
  getMemoryTaskRepository,
  type Task,
  type TaskRepository,
} from "@/entities/task";
import { createLeadRepository, type Lead } from "@/entities/lead";
import { useSessionUser } from "@/shared/api/session-context";
import { routes } from "@/shared/config/routes";
import { Link } from "@/shared/i18n/navigation";
import {
  EmptyState,
  MetricCard,
  PageHeader,
  Screen,
  StageBadge,
  LEAD_STAGE_TONES,
  SurfacePanel,
} from "@/shared/ui";
import { TaskQueueList } from "@/widgets/tasks-board";

type Props = {
  taskRepository?: TaskRepository;
};

export function EmployeeHomeBoard({
  taskRepository = getMemoryTaskRepository(),
}: Props) {
  const t = useTranslations("workspace");
  const tp = useTranslations("pipeline");
  const tc = useTranslations("common");
  const user = useSessionUser();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [target, setTarget] = useState<TargetSnapshot | null>(null);

  useEffect(() => {
    void taskRepository.listToday(user.id).then(setTasks);
    void createLeadRepository().list().then((all) =>
      setLeads(all.filter((l) => l.ownerId === user.id)),
    );
    void getMemoryDashboardRepository()
      .getTargetPlaceholder()
      .then(setTarget);
  }, [taskRepository, user.id]);

  function upsert(task: Task) {
    setTasks((prev) => {
      if (!prev) return prev;
      const rest = prev.filter((x) => x.id !== task.id);
      if (task.status === "done" || task.status === "cancelled") return rest;
      return [task, ...rest];
    });
  }

  const pipelinePreview = useMemo(() => {
    if (!leads) return [];
    return leads
      .filter((l) => l.stage !== "won" && l.stage !== "lost")
      .slice(0, 5);
  }, [leads]);

  if (!tasks || !leads || !target) {
    return (
      <Screen>
        <p className="text-sm font-medium text-zinc-500">{tc("loading")}</p>
      </Screen>
    );
  }

  const progressPct = Math.round(
    (target.actualAmount / target.targetAmount) * 100,
  );

  return (
    <Screen data-testid="employee-home">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <SurfacePanel
          title={t("tasksTitle")}
          description={t("tasksBody")}
          icon={Briefcase}
          accent="sky"
          actions={
            <Link
              href={routes.tasks}
              className="text-xs font-semibold text-sky-700 hover:underline"
            >
              {t("openTasks")}
            </Link>
          }
          data-testid="my-work-today"
        >
          <TaskQueueList
            tasks={tasks}
            repository={taskRepository}
            onChanged={upsert}
            emptyTitle={t("queueEmpty")}
            emptyHint={t("queueEmptyHint")}
          />
        </SurfacePanel>

        <div className="flex flex-col gap-5">
          <SurfacePanel
            title={t("targetTitle")}
            description={t("targetBody")}
            icon={Target}
            accent="emerald"
            data-testid="target-placeholder"
          >
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label={t("targetActual")}
                value={`${(target.actualAmount / 1000).toFixed(0)}k`}
                icon={Target}
                accent="emerald"
                hint={`${progressPct}%`}
              />
              <MetricCard
                label={t("targetExpected")}
                value={`${(target.expectedToDate / 1000).toFixed(0)}k`}
                icon={Target}
                accent="sky"
                hint={t(`targetStatus.${target.status}`)}
              />
            </div>
          </SurfacePanel>

          <SurfacePanel
            title={t("pipelineTitle")}
            description={t("pipelineBody")}
            icon={GitBranch}
            accent="violet"
            data-testid="my-pipeline"
          >
            {pipelinePreview.length === 0 ? (
              <EmptyState title={t("pipelineEmpty")} />
            ) : (
              <ul className="flex flex-col gap-2">
                {pipelinePreview.map((lead) => (
                  <li
                    key={lead.id}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-zinc-200/70 bg-zinc-50/80 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950">
                        {lead.fullName}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {lead.phone}
                      </p>
                    </div>
                    <StageBadge
                      tone={LEAD_STAGE_TONES[lead.stage]}
                      label={tp(`stages.${lead.stage}`)}
                    />
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={routes.pipeline}
              className="mt-3 inline-block text-xs font-semibold text-violet-700 hover:underline"
            >
              {t("openPipeline")}
            </Link>
          </SurfacePanel>
        </div>
      </div>
    </Screen>
  );
}
