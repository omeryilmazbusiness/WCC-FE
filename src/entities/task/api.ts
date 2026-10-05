import { http, type HttpClient } from "@/shared/api/http-client";
import { createRepository } from "@/shared/api/repository";
import {
  canTransitionTask,
  hasRelatedRecord,
  normalizeTaskPriority,
  type Task,
  type TaskCreateInput,
  type TaskKind,
  mapTaskPackageLink,
  type TaskPackageInput,
  type TaskStatus,
} from "./model";

export type TaskListParams = {
  q?: string;
  status?: string;
  assigneeId?: string;
  overdue?: boolean;
  escalated?: boolean;
  packageId?: string;
  departureId?: string;
};

export interface TaskRepository {
  list(params?: TaskListParams): Promise<Task[]>;
  listMine(assigneeId?: string): Promise<Task[]>;
  listToday(assigneeId: string): Promise<Task[]>;
  listByRelated(relatedType: string, relatedId: string): Promise<Task[]>;
  getById(id: string): Promise<Task>;
  create(input: TaskCreateInput): Promise<Task>;
  complete(id: string, outcome?: string): Promise<Task>;
  cancel(id: string, reason?: string): Promise<Task>;
  changeStatus(id: string, status: TaskStatus): Promise<Task>;
  assign(id: string, assigneeId: string, assigneeName?: string): Promise<Task>;
  /** Sets or clears the package (and departure) the task is about. */
  linkPackage(id: string, input: TaskPackageInput): Promise<Task>;
  bulkAssign(
    taskIds: string[],
    assigneeId: string,
    assigneeName?: string,
  ): Promise<Task[]>;
  escalateOverdue(): Promise<number>;
  /** Offline/demo helpers — no-ops against API (BE seeder owns this). */
  ensureFollowUpForLead(input: {
    leadId: string;
    leadName: string;
    assigneeId: string;
    assigneeName: string;
    customerId?: string | null;
  }): Promise<Task>;
  ensureBookingOpsTasks(input: {
    bookingId: string;
    label: string;
    assigneeId: string;
    assigneeName: string;
    customerId?: string | null;
  }): Promise<Task[]>;
}

type Raw = Record<string, unknown>;

/** Mutation responses may omit the joined assignee name; keep the one the caller already knows. */
function withAssigneeName(task: Task, name?: string): Task {
  return task.assigneeName || !name ? task : { ...task, assigneeName: name };
}

function mapTask(raw: Raw): Task {
  const ref = {
    relatedType: String(raw.relatedType ?? raw.related_type ?? ""),
    relatedId: String(raw.relatedId ?? raw.related_id ?? ""),
  };
  const linked = hasRelatedRecord(ref);
  const relatedType = linked ? ref.relatedType : "";
  const relatedId = linked ? ref.relatedId : "";
  const label = String(raw.relatedLabel ?? raw.related_label ?? "");
  return {
    id: String(raw.id),
    branchId: String(raw.branchId ?? raw.branch_id ?? ""),
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    kind: String(raw.kind ?? "custom") as TaskKind,
    status: String(raw.status ?? "open") as TaskStatus,
    priority: normalizeTaskPriority(raw.priority),
    outcome: String(raw.outcome ?? ""),
    assigneeId: String(raw.assigneeId ?? raw.assignee_id ?? ""),
    assigneeName: String(raw.assigneeName ?? raw.assignee_name ?? ""),
    relatedType,
    relatedId,
    relatedLabel: linked ? label : "",
    customerId: (raw.customerId ?? raw.customer_id ?? null) as string | null,
    pkg: mapTaskPackageLink(raw.package),
    dueAt: (raw.dueAt ?? raw.due_at ?? null) as string | null,
    escalatedAt: (raw.escalatedAt ?? raw.escalated_at ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),
    completedAt: (raw.completedAt ?? raw.completed_at ?? null) as string | null,
  };
}

export class ApiTaskRepository implements TaskRepository {
  constructor(private readonly http: HttpClient) {}

