/**
 * Self-test: notification center feed helpers — headline totals and the Today / Yesterday /
 * Earlier split (pure).
 * Run: npm run test:notifications
 */

import assert from "node:assert/strict";
import {
  groupNotificationsByDay,
  notificationDay,
  notificationTimestamp,
  summarizeNotificationGroups,
} from "../src/entities/notification/lib/feed.ts";
import type { AppNotification, NotificationGroup } from "../src/entities/notification/model.ts";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const NOW = new Date(2026, 9, 3, 9, 30, 0); // Sat 3 Oct 2026, 09:30 local
const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0, 0).toISOString();

function note(over: Partial<AppNotification>): AppNotification {
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    branchId: "b",
    recipientUserId: "u",
    kind: "task.overdue",
    severity: "warning",
    title: "Alert",
    body: "",
    entityType: "",
    entityId: null,
    groupKey: "",
    occurrenceCount: 1,
    status: "open",
    hrefHint: "",
    createdAt: at(3, 8),
    updatedAt: "",
    acknowledgedAt: null,
    resolvedAt: null,
    ...over,
  };
}

function group(over: Partial<NotificationGroup>): NotificationGroup {
  return { kind: "k", severity: "info", title: "", href: "", open: 0, acknowledged: 0, occurrences: 0, latestAt: at(3, 8), ...over };
}

console.log("notifications self-test");

test("totals: open and acknowledged add up; critical counts only open critical alerts", () => {
  const totals = summarizeNotificationGroups([
    group({ kind: "a", severity: "critical", open: 2, acknowledged: 3 }),
    group({ kind: "b", severity: "warning", open: 4, acknowledged: 1 }),
    group({ kind: "c", severity: "critical", open: 0, acknowledged: 5 }),
  ]);
  assert.deepEqual(totals, { open: 6, acknowledged: 9, critical: 2 });
  assert.deepEqual(summarizeNotificationGroups([]), { open: 0, acknowledged: 0, critical: 0 });
});

test("timestamp: a repeat (updatedAt) wins over the first occurrence", () => {
  assert.equal(notificationTimestamp({ createdAt: at(1, 8), updatedAt: at(3, 8) }), at(3, 8));
  assert.equal(notificationTimestamp({ createdAt: at(1, 8), updatedAt: "" }), at(1, 8));
});

test("day: local midnight boundaries, across a month change, bad input is earlier", () => {
  assert.equal(notificationDay(at(3, 0), NOW), "today");
  assert.equal(notificationDay(at(2, 23), NOW), "yesterday");
  assert.equal(notificationDay(at(2, 0), NOW), "yesterday");
  assert.equal(notificationDay(at(1, 23), NOW), "earlier");
  const firstOfMonth = new Date(2026, 9, 1, 10, 0, 0);
  assert.equal(notificationDay(new Date(2026, 8, 30, 22, 0, 0).toISOString(), firstOfMonth), "yesterday");
  assert.equal(notificationDay("not a date", NOW), "earlier");
});

test("sections: ordered today → yesterday → earlier, list order kept, empty sections dropped", () => {
  const items = [
    note({ id: "a", createdAt: at(3, 9) }),
    note({ id: "b", createdAt: at(1, 9) }),
    note({ id: "c", createdAt: at(3, 7) }),
    note({ id: "d", createdAt: at(1, 7), updatedAt: at(3, 8) }),
  ];
  const sections = groupNotificationsByDay(items, NOW);
  assert.deepEqual(
    sections.map((s) => [s.day, s.items.map((n) => n.id)]),
    [
      ["today", ["a", "c", "d"]],
      ["earlier", ["b"]],
    ],
  );
  assert.deepEqual(groupNotificationsByDay([], NOW), []);
});

console.log(`\n${passed} passed`);
