"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import {
  canTransitionTask,
  filterTasks,
  groupTasksByStatus,
  summarizeTasks,
  TASK_BOARD_COLUMNS,
  TASK_KINDS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskKind,
  type TaskPriority,
  type TaskRepository,
  type TaskStatus,
} from "@/entities/task";
import { useCan } from "@/entities/viewer";
import { BulkAssignTasksDialog } from "@/features/bulk-assign-tasks";
import { CreateTaskDialog } from "@/features/create-task";
import { useDragScroll } from "@/shared/lib/use-drag-scroll";
import { Screen, SearchFilterBar, useMutationFeedback, useToast } from "@/shared/ui";
import { TaskColumn, type DropState } from "./task-column";
import { TaskTable } from "./task-table";
import { TasksHeader, type TaskViewMode } from "./tasks-header";
import { TasksStats, type StatFilter } from "./tasks-stats";

type Props = {
  repository: TaskRepository;
  initialTasks: Task[];
  /** Restricts the board to one person's tasks (personal board). */
  assigneeId?: string;
  managerMode?: boolean;
};

const PREFS_KEY = "wcc.tasks.prefs";

function readView(): TaskViewMode | null {
  try {
    const raw = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? "{}") as Record<string, unknown>;
    return raw.view === "table" || raw.view === "kanban" ? raw.view : null;
  } catch {
    return null;
  }
}