  async list(params: TaskListParams = {}): Promise<Task[]> {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.assigneeId) sp.set("assignee_id", params.assigneeId);
    if (params.overdue) sp.set("overdue", "true");
    if (params.escalated) sp.set("escalated", "true");
    if (params.packageId) sp.set("package_id", params.packageId);
    if (params.departureId) sp.set("departure_id", params.departureId);
    sp.set("limit", "100");
    const qs = sp.toString();
    const data = await this.http.request<Raw[]>(`/tasks${qs ? `?${qs}` : ""}`);
    return (Array.isArray(data) ? data : []).map(mapTask);
  }

  async listMine(): Promise<Task[]> {
    const data = await this.http.request<Raw[]>("/tasks/mine?limit=100");
    return (Array.isArray(data) ? data : []).map(mapTask);
  }

  async listToday(assigneeId: string): Promise<Task[]> {
    void assigneeId;
    const mine = await this.listMine();
    const now = new Date();
    return mine.filter((t) => {
      if (t.status === "done" || t.status === "cancelled") return false;
      if (!t.dueAt) return t.status === "open" || t.status === "in_progress";
      const due = new Date(t.dueAt);
      const start = new Date(now);
      start.setUTCHours(0, 0, 0, 0);
      return due.getTime() <= start.getTime() + 24 * 60 * 60 * 1000;
    });
  }

  async listByRelated(relatedType: string, relatedId: string): Promise<Task[]> {
    const sp = new URLSearchParams({
      related_type: relatedType,
      related_id: relatedId,
    });
    const data = await this.http.request<Raw[]>(`/tasks?${sp.toString()}`);
    return (Array.isArray(data) ? data : []).map(mapTask);
  }

  async getById(id: string): Promise<Task> {
    return mapTask(await this.http.request<Raw>(`/tasks/${id}`));
  }

  async create(input: TaskCreateInput): Promise<Task> {
    const created = mapTask(
      await this.http.request<Raw>("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: input.title,
          description: input.description ?? "",
          kind: input.kind,
          priority: input.priority ?? "minor",
          assignee_id: input.assigneeId || undefined,
          ...(input.relatedType && input.relatedId
            ? { related_type: input.relatedType, related_id: input.relatedId }
            : {}),
          ...(input.packageId ? { package_id: input.packageId, departure_id: input.departureId || null } : {}),
          due_at: input.dueAt ?? null,
        }),
      }),
    );
    return withAssigneeName(
      { ...created, relatedLabel: created.relatedId ? input.relatedLabel || created.relatedLabel : "" },
      input.assigneeName,
    );
  }

  async complete(id: string, outcome = ""): Promise<Task> {
    return mapTask(
      await this.http.request<Raw>(`/tasks/${id}/complete`, {
        method: "POST",
        body: JSON.stringify({ outcome }),
      }),
    );
  }

  async cancel(id: string, reason = ""): Promise<Task> {
    return mapTask(
      await this.http.request<Raw>(`/tasks/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    );
  }

  async changeStatus(id: string, status: TaskStatus): Promise<Task> {
    return mapTask(
      await this.http.request<Raw>(`/tasks/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      }),
    );
  }

  async assign(id: string, assigneeId: string, assigneeName?: string): Promise<Task> {
    const task = mapTask(
      await this.http.request<Raw>(`/tasks/${id}/assign`, {
        method: "POST",
        body: JSON.stringify({ assignee_id: assigneeId }),
      }),
    );
    return assigneeName ? { ...task, assigneeName } : task;
  }

  async linkPackage(id: string, input: TaskPackageInput): Promise<Task> {
    return mapTask(
      await this.http.request<Raw>(`/tasks/${id}/package`, {
        method: "PUT",
        body: JSON.stringify({ package_id: input.packageId, departure_id: input.packageId ? input.departureId : null }),
      }),
    );
  }

  async bulkAssign(taskIds: string[], assigneeId: string, assigneeName?: string): Promise<Task[]> {
    const data = await this.http.request<Raw[]>("/tasks/assign", {
      method: "POST",
      body: JSON.stringify({ task_ids: taskIds, assignee_id: assigneeId }),
    });
    return (Array.isArray(data) ? data : []).map(mapTask).map((t) => (assigneeName ? { ...t, assigneeName } : t));
  }

  async escalateOverdue(): Promise<number> {
    const raw = await this.http.request<Raw>("/tasks/escalate-overdue", {
      method: "POST",
    });
    return Number(raw.escalated ?? 0);
  }

  async ensureFollowUpForLead(input: {
    leadId: string;
  }): Promise<Task> {
    const list = await this.listByRelated("lead", input.leadId);
    const existing = list.find((t) => t.kind === "followup");
    if (existing) return existing;
    throw new Error("follow-up task not yet seeded");
  }

  async ensureBookingOpsTasks(input: {
    bookingId: string;
  }): Promise<Task[]> {
    return this.listByRelated("booking", input.bookingId);
  }
}

