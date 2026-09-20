import {
  canTransitionTask,
  type Task,
  type TaskCreateInput,
  type TaskKind,
  type TaskStatus,
} from "./model";

export interface TaskRepository {
  list(): Promise<Task[]>;
  listMine(assigneeId: string): Promise<Task[]>;
  listToday(assigneeId: string): Promise<Task[]>;
  getById(id: string): Promise<Task>;
  create(input: TaskCreateInput): Promise<Task>;
  complete(id: string): Promise<Task>;
  reschedule(id: string, dueAt: string | null): Promise<Task>;
  changeStatus(id: string, status: TaskStatus): Promise<Task>;
  /** Idempotent seed used when a lead is created (widget orchestration). */
  ensureFollowUpForLead(input: {
    leadId: string;
    leadName: string;
    assigneeId: string;
    assigneeName: string;
    customerId?: string | null;
  }): Promise<Task>;
  /** Idempotent seed when a booking is confirmed. */
  ensureBookingOpsTasks(input: {
    bookingId: string;
    label: string;
    assigneeId: string;
    assigneeName: string;
    customerId?: string | null;
  }): Promise<Task[]>;
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
    assigneeId: SALES.id,
    assigneeName: SALES.name,
    relatedType: "lead",
    relatedId: "lead-1",
    relatedLabel: "Ahmed Al-Rashid",
    customerId: "demo-1",
    dueAt: daysFromNow(0),
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
    assigneeId: SALES.id,
    assigneeName: SALES.name,
    relatedType: "booking",
    relatedId: "bk-demo",
    relatedLabel: "Booking bk-demo",
    customerId: "demo-1",
    dueAt: daysAgo(1),
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
    assigneeId: SALES.id,
    assigneeName: SALES.name,
    relatedType: "booking",
    relatedId: "bk-demo",
    relatedLabel: "Booking bk-demo",
    customerId: "demo-1",
    dueAt: daysFromNow(2),
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
    assigneeId: MANAGER.id,
    assigneeName: MANAGER.name,
    relatedType: "lead",
    relatedId: "lead-3",
    relatedLabel: "Omar Khalil",
    dueAt: daysFromNow(0),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    completedAt: null,
  },
];

function clone(t: Task): Task {
  return { ...t };
}

export class MemoryTaskRepository implements TaskRepository {
  async list(): Promise<Task[]> {
    return store.map(clone);
  }

  async listMine(assigneeId: string): Promise<Task[]> {
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
      assigneeId: input.assigneeId,
      assigneeName: input.assigneeName,
      relatedType: input.relatedType,
      relatedId: input.relatedId,
      relatedLabel: input.relatedLabel,
      customerId: input.customerId ?? null,
      dueAt: input.dueAt ?? daysFromNow(1),
      createdAt: stamp,
      updatedAt: stamp,
      completedAt: null,
    };
    store.unshift(task);
    return clone(task);
  }

  async complete(id: string): Promise<Task> {
    return this.changeStatus(id, "done");
  }

  async reschedule(id: string, dueAt: string | null): Promise<Task> {
    const t = store.find((x) => x.id === id);
    if (!t) throw new Error("task not found");
    if (t.status === "done" || t.status === "cancelled") {
      throw new Error("cannot reschedule closed task");
    }
    t.dueAt = dueAt;
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

/** Shared singleton for demo session (same pattern as MemoryLeadRepository store). */
let singleton: MemoryTaskRepository | null = null;

export function getMemoryTaskRepository(): MemoryTaskRepository {
  if (!singleton) singleton = new MemoryTaskRepository();
  return singleton;
}
