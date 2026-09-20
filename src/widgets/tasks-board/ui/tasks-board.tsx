"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  canTransitionTask,
  groupTasksByStatus,
  TASK_BOARD_COLUMNS,
  type Task,
  type TaskRepository,
  type TaskStatus,
} from "@/entities/task";
import {
  EmptyState,
  ListScreen,
  SearchFilterBar,
  SegmentedControl,
  useToast,
} from "@/shared/ui";
import { TaskColumn } from "./task-column";
import { TaskTable } from "./task-table";

type ViewMode = "kanban" | "table";

type Props = {
  repository: TaskRepository;
  initialTasks: Task[];
  /** When set, board scopes to this assignee (employee mine view). */
  assigneeId?: string;
};

export function TasksBoard({ repository, initialTasks, assigneeId }: Props) {
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const { push } = useToast();
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<ViewMode>("kanban");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  function upsert(task: Task) {
    setTasks((prev) => {
      const rest = prev.filter((x) => x.id !== task.id);
      return [task, ...rest];
    });
  }

  const scoped = useMemo(() => {
    let list = tasks;
    if (assigneeId) list = list.filter((t) => t.assigneeId === assigneeId);
    const q = query.trim().toLowerCase();
    return list.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (!q) return true;
      return (
        task.title.toLowerCase().includes(q) ||
        task.relatedLabel.toLowerCase().includes(q) ||
        task.assigneeName.toLowerCase().includes(q) ||
        task.kind.includes(q)
      );
    });
  }, [tasks, assigneeId, query, statusFilter]);

  const byStatus = useMemo(() => groupTasksByStatus(scoped), [scoped]);

  async function handleDrop(taskId: string, status: TaskStatus) {
    const task = tasks.find((x) => x.id === taskId);
    if (!task || task.status === status) return;
    if (!canTransitionTask(task.status, status)) {
      push({
        title: t("invalidMoveTitle"),
        description: t("invalidMoveBody"),
        tone: "info",
      });
      return;
    }
    try {
      const updated = await repository.changeStatus(taskId, status);
      upsert(updated);
      push({
        title: t("movedTitle"),
        description: t("movedBody", { status: t(`statuses.${status}`) }),
        tone: "success",
      });
    } catch {
      push({ title: t("actionError"), tone: "error" });
    }
  }

  const isFiltered = query.length > 0 || statusFilter !== "all";

  return (
    <ListScreen
      title={t("title")}
      description={t("subtitle")}
      actions={
        <SegmentedControl
          aria-label={t("viewMode")}
          value={view}
          onChange={setView}
          options={[
            { value: "kanban", label: t("kanban") },
            { value: "table", label: t("table") },
          ]}
        />
      }
      toolbar={
        <SearchFilterBar
          value={query}
          onValueChange={setQuery}
          placeholder={t("searchPlaceholder")}
          clearLabel={tc("clearSearch")}
          filterLabel={tc("filter")}
          resetLabel={tc("resetFilters")}
          isFiltered={isFiltered}
          onReset={() => {
            setQuery("");
            setStatusFilter("all");
          }}
          sections={[
            {
              id: "status",
              label: t("fields.status"),
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "all", label: t("filterAll"), count: tasks.length },
                ...TASK_BOARD_COLUMNS.map((s) => ({
                  value: s,
                  label: t(`statuses.${s}`),
                  count: tasks.filter((x) => x.status === s).length,
                })),
                {
                  value: "cancelled",
                  label: t("statuses.cancelled"),
                  count: tasks.filter((x) => x.status === "cancelled").length,
                },
              ],
            },
          ]}
        />
      }
    >
      {scoped.length === 0 ? (
        <EmptyState
          title={t("empty")}
          description={isFiltered ? t("emptyHint") : t("emptyHint")}
        />
      ) : view === "table" ? (
        <TaskTable
          tasks={scoped}
          repository={repository}
          onChanged={upsert}
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {TASK_BOARD_COLUMNS.map((status) => (
            <TaskColumn
              key={status}
              status={status}
              tasks={byStatus[status]}
              repository={repository}
              onChanged={upsert}
              onDropTask={handleDrop}
            />
          ))}
        </div>
      )}
    </ListScreen>
  );
}
