/**
 * Self-test: task importance scale, board ordering/filtering and the manual task draft (pure).
 * Run: npm run test:tasks
 */

import assert from "node:assert/strict";
import {
  compareTasks,
  filterTasks,
  groupTasksByStatus,
  hasRelatedRecord,
  normalizeTaskPriority,
  summarizeTasks,
  type Task,
} from "../src/entities/task/model.ts";
import {
  TASK_TITLE_MAX,
  freshTaskDraft,
  resolveDue,
  validateTaskDraft,
  type TaskDraft,
} from "../src/features/create-task/model/draft.ts";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const NOW = new Date(2026, 9, 2, 12, 0, 0); // Fri 2 Oct 2026, 12:00 local

function task(over: Partial<Task>): Task {
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    branchId: "b",
    title: "Task",
    kind: "custom",
    status: "open",
    priority: "minor",
    outcome: "",
    assigneeId: "u1",
    assigneeName: "Aisha Khan",
    relatedType: "",
    relatedId: "",
    relatedLabel: "",
    dueAt: null,
    escalatedAt: null,
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    completedAt: null,
    ...over,
  };
}

console.log("tasks self-test");

test("priority: current scale passes through", () => {
  assert.equal(normalizeTaskPriority("critical"), "critical");
  assert.equal(normalizeTaskPriority("major"), "major");
  assert.equal(normalizeTaskPriority("minor"), "minor");
});

test("priority: retired values map onto the new scale", () => {
  assert.equal(normalizeTaskPriority("urgent"), "critical");
  assert.equal(normalizeTaskPriority("HIGH"), "major");
  assert.equal(normalizeTaskPriority(" normal "), "minor");
  assert.equal(normalizeTaskPriority("low"), "minor");
  assert.equal(normalizeTaskPriority(undefined), "minor");
  assert.equal(normalizeTaskPriority("blocker"), "minor");
});

test("related: standalone, nil UUID and linked records", () => {
  assert.equal(hasRelatedRecord({ relatedType: "", relatedId: "" }), false);
  assert.equal(hasRelatedRecord({ relatedType: "", relatedId: "00000000-0000-0000-0000-000000000000" }), false);
  assert.equal(hasRelatedRecord({ relatedType: "lead", relatedId: "00000000-0000-0000-0000-000000000000" }), false);
  assert.equal(hasRelatedRecord({ relatedType: "lead", relatedId: "5b0c3c4e-1111-4b7e-9d43-0c7d1c2b8f10" }), true);
});

test("order: importance first, then earliest deadline, undated last", () => {
  const list = [
    task({ id: "minor-soon", priority: "minor", dueAt: "2026-10-02T13:00:00.000Z" }),
    task({ id: "major-none", priority: "major" }),
    task({ id: "critical-late", priority: "critical", dueAt: "2026-10-09T09:00:00.000Z" }),
    task({ id: "major-soon", priority: "major", dueAt: "2026-10-03T09:00:00.000Z" }),
    task({ id: "critical-soon", priority: "critical", dueAt: "2026-10-02T15:00:00.000Z" }),
  ];
  assert.deepEqual(
    [...list].sort(compareTasks).map((t) => t.id),
    ["critical-soon", "critical-late", "major-soon", "major-none", "minor-soon"],
  );
});

test("group: lanes are sorted with the board order", () => {
  const groups = groupTasksByStatus([
    task({ id: "a", priority: "minor" }),
    task({ id: "b", priority: "critical" }),
    task({ id: "c", status: "done", priority: "major" }),
  ]);
  assert.deepEqual(groups.open.map((t) => t.id), ["b", "a"]);
  assert.deepEqual(groups.done.map((t) => t.id), ["c"]);
  assert.equal(groups.cancelled.length, 0);
});

const board = [
  task({ id: "1", title: "Call Omar", priority: "critical", dueAt: "2026-10-01T08:00:00.000Z", kind: "followup" }),
  task({ id: "2", title: "Passport scan", priority: "major", kind: "document", assigneeId: "u2", assigneeName: "Omar Saleh" }),
  task({ id: "3", title: "Deposit", priority: "critical", status: "done", kind: "payment", dueAt: "2026-09-01T08:00:00.000Z" }),
  task({ id: "4", title: "Visa list", relatedType: "booking", relatedId: "bk-1", relatedLabel: "Al-Harbi family" }),
];

test("stats: only active tasks count", () => {
  assert.deepEqual(summarizeTasks(board, NOW), { open: 3, overdue: 1, critical: 1 });
});

test("filter: search across title, related record and assignee", () => {
  assert.deepEqual(filterTasks(board, { q: "harbi" }, NOW).map((t) => t.id), ["4"]);
  assert.deepEqual(filterTasks(board, { q: "omar" }, NOW).map((t) => t.id), ["1", "2"]);
  assert.deepEqual(filterTasks(board, { q: "  " }, NOW).length, 4);
});

