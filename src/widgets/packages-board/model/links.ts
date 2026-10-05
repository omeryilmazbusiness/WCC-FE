import type { Booking } from "@/entities/booking";
import type { Lead } from "@/entities/lead";
import type { Task } from "@/entities/task";

export type PackageLinkSummary = {
  openLeads: number;
  openTasks: number;
  overdueTasks: number;
  activeBookings: number;
  bookedPax: number;
  /** Everything tied to the package, open or not; drives the tab badge. */
  total: number;
};

const CLOSED_LEAD = new Set(["won", "lost"]);
const CLOSED_TASK = new Set(["done", "cancelled"]);

export function isOpenLead(l: Pick<Lead, "stage">): boolean {
  return !CLOSED_LEAD.has(l.stage);
}

export function isOpenTask(t: Pick<Task, "status">): boolean {
  return !CLOSED_TASK.has(t.status);
}

export function isActiveBooking(b: Pick<Booking, "status">): boolean {
  return b.status !== "cancelled";
}

/** Headline counts for the work linked to one package. */
export function summarizeLinks(
  input: { leads: readonly Pick<Lead, "stage">[]; tasks: readonly Pick<Task, "status" | "dueAt">[]; bookings: readonly Pick<Booking, "status" | "paxCount">[] },
  now = new Date(),
): PackageLinkSummary {
  const openTasks = input.tasks.filter(isOpenTask);
  const active = input.bookings.filter(isActiveBooking);
  return {
    openLeads: input.leads.filter(isOpenLead).length,
    openTasks: openTasks.length,
    overdueTasks: openTasks.filter((t) => t.dueAt && new Date(t.dueAt).getTime() < now.getTime()).length,
    activeBookings: active.length,
    bookedPax: active.reduce((n, b) => n + (b.paxCount || 0), 0),
    total: input.leads.length + input.tasks.length + input.bookings.length,
  };
}

/** Open items first, then the most recently touched. */
export function orderLinked<T extends { updatedAt: string }>(rows: readonly T[], isOpen: (row: T) => boolean): T[] {
  return [...rows].sort((a, b) => {
    const open = Number(isOpen(b)) - Number(isOpen(a));
    return open !== 0 ? open : b.updatedAt.localeCompare(a.updatedAt);
  });
}
