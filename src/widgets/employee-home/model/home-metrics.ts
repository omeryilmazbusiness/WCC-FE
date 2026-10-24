import type { Lead, LeadStage } from "@/entities/lead/model";

/** Pipeline stages still being worked — won/lost stay off the home board. */
export const OPEN_STAGES = ["new", "contacted", "qualified", "proposal", "paid"] as const;
export type OpenStage = (typeof OPEN_STAGES)[number];

export type TaskHomeFilter = "all" | "overdue" | "progress" | "critical";

type TaskSlice = { status: string; dueAt?: string | null; priority?: string };

function isClosed(task: TaskSlice): boolean {
  return task.status === "done" || task.status === "cancelled";
}

function isOverdue(task: TaskSlice, now: Date): boolean {
  if (!task.dueAt || isClosed(task)) return false;
  return new Date(task.dueAt).getTime() < now.getTime();
}

export function isOpenLead(lead: Pick<Lead, "stage">): boolean {
  return (OPEN_STAGES as readonly string[]).includes(lead.stage);
}

export function openLeads<T extends Pick<Lead, "stage">>(leads: readonly T[]): T[] {
  return leads.filter(isOpenLead);
}

export function countByStage(leads: readonly Pick<Lead, "stage">[]): Record<LeadStage, number> {
  const out: Record<LeadStage, number> = {
    new: 0,
    contacted: 0,
    qualified: 0,
    proposal: 0,
    paid: 0,
    won: 0,
    lost: 0,
  };
  for (const lead of leads) out[lead.stage] += 1;
  return out;
}

/** `getMyWork` order first; unranked tasks keep their original order at the end. */
export function orderTasks<T extends { id: string }>(tasks: readonly T[], workOrder: readonly string[]): T[] {
  if (workOrder.length === 0) return [...tasks];
  const rank = new Map(workOrder.map((id, i) => [id, i]));
  return [...tasks].sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
}

export function filterHomeTasks<T extends TaskSlice>(tasks: readonly T[], filter: TaskHomeFilter, now = new Date()): T[] {
  switch (filter) {
    case "overdue":
      return tasks.filter((t) => isOverdue(t, now));
    case "progress":
      return tasks.filter((t) => t.status === "in_progress");
    case "critical":
      return tasks.filter((t) => t.priority === "critical" && !isClosed(t));
    default:
      return [...tasks];
  }
}

export function homeKpis(input: {
  leads: readonly Pick<Lead, "stage">[];
  tasks: readonly TaskSlice[];
  paymentDue: number;
  now?: Date;
}): { leadsOpen: number; tasksOverdue: number; tasksOpen: number; paymentDue: number } {
  const now = input.now ?? new Date();
  return {
    leadsOpen: openLeads(input.leads).length,
    tasksOverdue: input.tasks.filter((t) => isOverdue(t, now)).length,
    tasksOpen: input.tasks.filter((t) => !isClosed(t)).length,
    paymentDue: Math.max(0, input.paymentDue),
  };
}
