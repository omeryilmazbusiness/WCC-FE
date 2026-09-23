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

export type TaskPriority = "low" | "normal" | "high" | "urgent";

export type Task = {
  id: string;
  branchId: string;
  title: string;
  kind: TaskKind;
  status: TaskStatus;
  priority: TaskPriority;
  outcome: string;
  assigneeId: string;
  assigneeName: string;
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
  kind: TaskKind;
  assigneeId: string;
  assigneeName: string;
  relatedType: string;
  relatedId: string;
  relatedLabel: string;
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

export function isTaskOverdue(task: Task, now = new Date()): boolean {
  if (!task.dueAt) return false;
  if (task.status === "done" || task.status === "cancelled") return false;
  return new Date(task.dueAt).getTime() < now.getTime();
}

export function isDueToday(task: Task, now = new Date()): boolean {
  if (!task.dueAt) return false;
  if (task.status === "done" || task.status === "cancelled") return false;
  const due = new Date(task.dueAt);
  return (
    due.getUTCFullYear() === now.getUTCFullYear() &&
    due.getUTCMonth() === now.getUTCMonth() &&
    due.getUTCDate() === now.getUTCDate()
  );
}

export function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const out: Record<TaskStatus, Task[]> = {
    open: [],
    in_progress: [],
    done: [],
    cancelled: [],
  };
  for (const t of tasks) out[t.status].push(t);
  return out;
}
