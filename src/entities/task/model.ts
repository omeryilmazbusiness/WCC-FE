export type TaskStatus = "open" | "in_progress" | "done" | "cancelled";
export type TaskKind = "followup" | "document" | "payment" | "custom";

export const TASK_STATUSES: TaskStatus[] = [
  "open",
  "in_progress",
  "done",
  "cancelled",
];

/** Kanban columns (cancelled filtered separately). */
export const TASK_BOARD_COLUMNS: TaskStatus[] = [
  "open",
  "in_progress",
  "done",
];

export const TASK_KINDS: TaskKind[] = ["followup", "document", "payment", "custom"];

/** Importance scale, most important first. */
export type TaskPriority = "critical" | "major" | "minor";

export const TASK_PRIORITIES: TaskPriority[] = ["critical", "major", "minor"];

const PRIORITY_ALIASES: Record<string, TaskPriority> = {
  critical: "critical",
  urgent: "critical",
  major: "major",
  high: "major",
  minor: "minor",
  normal: "minor",
  low: "minor",
};

/** Maps API values, including the retired low/normal/high/urgent scale, onto the current one. */
export function normalizeTaskPriority(raw: unknown): TaskPriority {
  return PRIORITY_ALIASES[String(raw ?? "").trim().toLowerCase()] ?? "minor";
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return TASK_PRIORITIES.includes(value as TaskPriority);
}

export type Task = {
  id: string;
  branchId: string;
  title: string;
  /** Free-text detail; empty when the creator left it out. */
  description: string;
  kind: TaskKind;
  status: TaskStatus;
  priority: TaskPriority;
  outcome: string;
  assigneeId: string;
  assigneeName: string;
  /** Empty for standalone (manual) tasks. */
  relatedType: string;
  relatedId: string;
  relatedLabel: string;
  customerId?: string | null;
  dueAt: string | null;
  escalatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type TaskCreateInput = {
  title: string;
  description?: string;
  kind: TaskKind;
  /** Defaults to minor. */
  priority?: TaskPriority;
  assigneeId: string;
  assigneeName: string;
  /** Leave the related fields out for a standalone task. */
  relatedType?: string;
  relatedId?: string;
  relatedLabel?: string;
  customerId?: string | null;
  dueAt?: string | null;
  branchId?: string;
};

const ALLOWED: Record<TaskStatus, TaskStatus[]> = {
  open: ["in_progress", "done", "cancelled"],
  in_progress: ["done", "cancelled", "open"],
  done: [],
  cancelled: [],
};

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return ALLOWED[from].includes(to);
}

export function isTaskClosed(task: Pick<Task, "status">): boolean {
  return task.status === "done" || task.status === "cancelled";
}

export function hasRelatedRecord(task: Pick<Task, "relatedType" | "relatedId">): boolean {
  return Boolean(task.relatedType && task.relatedId && !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(task.relatedId));
}

export function isTaskOverdue(task: Task, now = new Date()): boolean {
  if (!task.dueAt) return false;
  if (isTaskClosed(task)) return false;
  return new Date(task.dueAt).getTime() < now.getTime();
}

export function isDueToday(task: Task, now = new Date()): boolean {
  if (!task.dueAt) return false;
  if (isTaskClosed(task)) return false;
  const due = new Date(task.dueAt);
  return (
    due.getUTCFullYear() === now.getUTCFullYear() &&
    due.getUTCMonth() === now.getUTCMonth() &&
    due.getUTCDate() === now.getUTCDate()
  );
}

/** Board order: most important first, then the earliest deadline, undated last, newest on ties. */
export function compareTasks(a: Task, b: Task): number {
  const rank = TASK_PRIORITIES.indexOf(a.priority) - TASK_PRIORITIES.indexOf(b.priority);
  if (rank !== 0) return rank;
  const da = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
  const db = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
  if (da !== db) return da < db ? -1 : 1;
  return b.createdAt.localeCompare(a.createdAt);
}

export function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const out: Record<TaskStatus, Task[]> = {
    open: [],
    in_progress: [],
    done: [],
    cancelled: [],
  };
  for (const t of tasks) out[t.status].push(t);
  for (const list of Object.values(out)) list.sort(compareTasks);
  return out;
}

export type TaskStats = { open: number; overdue: number; critical: number };

/** Headline counts over active (not closed) tasks. */
export function summarizeTasks(tasks: Task[], now = new Date()): TaskStats {
  const out: TaskStats = { open: 0, overdue: 0, critical: 0 };
  for (const t of tasks) {
    if (isTaskClosed(t)) continue;
    out.open += 1;
    if (isTaskOverdue(t, now)) out.overdue += 1;
    if (t.priority === "critical") out.critical += 1;
  }
  return out;
}

export type TaskFilter = {
  q?: string;
  status?: TaskStatus | "all";
  priority?: TaskPriority | "all";
  kind?: TaskKind | "all";
  assigneeId?: string | "all";
  overdueOnly?: boolean;
  criticalOnly?: boolean;
};

/** Client-side board filter; `q` matches title, related record, assignee and kind. */
export function filterTasks(tasks: Task[], f: TaskFilter, now = new Date()): Task[] {
  const q = (f.q ?? "").trim().toLowerCase();
  return tasks.filter((task) => {
    if (f.status && f.status !== "all" && task.status !== f.status) return false;
    if (f.priority && f.priority !== "all" && task.priority !== f.priority) return false;
    if (f.kind && f.kind !== "all" && task.kind !== f.kind) return false;
    if (f.assigneeId && f.assigneeId !== "all" && task.assigneeId !== f.assigneeId) return false;
    if (f.overdueOnly && !isTaskOverdue(task, now)) return false;
    if (f.criticalOnly && (task.priority !== "critical" || isTaskClosed(task))) return false;
    if (!q) return true;
    return (
      task.title.toLowerCase().includes(q) ||
      task.description.toLowerCase().includes(q) ||
      task.relatedLabel.toLowerCase().includes(q) ||
      task.assigneeName.toLowerCase().includes(q) ||
      task.kind.includes(q)
    );
  });
}
