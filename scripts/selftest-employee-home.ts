/**
 * Self-test: agent My Work board metrics — open pipeline, task filters, KPI tiles.
 * Run: npm run test:employee-home
 */
import assert from "node:assert/strict";
import {
  countByStage,
  filterHomeTasks,
  homeKpis,
  isOpenLead,
  openLeads,
  orderTasks,
} from "../src/widgets/employee-home/model/home-metrics.ts";

const now = new Date("2026-10-25T10:00:00Z");

function lead(stage: string, id = stage) {
  return { id, stage } as { id: string; stage: "new" | "contacted" | "qualified" | "proposal" | "paid" | "won" | "lost" };
}

function task(p: { id: string; status?: "open" | "in_progress" | "done" | "cancelled"; dueAt?: string | null; priority?: "critical" | "major" | "minor" }) {
  return {
    status: "open" as const,
    dueAt: null as string | null,
    priority: "minor" as const,
    ...p,
  };
}

assert.equal(isOpenLead(lead("new")), true);
assert.equal(isOpenLead(lead("won")), false);
assert.deepEqual(
  openLeads([lead("new"), lead("won"), lead("paid"), lead("lost")]).map((l) => l.stage),
  ["new", "paid"],
);

const stages = countByStage([lead("new"), lead("new"), lead("proposal"), lead("won")]);
assert.equal(stages.new, 2);
assert.equal(stages.proposal, 1);
assert.equal(stages.won, 1);
assert.equal(stages.contacted, 0);

const ranked = orderTasks([{ id: "c" }, { id: "a" }, { id: "b" }], ["b", "a"]);
assert.deepEqual(
  ranked.map((t) => t.id),
  ["b", "a", "c"],
);
assert.deepEqual(
  orderTasks([{ id: "x" }, { id: "y" }], []).map((t) => t.id),
  ["x", "y"],
);

const queue = [
  task({ id: "late", dueAt: "2026-10-24T09:00:00Z", priority: "critical" }),
  task({ id: "doing", status: "in_progress", dueAt: "2026-10-26T09:00:00Z" }),
  task({ id: "done", status: "done", dueAt: "2026-10-24T09:00:00Z", priority: "critical" }),
];
assert.deepEqual(
  filterHomeTasks(queue, "overdue", now).map((t) => t.id),
  ["late"],
);
assert.deepEqual(
  filterHomeTasks(queue, "progress", now).map((t) => t.id),
  ["doing"],
);
assert.deepEqual(
  filterHomeTasks(queue, "critical", now).map((t) => t.id),
  ["late"],
  "closed critical tasks stay off the home filter",
);

const kpi = homeKpis({
  leads: [lead("new"), lead("won"), lead("qualified")],
  tasks: queue,
  paymentDue: 3,
  now,
});
assert.deepEqual(kpi, { leadsOpen: 2, tasksOverdue: 1, tasksOpen: 2, paymentDue: 3 });
assert.equal(homeKpis({ leads: [], tasks: [], paymentDue: -2 }).paymentDue, 0);

console.log("employee-home: metrics passed");