export function TasksBoard({ repository, initialTasks, assigneeId, managerMode }: Props) {
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const locale = useLocale();
  const canWrite = useCan("tasks.write");
  const { push } = useToast();
  const feedback = useMutationFeedback();
  const boardRef = useDragScroll<HTMLDivElement>();

  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<TaskViewMode>("kanban");
  const [prefsReady, setPrefsReady] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>("all");
  const [kindFilter, setKindFilter] = useState<"all" | TaskKind>("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [statFilter, setStatFilter] = useState<StatFilter>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [dragging, setDragging] = useState<Task | null>(null);

  useEffect(() => setTasks(initialTasks), [initialTasks]);
  useEffect(() => {
    const saved = readView();
    if (saved) setView(saved);
    setPrefsReady(true);
  }, []);
  useEffect(() => {
    if (prefsReady) window.localStorage.setItem(PREFS_KEY, JSON.stringify({ view }));
  }, [prefsReady, view]);

  function upsert(task: Task) {
    setTasks((prev) => {
      const i = prev.findIndex((x) => x.id === task.id);
      if (i === -1) return [task, ...prev];
      const next = prev.slice();
      next[i] = task;
      return next;
    });
  }

  const mine = useMemo(() => (assigneeId ? tasks.filter((x) => x.assigneeId === assigneeId) : tasks), [tasks, assigneeId]);

  const assignees = useMemo(() => {
    const byId = new Map<string, string>();
    for (const task of mine) if (task.assigneeId) byId.set(task.assigneeId, task.assigneeName || task.assigneeId);
    return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [mine, locale]);

  const base = useMemo(
    () => filterTasks(mine, { q: search, priority: priorityFilter, kind: kindFilter, assigneeId: assigneeFilter }),
    [mine, search, priorityFilter, kindFilter, assigneeFilter],
  );
  const stats = useMemo(() => summarizeTasks(base), [base]);
  const visible = useMemo(
    () =>
      filterTasks(base, {
        status: view === "table" ? statusFilter : "all",
        overdueOnly: statFilter === "overdue",
        criticalOnly: statFilter === "critical",
      }),
    [base, view, statusFilter, statFilter],
  );
  const byStatus = useMemo(() => groupTasksByStatus(visible), [visible]);
  const tableRows = useMemo(() => [...TASK_STATUSES].flatMap((s) => byStatus[s]), [byStatus]);

  function dropStateFor(status: TaskStatus): DropState {
    if (!dragging || dragging.status === status) return "idle";
    return canTransitionTask(dragging.status, status) ? "allowed" : "blocked";
  }

  async function handleDrop(taskId: string, status: TaskStatus) {
    setDragging(null);
    const task = tasks.find((x) => x.id === taskId);
    if (!task || task.status === status) return;
    if (!canTransitionTask(task.status, status)) {
      push({ title: t("invalidMoveTitle"), description: t("invalidMoveBody"), tone: "info" });
      return;
    }
    try {
      upsert(await repository.changeStatus(taskId, status));
      push({ title: t("movedTitle"), description: t("movedBody", { status: t(`statuses.${status}`) }), tone: "success" });
    } catch (err) {
      feedback.error(err, t("actionError"));
    }
  }

  const isFiltered =
    search.length > 0 ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    kindFilter !== "all" ||
    assigneeFilter !== "all" ||
    statFilter !== null;

  const count = (pred: (task: Task) => boolean) => mine.filter(pred).length;
  const sections = [
    {
      id: "priority",
      label: t("fields.priority"),
      value: priorityFilter,
      onChange: (v: string) => setPriorityFilter(v as "all" | TaskPriority),
      options: [
        { value: "all", label: t("filterAny") },
        ...TASK_PRIORITIES.map((p) => ({ value: p, label: t(`priorities.${p}`), count: count((x) => x.priority === p) })),
      ],
    },
    {
      id: "kind",
      label: t("fields.kind"),
      value: kindFilter,
      onChange: (v: string) => setKindFilter(v as "all" | TaskKind),
      options: [
        { value: "all", label: t("filterAny") },
        ...TASK_KINDS.map((k) => ({ value: k, label: t(`kinds.${k}`), count: count((x) => x.kind === k) })),
      ],
    },
    ...(managerMode && assignees.length > 1
      ? [
          {
            id: "assignee",
            label: t("fields.assignee"),
            value: assigneeFilter,
            onChange: setAssigneeFilter,
            options: [{ value: "all", label: t("filterAny") }, ...assignees.map((a) => ({ value: a.id, label: a.name }))],
          },
        ]
      : []),
    ...(view === "table"
      ? [
          {
            id: "status",
            label: t("fields.status"),
            value: statusFilter,
            onChange: (v: string) => setStatusFilter(v as "all" | TaskStatus),
            options: [
              { value: "all", label: t("filterAll") },
              ...TASK_STATUSES.map((s) => ({ value: s, label: t(`statuses.${s}`), count: count((x) => x.status === s) })),
            ],
          },
        ]
      : []),
  ];

  return (
    <Screen>
      <TasksHeader
        managerMode={managerMode}
        view={view}
        onViewChange={setView}
        actions={
          <>
            {managerMode && view === "table" ? (
              <BulkAssignTasksDialog
                repository={repository}
                taskIds={selected}
                onAssigned={(updated) => {
                  for (const u of updated) upsert(u);
                  setSelected([]);
                }}
              />
            ) : null}
            <CreateTaskDialog
              repository={repository}
              canAssignOthers={managerMode}
              onCreated={upsert}
              trigger={
                <button
                  type="button"
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-zinc-950 px-4 text-[13px] font-semibold text-white shadow-[0_12px_24px_-14px_rgba(15,23,42,0.8)] transition hover:bg-zinc-800"
                  data-testid="tasks-new"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden />
                  {t("newTask")}
                </button>
              }
            />
          </>
        }
      />

      <div
        className="flex flex-col gap-3 min-[1440px]:flex-row min-[1440px]:items-start min-[1440px]:gap-4"
        data-testid="tasks-toolbar"
      >
        <div className="min-w-0 min-[1440px]:max-w-2xl min-[1440px]:flex-1">
          <SearchFilterBar
            variant="hero"
            value={search}
            onValueChange={setSearch}
            placeholder={t("searchPlaceholder")}
            clearLabel={tc("clearSearch")}
            filterLabel={tc("filter")}
            resetLabel={tc("resetFilters")}
            isFiltered={isFiltered}
            onReset={() => {
              setSearch("");
              setStatusFilter("all");
              setPriorityFilter("all");
              setKindFilter("all");
              setAssigneeFilter("all");
              setStatFilter(null);
            }}
            sections={sections}
          />
        </div>
        <div className="min-[1440px]:ms-auto min-[1440px]:w-[40rem]">
          <TasksStats
            stats={stats}
            locale={locale}
            active={statFilter}
            onToggle={(f) => setStatFilter((cur) => (cur === f ? null : f))}
          />
        </div>
      </div>

      {view === "kanban" ? (
        <div
          ref={boardRef}
          className="-mx-1 flex cursor-grab gap-3.5 overflow-x-auto px-1 pb-3 select-none [scrollbar-width:thin] data-[panning]:cursor-grabbing data-[panning]:*:pointer-events-none"
          data-testid="tasks-board"
        >
          {TASK_BOARD_COLUMNS.map((status) => (
            <TaskColumn
              key={status}
              status={status}
              tasks={byStatus[status]}
              locale={locale}
              repository={repository}
              canWrite={canWrite}
              showAssignee={Boolean(managerMode)}
              dropState={dropStateFor(status)}
              draggingId={dragging?.id ?? null}
              onChanged={upsert}
              onDropTask={(id, s) => void handleDrop(id, s)}
              onDragStart={setDragging}
              onDragEnd={() => setDragging(null)}
            />
          ))}
        </div>
      ) : (
        <TaskTable
          tasks={tableRows}
          locale={locale}
          repository={repository}
          onChanged={upsert}
          selectable={managerMode}
          selectedIds={selected}
          onSelectionChange={setSelected}
        />
      )}
    </Screen>
  );
}
