import type {
  DashboardKPI,
  TargetSnapshot,
  TeamMemberStat,
} from "./model";
import { getMemoryTaskRepository, isTaskOverdue } from "@/entities/task";
import { createLeadRepository } from "@/entities/lead";

export interface DashboardRepository {
  getKPIs(from?: Date, to?: Date): Promise<DashboardKPI>;
  getTeamStats(): Promise<TeamMemberStat[]>;
  getTargetPlaceholder(): Promise<TargetSnapshot>;
}

function defaultPeriod(): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 30);
  return { from, to };
}

export class MemoryDashboardRepository implements DashboardRepository {
  async getKPIs(from?: Date, to?: Date): Promise<DashboardKPI> {
    const period = from && to ? { from, to } : defaultPeriod();
    const leads = await createLeadRepository().list();
    const tasks = await getMemoryTaskRepository().list();

    const leadsOpen = leads.filter(
      (l) =>
        l.stage !== "won" &&
        l.stage !== "lost" &&
        new Date(l.createdAt) >= period.from &&
        new Date(l.createdAt) < period.to,
    ).length;

    const tasksOverdue = tasks.filter(
      (t) =>
        isTaskOverdue(t) &&
        t.dueAt &&
        new Date(t.dueAt) >= period.from &&
        new Date(t.dueAt) < period.to,
    ).length;

    const missingDocs = tasks.filter(
      (t) =>
        t.kind === "document" &&
        (t.status === "open" || t.status === "in_progress") &&
        new Date(t.createdAt) >= period.from &&
        new Date(t.createdAt) < period.to,
    ).length;

    // Demo unpaid proxy: open payment tasks in period.
    const bookingsUnpaid = tasks.filter(
      (t) =>
        t.kind === "payment" &&
        (t.status === "open" || t.status === "in_progress") &&
        new Date(t.createdAt) >= period.from &&
        new Date(t.createdAt) < period.to,
    ).length;

    return {
      leadsOpen,
      tasksOverdue,
      bookingsUnpaid,
      missingDocs,
      periodFrom: period.from.toISOString(),
      periodTo: period.to.toISOString(),
    };
  }

  async getTeamStats(): Promise<TeamMemberStat[]> {
    const leads = await createLeadRepository().list();
    const tasks = await getMemoryTaskRepository().list();
    const byOwner = new Map<string, TeamMemberStat>();

    for (const l of leads) {
      const row = byOwner.get(l.ownerId) ?? {
        id: l.ownerId,
        name: l.ownerName,
        role: "sales",
        leadsHandled: 0,
        openTasks: 0,
        overdueTasks: 0,
        revenueShare: 0,
      };
      row.leadsHandled += 1;
      if (l.stage === "won") row.revenueShare += 1;
      byOwner.set(l.ownerId, row);
    }

    for (const t of tasks) {
      const row = byOwner.get(t.assigneeId) ?? {
        id: t.assigneeId,
        name: t.assigneeName,
        role: "ops",
        leadsHandled: 0,
        openTasks: 0,
        overdueTasks: 0,
        revenueShare: 0,
      };
      if (t.status === "open" || t.status === "in_progress") row.openTasks += 1;
      if (isTaskOverdue(t)) row.overdueTasks += 1;
      byOwner.set(t.assigneeId, row);
    }

    return [...byOwner.values()].sort((a, b) => b.leadsHandled - a.leadsHandled);
  }

  async getTargetPlaceholder(): Promise<TargetSnapshot> {
    return {
      label: "Season target",
      targetAmount: 1_000_000,
      actualAmount: 420_000,
      expectedToDate: 380_000,
      currency: "USD",
      status: "ahead",
    };
  }
}

let dashSingleton: MemoryDashboardRepository | null = null;

export function getMemoryDashboardRepository(): MemoryDashboardRepository {
  if (!dashSingleton) dashSingleton = new MemoryDashboardRepository();
  return dashSingleton;
}
