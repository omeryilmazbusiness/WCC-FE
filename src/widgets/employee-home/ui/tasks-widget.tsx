"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlarmClock, Briefcase, Flame, Loader } from "lucide-react";
import { isTaskClosed, isTaskOverdue, summarizeTasks, type Task, type TaskRepository } from "@/entities/task";
import { routes } from "@/shared/config/routes";
import { WidgetCard } from "@/shared/ui";
import { TaskQueueList } from "@/widgets/tasks-board";
import { MetricTile } from "@/widgets/manager-dashboard";
import { filterHomeTasks, type TaskHomeFilter } from "../model/home-metrics";

type Props = {
  tasks: Task[];
  repository: TaskRepository;
  onChanged: (task: Task) => void;
};

const FILTERS: { key: TaskHomeFilter; icon: typeof Briefcase; tone: "sky" | "amber" | "violet" | "rose" }[] = [
  { key: "all", icon: Briefcase, tone: "sky" },
  { key: "overdue", icon: AlarmClock, tone: "amber" },
  { key: "progress", icon: Loader, tone: "violet" },
  { key: "critical", icon: Flame, tone: "rose" },
];

/** Today's queue in the same widget language as the GM attention card. */
export function TasksWidget({ tasks, repository, onChanged }: Props) {
  const t = useTranslations("workspace");
  const [filter, setFilter] = useState<TaskHomeFilter>("all");
  const stats = useMemo(() => summarizeTasks(tasks), [tasks]);
  const visible = useMemo(() => filterHomeTasks(tasks, filter), [tasks, filter]);
  const counts: Record<TaskHomeFilter, number> = {
    all: stats.open,
    overdue: stats.overdue,
    progress: tasks.filter((x) => x.status === "in_progress").length,
    critical: stats.critical,
  };

  return (
    <WidgetCard
      title={t("tasksTitle")}
      icon={Briefcase}
      tone="sky"
      count={stats.open}
      href={routes.tasks}
      hrefLabel={t("openTasks")}
      actions={
        stats.overdue > 0 ? (
          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
            {t("overdueCount", { count: stats.overdue })}
          </span>
        ) : null
      }
      data-testid="my-work-today"
    >
      <div className="grid grid-cols-4 gap-2" role="group" aria-label={t("taskFilter")}>
        {FILTERS.map((f) => (
          <MetricTile
            key={f.key}
            icon={f.icon}
            tone={f.tone}
            value={counts[f.key]}
            label={t(`taskTiles.${f.key}`)}
            active={filter === f.key}
            disabled={counts[f.key] === 0}
            alert={f.key === "overdue" && counts.overdue > 0}
            onClick={() => setFilter(filter === f.key && f.key !== "all" ? "all" : f.key)}
            data-testid={`home-task-tile-${f.key}`}
          />
        ))}
      </div>

      <div className="mt-4 min-h-0 flex-1">
        <TaskQueueList
          tasks={visible}
          repository={repository}
          onChanged={onChanged}
          emptyTitle={t(filter === "all" ? "queueEmpty" : "queueEmptyFiltered")}
          emptyHint={t("queueEmptyHint")}
        />
      </div>

      {visible.some((x) => !isTaskClosed(x) && isTaskOverdue(x)) ? (
        <p className="mt-2 text-center text-[11px] font-medium text-amber-600">{t("overdueHint")}</p>
      ) : null}
    </WidgetCard>
  );
}