test("filter: importance, kind, assignee, overdue and critical toggles", () => {
  assert.deepEqual(filterTasks(board, { priority: "critical" }, NOW).map((t) => t.id), ["1", "3"]);
  assert.deepEqual(filterTasks(board, { kind: "document" }, NOW).map((t) => t.id), ["2"]);
  assert.deepEqual(filterTasks(board, { assigneeId: "u2" }, NOW).map((t) => t.id), ["2"]);
  assert.deepEqual(filterTasks(board, { overdueOnly: true }, NOW).map((t) => t.id), ["1"]);
  assert.deepEqual(filterTasks(board, { criticalOnly: true }, NOW).map((t) => t.id), ["1"]);
  assert.equal(filterTasks(board, { status: "all", priority: "all", kind: "all", assigneeId: "all" }, NOW).length, 4);
});

const me = { id: "u1", name: "Aisha Khan" };
const draft = (over: Partial<TaskDraft>): TaskDraft => ({ ...freshTaskDraft(NOW, me), title: "Send visa list", ...over });

test("draft: defaults to a minor custom task due tomorrow morning, assigned to me", () => {
  const d = freshTaskDraft(NOW, me);
  assert.equal(d.priority, "minor");
  assert.equal(d.kind, "custom");
  assert.equal(d.duePreset, "tomorrow");
  assert.equal(d.assigneeId, "u1");
  assert.equal(d.dueDate, "2026-10-03");
  assert.equal(d.dueTime, "10:00");
});

test("due presets resolve to local wall-clock slots", () => {
  const at = (p: TaskDraft["duePreset"]) => resolveDue({ duePreset: p, dueDate: "", dueTime: "" }, NOW);
  assert.equal((at("today") as Date).getTime(), new Date(2026, 9, 2, 18, 0).getTime());
  assert.equal((at("tomorrow") as Date).getTime(), new Date(2026, 9, 3, 10, 0).getTime());
  assert.equal((at("in3days") as Date).getTime(), new Date(2026, 9, 5, 10, 0).getTime());
  assert.equal((at("nextWeek") as Date).getTime(), new Date(2026, 9, 9, 10, 0).getTime());
  assert.equal(at("none"), null);
});

test("due 'today' after hours rolls to the next quarter hour, still today or later", () => {
  const late = new Date(2026, 9, 2, 17, 52, 10);
  const due = resolveDue({ duePreset: "today", dueDate: "", dueTime: "" }, late) as Date;
  assert.equal(due.getTime(), new Date(2026, 9, 2, 18, 15).getTime());
  assert.ok(due.getTime() - late.getTime() >= 15 * 60 * 1000);
});

test("due custom: parses local date/time and rejects impossible dates", () => {
  const ok = resolveDue({ duePreset: "custom", dueDate: "2026-10-20", dueTime: "09:30" }, NOW) as Date;
  assert.equal(ok.getTime(), new Date(2026, 9, 20, 9, 30).getTime());
  assert.equal(resolveDue({ duePreset: "custom", dueDate: "2026-02-30", dueTime: "09:00" }, NOW), "invalid");
  assert.equal(resolveDue({ duePreset: "custom", dueDate: "", dueTime: "09:00" }, NOW), "invalid");
  assert.equal(resolveDue({ duePreset: "custom", dueDate: "2026-10-20", dueTime: "25:00" }, NOW), "invalid");
});

test("validate: produces the repository input with importance and ISO deadline", () => {
  const { errors, input } = validateTaskDraft(draft({ title: "  Send   visa list ", priority: "critical", kind: "document" }), NOW);
  assert.deepEqual(errors, {});
  assert.deepEqual(input, {
    title: "Send visa list",
    kind: "document",
    priority: "critical",
    assigneeId: "u1",
    assigneeName: "Aisha Khan",
    dueAt: new Date(2026, 9, 3, 10, 0).toISOString(),
  });
  assert.equal(validateTaskDraft(draft({ duePreset: "none" }), NOW).input?.dueAt, null);
});

test("validate: title required and length-limited (by characters)", () => {
  assert.equal(validateTaskDraft(draft({ title: "   " }), NOW).errors.title, "required");
  assert.equal(validateTaskDraft(draft({ title: "x".repeat(TASK_TITLE_MAX + 1) }), NOW).errors.title, "tooLong");
  assert.equal(validateTaskDraft(draft({ title: "ع".repeat(TASK_TITLE_MAX) }), NOW).errors.title, undefined);
});

test("validate: past or invalid deadline and missing assignee are rejected", () => {
  const past = validateTaskDraft(draft({ duePreset: "custom", dueDate: "2026-10-01", dueTime: "09:00" }), NOW);
  assert.equal(past.errors.due, "past");
  assert.equal(past.input, null);
  assert.equal(validateTaskDraft(draft({ duePreset: "custom", dueDate: "nope" }), NOW).errors.due, "invalid");
  assert.equal(validateTaskDraft(draft({ assigneeId: "" }), NOW).errors.assignee, "required");
});

console.log(`\n${passed} passed`);
