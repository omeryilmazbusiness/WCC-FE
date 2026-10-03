import type { TaskCreateInput, TaskKind, TaskPriority } from "@/entities/task";

/** Mirrors the API limit on task titles. */
export const TASK_TITLE_MAX = 200;

/** Mirrors the API limit on task descriptions. */
export const TASK_DESCRIPTION_MAX = 4000;

export type DuePreset = "today" | "tomorrow" | "in3days" | "nextWeek" | "custom" | "none";

export const DUE_PRESETS: DuePreset[] = ["today", "tomorrow", "in3days", "nextWeek", "custom", "none"];

export type TaskDraft = {
  title: string;
  description: string;
  kind: TaskKind;
  priority: TaskPriority;
  duePreset: DuePreset;
  /** Local calendar day, YYYY-MM-DD; used by the custom preset. */
  dueDate: string;
  /** Local wall-clock time, HH:MM; used by the custom preset. */
  dueTime: string;
  assigneeId: string;
  assigneeName: string;
};

export type DraftErrors = Partial<{
  title: "required" | "tooLong";
  description: "tooLong";
  due: "invalid" | "past";
  assignee: "required";
}>;

const END_OF_DAY_HOUR = 18;
const MORNING_HOUR = 10;
/** A deadline must leave at least this much time to act on it. */
const MIN_LEAD_MS = 15 * 60 * 1000;
const QUARTER_MS = 15 * 60 * 1000;

function atLocal(base: Date, addDays: number, hour: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + addDays);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toLocalTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseLocal(date: string, time: string): Date | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const tm = /^(\d{2}):(\d{2})$/.exec(time || "00:00");
  if (!dm || !tm) return null;
  const [y, mo, day, h, mi] = [dm[1], dm[2], dm[3], tm[1], tm[2]].map(Number);
  if (h > 23 || mi > 59) return null;
  const d = new Date(y, mo - 1, day, h, mi, 0, 0);
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== day) return null;
  return d;
}

/**
 * The concrete deadline for a draft. "Today" means end of the working day, or the next quarter
 * hour at least 15 minutes out once that has passed; other presets land on a morning slot.
 */
export function resolveDue(
  draft: Pick<TaskDraft, "duePreset" | "dueDate" | "dueTime">,
  now: Date,
): Date | null | "invalid" {
  switch (draft.duePreset) {
    case "none":
      return null;
    case "today": {
      const eod = atLocal(now, 0, END_OF_DAY_HOUR);
      if (eod.getTime() - now.getTime() >= MIN_LEAD_MS) return eod;
      return new Date(Math.ceil((now.getTime() + MIN_LEAD_MS) / QUARTER_MS) * QUARTER_MS);
    }
    case "tomorrow":
      return atLocal(now, 1, MORNING_HOUR);
    case "in3days":
      return atLocal(now, 3, MORNING_HOUR);
    case "nextWeek":
      return atLocal(now, 7, MORNING_HOUR);
    case "custom":
      return parseLocal(draft.dueDate, draft.dueTime) ?? "invalid";
  }
}

export function freshTaskDraft(now: Date, assignee: { id: string; name: string }): TaskDraft {
  const tomorrow = atLocal(now, 1, MORNING_HOUR);
  return {
    title: "",
    description: "",
    kind: "custom",
    priority: "minor",
    duePreset: "tomorrow",
    dueDate: toLocalDate(tomorrow),
    dueTime: toLocalTime(tomorrow),
    assigneeId: assignee.id,
    assigneeName: assignee.name,
  };
}

/** Checks a draft and, when it is valid, returns the repository input. */
export function validateTaskDraft(
  draft: TaskDraft,
  now: Date,
): { errors: DraftErrors; input: TaskCreateInput | null } {
  const errors: DraftErrors = {};
  const title = draft.title.trim().replace(/\s+/g, " ");
  if (!title) errors.title = "required";
  else if ([...title].length > TASK_TITLE_MAX) errors.title = "tooLong";

  const description = draft.description.trim();
  if ([...description].length > TASK_DESCRIPTION_MAX) errors.description = "tooLong";

  const due = resolveDue(draft, now);
  if (due === "invalid") errors.due = "invalid";
  else if (due && due.getTime() <= now.getTime()) errors.due = "past";

  if (!draft.assigneeId) errors.assignee = "required";

  if (Object.keys(errors).length > 0 || due === "invalid") return { errors, input: null };
  return {
    errors,
    input: {
      title,
      description,
      kind: draft.kind,
      priority: draft.priority,
      assigneeId: draft.assigneeId,
      assigneeName: draft.assigneeName,
      dueAt: due ? due.toISOString() : null,
    },
  };
}
