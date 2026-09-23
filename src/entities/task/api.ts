import { env } from "@/shared/config/env";
import { FetchHttpClient, type HttpClient } from "@/shared/api/http-client";
import { parseSession, SESSION_COOKIE } from "@/shared/api/session";
import {
  canTransitionTask,
  type Task,
  type TaskCreateInput,
  type TaskKind,
  type TaskPriority,
  type TaskStatus,
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

export interface TaskRepository {
  list(params?: {
    q?: string;
    status?: string;
    assigneeId?: string;
    overdue?: boolean;
    escalated?: boolean;
  }): Promise<Task[]>;
  listMine(assigneeId?: string): Promise<Task[]>;
  listToday(assigneeId: string): Promise<Task[]>;
  listByRelated(relatedType: string, relatedId: string): Promise<Task[]>;
  getById(id: string): Promise<Task>;
  create(input: TaskCreateInput): Promise<Task>;
  complete(id: string, outcome?: string): Promise<Task>;
  reschedule(id: string, dueAt: string | null): Promise<Task>;
  changeStatus(id: string, status: TaskStatus): Promise<Task>;
  assign(id: string, assigneeId: string, assigneeName?: string): Promise<Task>;
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

function mapTask(raw: Raw): Task {
  const relatedType = String(raw.relatedType ?? raw.related_type ?? "");
  const relatedId = String(raw.relatedId ?? raw.related_id ?? "");
  return {
    id: String(raw.id),
    branchId: String(raw.branchId ?? raw.branch_id ?? ""),
    title: String(raw.title ?? ""),
    kind: String(raw.kind ?? "custom") as TaskKind,
    status: String(raw.status ?? "open") as TaskStatus,
    priority: String(raw.priority ?? "normal") as TaskPriority,
    outcome: String(raw.outcome ?? ""),
    assigneeId: String(raw.assigneeId ?? raw.assignee_id ?? ""),
    assigneeName: String(raw.assigneeName ?? raw.assignee_name ?? ""),
    relatedType,
    relatedId,
    relatedLabel: String(
      raw.relatedLabel ?? raw.related_label ?? `${relatedType} ${relatedId.slice(0, 8)}`,
    ),
    customerId: (raw.customerId ?? raw.customer_id ?? null) as string | null,
    dueAt: (raw.dueAt ?? raw.due_at ?? null) as string | null,
    escalatedAt: (raw.escalatedAt ?? raw.escalated_at ?? null) as string | null,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),
    completedAt: (raw.completedAt ?? raw.completed_at ?? null) as string | null,
  };
}

export class ApiTaskRepository implements TaskRepository {
  constructor(private readonly http: HttpClient) {}

  async list(params: {
    q?: string;
    status?: string;
    assigneeId?: string;
    overdue?: boolean;
    escalated?: boolean;
  } = {}): Promise<Task[]> {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.status) sp.set("status", params.status);
    if (params.assigneeId) sp.set("assignee_id", params.assigneeId);
    if (params.overdue) sp.set("overdue", "true");
    if (params.escalated) sp.set("escalated", "true");
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
    return mapTask(
      await this.http.request<Raw>("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: input.title,
          kind: input.kind,
          assignee_id: input.assigneeId,
          related_type: input.relatedType,
          related_id: input.relatedId,
          due_at: input.dueAt ?? null,
        }),
      }),
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

  async reschedule(id: string, dueAt: string | null): Promise<Task> {
    return mapTask(
      await this.http.request<Raw>(`/tasks/${id}/reschedule`, {
        method: "POST",
        body: JSON.stringify({ due_at: dueAt }),
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

  async assign(id: string, assigneeId: string): Promise<Task> {
    return mapTask(
      await this.http.request<Raw>(`/tasks/${id}/assign`, {
        method: "POST",
        body: JSON.stringify({ assignee_id: assigneeId }),
      }),
    );
  }

  async bulkAssign(taskIds: string[], assigneeId: string): Promise<Task[]> {
    const data = await this.http.request<Raw[]>("/tasks/assign", {
      method: "POST",
      body: JSON.stringify({ task_ids: taskIds, assignee_id: assigneeId }),
    });
    return (Array.isArray(data) ? data : []).map(mapTask);
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
    kind: "followup",
    status: "open",
    priority: "normal",
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
    kind: "document",
    status: "in_progress",
    priority: "high",
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
    kind: "payment",
    status: "open",
    priority: "high",
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
    kind: "followup",
    status: "open",
    priority: "normal",
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
  async list(params: {
    q?: string;
    status?: string;
    assigneeId?: string;
    overdue?: boolean;
    escalated?: boolean;
  } = {}): Promise<Task[]> {
    return store
      .filter((t) => {
        if (params.status && t.status !== params.status) return false;
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
      kind: input.kind,
      status: "open",
      priority: "normal",
      outcome: "",
      assigneeId: input.assigneeId,
      assigneeName: input.assigneeName,
      relatedType: input.relatedType,
      relatedId: input.relatedId,
      relatedLabel: input.relatedLabel,
      customerId: input.customerId ?? null,
      dueAt: input.dueAt ?? daysFromNow(1),
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

  async reschedule(id: string, dueAt: string | null): Promise<Task> {
    const t = store.find((x) => x.id === id);
    if (!t) throw new Error("task not found");
    if (t.status === "done" || t.status === "cancelled") {
      throw new Error("cannot reschedule closed task");
    }
    t.dueAt = dueAt;
    t.escalatedAt = null;
    t.updatedAt = nowIso();
    return clone(t);
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
      t.priority = "high";
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
  const http = new FetchHttpClient(env.apiBaseUrl, tokenFromCookie);
  const api = new ApiTaskRepository(http);
  const memory = getMemoryTaskRepository();
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
    list: wrap(api.list.bind(api), memory.list.bind(memory)),
    listMine: wrap(api.listMine.bind(api), memory.listMine.bind(memory)),
    listToday: wrap(api.listToday.bind(api), memory.listToday.bind(memory)),
    listByRelated: wrap(
      api.listByRelated.bind(api),
      memory.listByRelated.bind(memory),
    ),
    getById: wrap(api.getById.bind(api), memory.getById.bind(memory)),
    create: wrap(api.create.bind(api), memory.create.bind(memory)),
    complete: wrap(api.complete.bind(api), memory.complete.bind(memory)),
    reschedule: wrap(api.reschedule.bind(api), memory.reschedule.bind(memory)),
    changeStatus: wrap(
      api.changeStatus.bind(api),
      memory.changeStatus.bind(memory),
    ),
    assign: wrap(api.assign.bind(api), memory.assign.bind(memory)),
    bulkAssign: wrap(api.bulkAssign.bind(api), memory.bulkAssign.bind(memory)),
    escalateOverdue: wrap(
      api.escalateOverdue.bind(api),
      memory.escalateOverdue.bind(memory),
    ),
    ensureFollowUpForLead: wrap(
      api.ensureFollowUpForLead.bind(api),
      memory.ensureFollowUpForLead.bind(memory),
    ),
    ensureBookingOpsTasks: wrap(
      api.ensureBookingOpsTasks.bind(api),
      memory.ensureBookingOpsTasks.bind(memory),
    ),
  };
}