const BRANCH = "11111111-1111-1111-1111-111111111111";
const SALES = {
  id: "22222222-2222-2222-2222-222222222203",
  name: "Sales Employee",
} as const;
const MANAGER = {
  id: "22222222-2222-2222-2222-222222222202",
  name: "Branch Manager",
} as const;

function nowIso() {
  return new Date().toISOString();
}

function daysFromNow(days: number, hour = 16): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

function daysAgo(days: number): string {
  return daysFromNow(-days);
}

const store: Task[] = [
  {
    id: "task-1",
    branchId: BRANCH,
    title: "Follow up Ahmet WhatsApp quote",
    description: "Share the Umrah package quote on WhatsApp and confirm travel dates for 4 travellers.",
    kind: "followup",
    status: "open",
    priority: "minor",
    outcome: "",
    assigneeId: SALES.id,
    assigneeName: SALES.name,
    relatedType: "lead",
    relatedId: "lead-1",
    relatedLabel: "Ahmed Al-Rashid",
    customerId: "demo-1",
    dueAt: daysFromNow(0),
    escalatedAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    completedAt: null,
  },
  {
    id: "task-2",
    branchId: BRANCH,
    title: "Collect passport — Fatima",
    description: "",
    kind: "document",
    status: "in_progress",
    priority: "major",
    outcome: "",
    assigneeId: SALES.id,
    assigneeName: SALES.name,
    relatedType: "booking",
    relatedId: "bk-demo",
    relatedLabel: "Booking bk-demo",
    customerId: "demo-1",
    dueAt: daysAgo(1),
    escalatedAt: daysAgo(0),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    completedAt: null,
  },
  {
    id: "task-3",
    branchId: BRANCH,
    title: "Collect deposit payment",
    description: "30% deposit due before the hotel block is released.",
    kind: "payment",
    status: "open",
    priority: "critical",
    outcome: "",
    assigneeId: SALES.id,
    assigneeName: SALES.name,
    relatedType: "booking",
    relatedId: "bk-demo",
    relatedLabel: "Booking bk-demo",
    customerId: "demo-1",
    dueAt: daysFromNow(2),
    escalatedAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    completedAt: null,
  },
  {
    id: "task-4",
    branchId: BRANCH,
    title: "Call Omar — proposal follow-up",
    description: "",
    kind: "followup",
    status: "open",
    priority: "major",
    outcome: "",
    assigneeId: MANAGER.id,
    assigneeName: MANAGER.name,
    relatedType: "lead",
    relatedId: "lead-3",
    relatedLabel: "Omar Khalil",
    dueAt: daysFromNow(0),
    escalatedAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    completedAt: null,
  },
];

function clone(t: Task): Task {
  return { ...t };
}

