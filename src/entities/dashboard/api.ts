import { env } from "@/shared/config/env";
import { FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import { createTaskRepository, isTaskOverdue } from "@/entities/task";
import { createLeadRepository } from "@/entities/lead";
import type {
  AttentionItem,
  DashboardKPI,
  MyWorkItem,
  TargetSnapshot,
  TeamMemberStat,
} from "./model";

function tokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  const session = parseSession(raw ? decodeURIComponent(raw) : null);
  return session?.accessToken ?? null;
}

export interface DashboardRepository {
  getKPIs(from?: Date, to?: Date): Promise<DashboardKPI>;
  getTeamStats(from?: Date, to?: Date): Promise<TeamMemberStat[]>;
  getAttention(limit?: number): Promise<AttentionItem[]>;
  getMyWork(limit?: number): Promise<MyWorkItem[]>;
  getTarget(scope?: "personal" | "branch"): Promise<TargetSnapshot>;
}

function defaultPeriod(): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 30);
  return { from, to };
}

type Raw = Record<string, unknown>;

function mapKPI(raw: Raw): DashboardKPI {
  return {
    leadsOpen: Number(raw.leadsOpen ?? raw.leads_open ?? 0),
    tasksOverdue: Number(raw.tasksOverdue ?? raw.tasks_overdue ?? 0),
    bookingsUnpaid: Number(raw.bookingsUnpaid ?? raw.bookings_unpaid ?? 0),
    missingDocs: Number(raw.missingDocs ?? raw.missing_docs ?? 0),
    periodFrom: String(raw.periodFrom ?? raw.period_from ?? ""),
    periodTo: String(raw.periodTo ?? raw.period_to ?? ""),
  };
}

function mapTeam(raw: Raw): TeamMemberStat {
  return {
    id: String(raw.owner_id ?? raw.id ?? ""),
    name: String(raw.owner_name ?? raw.name ?? ""),
    role: String(raw.role ?? "sales"),
    leadsHandled: Number(raw.leads_handled ?? raw.leadsHandled ?? 0),
    openTasks: Number(raw.open_tasks ?? raw.openTasks ?? 0),
    overdueTasks: Number(raw.overdue_tasks ?? raw.overdueTasks ?? 0),
    revenueShare: Number(raw.leads_won ?? raw.revenueShare ?? 0),
    collectedAmt: Number(raw.collected_amt ?? raw.collectedAmt ?? 0),
  };
}

function mapAttention(raw: Raw): AttentionItem {
  return {
    id: String(raw.id),
    kind: String(raw.kind ?? ""),
    severity: String(raw.severity ?? "medium"),
    title: String(raw.title ?? ""),
    relatedType: String(raw.related_type ?? raw.relatedType ?? ""),
    relatedId: String(raw.related_id ?? raw.relatedId ?? ""),
    ageHours: Number(raw.age_hours ?? raw.ageHours ?? 0),
    hrefHint: String(raw.href_hint ?? raw.hrefHint ?? "tasks"),
  };
}

function mapMyWork(raw: Raw): MyWorkItem {
  return {
    id: String(raw.id),
    source: String(raw.source ?? "task"),
    title: String(raw.title ?? ""),
    kind: String(raw.kind ?? ""),
    priority: Number(raw.priority ?? 99),
    dueAt: (raw.due_at ?? raw.dueAt ?? null) as string | null,
    relatedType: String(raw.related_type ?? raw.relatedType ?? ""),
    relatedId: String(raw.related_id ?? raw.relatedId ?? ""),
    overdue: Boolean(raw.overdue ?? false),
    escalated: Boolean(raw.escalated ?? false),
  };
}

function mapTarget(raw: Raw): TargetSnapshot {
  return {
    label: String(raw.label ?? "Season target"),
    targetAmount: Number(raw.target_amount ?? raw.targetAmount ?? 0),
    actualAmount: Number(raw.actual_amount ?? raw.actualAmount ?? 0),
    expectedToDate: Number(raw.expected_to_date ?? raw.expectedToDate ?? 0),
    currency: String(raw.currency ?? "USD"),
    status: String(raw.status ?? "placeholder") as TargetSnapshot["status"],
    periodStart: String(raw.period_start ?? raw.periodStart ?? ""),
    periodEnd: String(raw.period_end ?? raw.periodEnd ?? ""),
  };
}

export class ApiDashboardRepository implements DashboardRepository {
  constructor(private readonly http: HttpClient) {}

  async getKPIs(from?: Date, to?: Date): Promise<DashboardKPI> {
    const period = from && to ? { from, to } : defaultPeriod();
    const sp = new URLSearchParams({
      from: period.from.toISOString(),
      to: period.to.toISOString(),
    });
    return mapKPI(await this.http.request<Raw>(`/dashboard/kpis?${sp}`));
  }