export class MemoryTaskRepository implements TaskRepository {
  async list(params: TaskListParams = {}): Promise<Task[]> {
    return store
      .filter((t) => {
        if (params.status && t.status !== params.status) return false;
        if (params.packageId && t.pkg?.packageId !== params.packageId) return false;
        if (params.departureId && t.pkg?.departureId !== params.departureId) return false;
        if (params.assigneeId && t.assigneeId !== params.assigneeId) return false;
        if (params.escalated && !t.escalatedAt) return false;
        if (params.overdue) {
          if (!t.dueAt || t.status === "done" || t.status === "cancelled") return false;
          if (new Date(t.dueAt).getTime() >= Date.now()) return false;
        }
        if (params.q) {
          const q = params.q.toLowerCase();
          if (
            !t.title.toLowerCase().includes(q) &&
            !t.relatedLabel.toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      })
      .map(clone);
  }

  async listMine(assigneeId?: string): Promise<Task[]> {
    if (!assigneeId) return store.map(clone);
    return store.filter((t) => t.assigneeId === assigneeId).map(clone);
  }

  async listToday(assigneeId: string): Promise<Task[]> {
    const now = new Date();
    return (await this.listMine(assigneeId)).filter((t) => {
      if (t.status === "done" || t.status === "cancelled") return false;
      if (!t.dueAt) return t.status === "open" || t.status === "in_progress";
      const due = new Date(t.dueAt);
      const start = new Date(now);
      start.setUTCHours(0, 0, 0, 0);
      return due.getTime() <= start.getTime() + 24 * 60 * 60 * 1000;
    });
  }

  async listByRelated(relatedType: string, relatedId: string): Promise<Task[]> {
    return store
      .filter((t) => t.relatedType === relatedType && t.relatedId === relatedId)
      .map(clone);
  }

  async getById(id: string): Promise<Task> {
    const t = store.find((x) => x.id === id);
    if (!t) throw new Error("task not found");
    return clone(t);
  }

  async create(input: TaskCreateInput): Promise<Task> {
    const stamp = nowIso();
    const task: Task = {
      id: `task-${crypto.randomUUID()}`,
      branchId: input.branchId ?? BRANCH,
      title: input.title,
      description: input.description ?? "",
      kind: input.kind,
      status: "open",
      priority: input.priority ?? "minor",
      outcome: "",
      assigneeId: input.assigneeId,
      assigneeName: input.assigneeName,
      relatedType: input.relatedType ?? "",
      relatedId: input.relatedId ?? "",
      relatedLabel: input.relatedLabel ?? "",
      customerId: input.customerId ?? null,
      pkg: input.packageId
        ? {
            packageId: input.packageId,
            packageCode: "",
            packageName: "",
            packageNameAr: "",
            departureId: input.departureId ?? null,
            departureCode: "",
            departDate: null,
          }
        : null,
      dueAt: input.dueAt ?? null,
      escalatedAt: null,
      createdAt: stamp,
      updatedAt: stamp,
      completedAt: null,
    };
    store.unshift(task);
    return clone(task);
  }

  async complete(id: string, outcome = ""): Promise<Task> {
    await this.changeStatus(id, "done");
    const row = store.find((x) => x.id === id)!;
    row.outcome = outcome;
    return clone(row);
  }

  async cancel(id: string, reason = ""): Promise<Task> {
    await this.changeStatus(id, "cancelled");
    const row = store.find((x) => x.id === id)!;
    row.outcome = reason;
    return clone(row);
  }

  async changeStatus(id: string, status: TaskStatus): Promise<Task> {
    const t = store.find((x) => x.id === id);
    if (!t) throw new Error("task not found");
    if (t.status === status) return clone(t);
    if (!canTransitionTask(t.status, status)) {
      throw new Error(`invalid transition ${t.status} → ${status}`);
    }
    t.status = status;
    t.updatedAt = nowIso();
    t.completedAt = status === "done" ? nowIso() : null;
    return clone(t);
  }

  async assign(
    id: string,
    assigneeId: string,
    assigneeName = "",
  ): Promise<Task> {
    const t = store.find((x) => x.id === id);
    if (!t) throw new Error("task not found");
    if (t.status === "done" || t.status === "cancelled") {
      throw new Error("cannot reassign closed task");
    }
    t.assigneeId = assigneeId;
    if (assigneeName) t.assigneeName = assigneeName;
    t.updatedAt = nowIso();
    return clone(t);
  }

  async linkPackage(id: string, input: TaskPackageInput): Promise<Task> {
    const t = store.find((x) => x.id === id);
    if (!t) throw new Error("task not found");
    if (t.status === "done" || t.status === "cancelled") throw new Error("cannot relink closed task");
    if (input.departureId && !input.packageId) throw new Error("departure needs a package");
    t.pkg = input.packageId
      ? {
          packageId: input.packageId,
          packageCode: "",
          packageName: "",
          packageNameAr: "",
          departureId: input.departureId,
          departureCode: "",
          departDate: null,
        }
      : null;
    t.updatedAt = nowIso();
    return clone(t);
  }

  async bulkAssign(
    taskIds: string[],
    assigneeId: string,
    assigneeName = "",
  ): Promise<Task[]> {
    const out: Task[] = [];
    for (const id of taskIds) {
      out.push(await this.assign(id, assigneeId, assigneeName));
    }
    return out;
  }

  async escalateOverdue(): Promise<number> {
    let n = 0;
    const now = Date.now();
    for (const t of store) {
      if (t.status === "done" || t.status === "cancelled") continue;
      if (!t.dueAt || t.escalatedAt) continue;
      if (new Date(t.dueAt).getTime() + 24 * 3600 * 1000 > now) continue;
      t.escalatedAt = nowIso();
      if (t.priority !== "critical") t.priority = "major";
      t.updatedAt = nowIso();
      n++;
    }
    return n;
  }

  async ensureFollowUpForLead(input: {
    leadId: string;
    leadName: string;
    assigneeId: string;
    assigneeName: string;
    customerId?: string | null;
  }): Promise<Task> {
    const existing = store.find(
      (t) =>
        t.relatedType === "lead" &&
        t.relatedId === input.leadId &&
        t.kind === "followup",
    );
    if (existing) return clone(existing);
    return this.create({
      title: `Follow up ${input.leadName}`,
      kind: "followup",
      assigneeId: input.assigneeId,
      assigneeName: input.assigneeName,
      relatedType: "lead",
      relatedId: input.leadId,
      relatedLabel: input.leadName,
      customerId: input.customerId,
      dueAt: daysFromNow(1),
    });
  }

  async ensureBookingOpsTasks(input: {
    bookingId: string;
    label: string;
    assigneeId: string;
    assigneeName: string;
    customerId?: string | null;
  }): Promise<Task[]> {
    const kinds: TaskKind[] = ["document", "payment"];
    const out: Task[] = [];
    for (const kind of kinds) {
      const existing = store.find(
        (t) =>
          t.relatedType === "booking" &&
          t.relatedId === input.bookingId &&
          t.kind === kind,
      );
      if (existing) {
        out.push(clone(existing));
        continue;
      }
      const title =
        kind === "document"
          ? `Collect documents — ${input.label}`
          : `Collect payment — ${input.label}`;
      out.push(
        await this.create({
          title,
          kind,
          assigneeId: input.assigneeId,
          assigneeName: input.assigneeName,
          relatedType: "booking",
          relatedId: input.bookingId,
          relatedLabel: input.label,
          customerId: input.customerId,
          dueAt: daysFromNow(kind === "document" ? 3 : 2),
        }),
      );
    }
    return out;
  }
}

let singleton: MemoryTaskRepository | null = null;

export function getMemoryTaskRepository(): MemoryTaskRepository {
  if (!singleton) singleton = new MemoryTaskRepository();
  return singleton;
}

export function createTaskRepository(): TaskRepository {
  const api = new ApiTaskRepository(http);
  const memory = getMemoryTaskRepository();
  return createRepository<TaskRepository>({
    api,
    memory,
    reads: ["list", "listMine", "listToday", "listByRelated", "getById"],
  });
}