  async getTeamStats(from?: Date, to?: Date): Promise<TeamMemberStat[]> {
    const period = from && to ? { from, to } : defaultPeriod();
    const sp = new URLSearchParams({
      from: period.from.toISOString(),
      to: period.to.toISOString(),
    });
    const data = await this.http.request<Raw[]>(`/dashboard/team?${sp}`);
    return (Array.isArray(data) ? data : []).map(mapTeam);
  }

  async getAttention(limit = 20): Promise<AttentionItem[]> {
    const data = await this.http.request<Raw[]>(
      `/dashboard/attention?limit=${limit}`,
    );
    return (Array.isArray(data) ? data : []).map(mapAttention);
  }

  async getMyWork(limit = 20): Promise<MyWorkItem[]> {
    const data = await this.http.request<Raw[]>(
      `/dashboard/my-work?limit=${limit}`,
    );
    return (Array.isArray(data) ? data : []).map(mapMyWork);
  }

  async getTarget(scope: "personal" | "branch" = "personal"): Promise<TargetSnapshot> {
    const qs = scope === "branch" ? "?scope=branch" : "";
    return mapTarget(await this.http.request<Raw>(`/dashboard/my-target${qs}`));
  }
}

export class MemoryDashboardRepository implements DashboardRepository {
  async getKPIs(from?: Date, to?: Date): Promise<DashboardKPI> {
    const period = from && to ? { from, to } : defaultPeriod();
    const leads = await createLeadRepository().list();
    const tasks = await createTaskRepository().list();

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
    const tasks = await createTaskRepository().list();
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

  async getAttention(limit = 20): Promise<AttentionItem[]> {
    const tasks = await createTaskRepository().list();
    const overdue = tasks
      .filter((t) => isTaskOverdue(t))
      .slice(0, limit)
      .map((t) => ({
        id: t.id,
        kind: t.escalatedAt ? "escalated_task" : "overdue_task",
        severity: t.escalatedAt ? "high" : "medium",
        title: t.title,
        relatedType: t.relatedType,
        relatedId: t.relatedId,
        ageHours: t.dueAt
          ? Math.max(
              0,
              Math.round((Date.now() - new Date(t.dueAt).getTime()) / 3600000),
            )
          : 0,
        hrefHint: "tasks",
      }));
    return overdue;
  }

  async getMyWork(limit = 20): Promise<MyWorkItem[]> {
    const tasks = await createTaskRepository().list();
    return tasks
      .filter((t) => t.status === "open" || t.status === "in_progress")
      .slice(0, limit)
      .map((t, i) => ({
        id: t.id,
        source: "task" as const,
        title: t.title,
        kind: t.kind,
        priority: isTaskOverdue(t) ? 1 : i + 5,
        dueAt: t.dueAt,
        relatedType: t.relatedType,
        relatedId: t.relatedId,
        overdue: isTaskOverdue(t),
        escalated: Boolean(t.escalatedAt),
      }))
      .sort((a, b) => a.priority - b.priority);
  }

  async getTarget(): Promise<TargetSnapshot> {
    return {
      label: "Season target",
      targetAmount: 1_000_000_00,
      actualAmount: 420_000_00,
      expectedToDate: 380_000_00,
      currency: "USD",
      status: "ahead",
      periodStart: `${new Date().getUTCFullYear()}-01-01`,
      periodEnd: `${new Date().getUTCFullYear()}-12-31`,
    };
  }
}

let dashSingleton: MemoryDashboardRepository | null = null;

export function getMemoryDashboardRepository(): MemoryDashboardRepository {
  if (!dashSingleton) dashSingleton = new MemoryDashboardRepository();
  return dashSingleton;
}

export function createDashboardRepository(): DashboardRepository {
  const http = new FetchHttpClient(env.apiBaseUrl, tokenFromCookie);
  const api = new ApiDashboardRepository(http);
  const memory = getMemoryDashboardRepository();
  const wrap =
    <A extends unknown[], R>(
      fn: (...args: A) => Promise<R>,
      fallback: (...args: A) => Promise<R>,
    ) =>
    async (...args: A) => {
      try {
        return await fn(...args);
      } catch {
        return fallback(...args);
      }
    };

  return {
    getKPIs: wrap(api.getKPIs.bind(api), memory.getKPIs.bind(memory)),
    getTeamStats: wrap(api.getTeamStats.bind(api), memory.getTeamStats.bind(memory)),
    getAttention: wrap(api.getAttention.bind(api), memory.getAttention.bind(memory)),
    getMyWork: wrap(api.getMyWork.bind(api), memory.getMyWork.bind(memory)),
    getTarget: wrap(api.getTarget.bind(api), memory.getTarget.bind(memory)),
  };
}
