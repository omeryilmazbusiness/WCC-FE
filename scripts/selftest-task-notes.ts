/**
 * Self-test: task note threads (assignee ↔ creator) — API mapping, draft rules, ordering,
 * read state, day grouping, deep links and the en/ar copy the panel needs (pure).
 * Run: npm run test:task-notes
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  TASK_NOTE_MAX,
  appendNote,
  groupNotesByDay,
  isOwnNote,
  mapTaskNote,
  mapTaskNoteThread,
  markThreadRead,
  noteLength,
  normalizeNoteBody,
  sortNotes,
  validateNoteDraft,
  type TaskNote,
} from "../src/entities/task/notes.ts";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const GM = "22222222-2222-2222-2222-222222222201";
const AGENT = "22222222-2222-2222-2222-222222222203";

function note(over: Partial<TaskNote>): TaskNote {
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    taskId: "t1",
    authorId: AGENT,
    authorName: "Sales Employee",
    recipientId: GM,
    recipientName: "General Manager",
    body: "hello",
    createdAt: "2026-10-07T09:00:00.000Z",
    readAt: null,
    ...over,
  };
}

console.log("task notes self-test");

test("thread: maps the API payload", () => {
  const th = mapTaskNoteThread({
    notes: [
      { id: "b", task_id: "t1", author_id: GM, author_name: "General Manager", recipient_id: AGENT, recipient_name: "Sales Employee", body: "Yes", created_at: "2026-10-07T10:00:00Z", read_at: null },
      { id: "a", task_id: "t1", author_id: AGENT, author_name: "Sales Employee", recipient_id: GM, recipient_name: "General Manager", body: "Can we move?", created_at: "2026-10-07T09:00:00Z", read_at: "2026-10-07T09:30:00Z" },
    ],
    can_read: true,
    can_post: true,
    blocked: "",
    recipient_id: GM,
    recipient_name: "General Manager",
    unread: 1,
    max_length: 2000,
  });
  assert.deepEqual(th.notes.map((n) => n.id), ["a", "b"], "oldest first");
  assert.equal(th.notes[0].readAt, "2026-10-07T09:30:00Z");
  assert.equal(th.canPost, true);
  assert.equal(th.recipientName, "General Manager");
  assert.equal(th.unread, 1);
  assert.equal(th.maxLength, 2000);
});

test("thread: missing or hostile fields fail closed", () => {
  const empty = mapTaskNoteThread(undefined);
  assert.equal(empty.canRead, false);
  assert.equal(empty.canPost, false);
  assert.deepEqual(empty.notes, []);
  assert.equal(empty.maxLength, TASK_NOTE_MAX);
  assert.equal(empty.recipientId, null);
  const odd = mapTaskNoteThread({ blocked: "drop table", unread: -4, max_length: "x" });
  assert.equal(odd.blocked, "not_participant", "unknown verdict is treated as private");
  assert.equal(odd.unread, 0);
  assert.equal(odd.maxLength, TASK_NOTE_MAX);
});

test("note: camelCase payloads map too", () => {
  const n = mapTaskNote({ id: 1, taskId: "t", authorId: "a", recipientId: "r", body: "x", createdAt: "c" });
  assert.equal(n.id, "1");
  assert.equal(n.authorId, "a");
  assert.equal(n.readAt, null);
  assert.equal(n.authorName, "");
});

test("draft: empty, whitespace and overlong drafts are blocked", () => {
  assert.equal(validateNoteDraft(""), "empty");
  assert.equal(validateNoteDraft("  \r\n \t"), "empty");
  assert.equal(validateNoteDraft("ok"), null);
  assert.equal(validateNoteDraft("x".repeat(TASK_NOTE_MAX)), null);
  assert.equal(validateNoteDraft("x".repeat(TASK_NOTE_MAX + 1)), "tooLong");
  assert.equal(validateNoteDraft("abcd", 3), "tooLong", "server limit wins");
});

test("draft: length counts code points like the API", () => {
  assert.equal(noteLength("  مرحبا  "), 5);
  assert.equal(noteLength("👍🏽"), 2);
  assert.equal(noteLength("a\r\nb"), 3, "CRLF folds to one newline");
  assert.equal(validateNoteDraft("ع".repeat(TASK_NOTE_MAX)), null);
  assert.equal(normalizeNoteBody("  line1\r\nline2 \n"), "line1\nline2");
});

test("append: adds once and keeps order", () => {
  const th = mapTaskNoteThread({ can_read: true, can_post: true });
  const a = note({ id: "a", createdAt: "2026-10-07T09:00:00Z" });
  const b = note({ id: "b", createdAt: "2026-10-07T08:00:00Z" });
  const once = appendNote(appendNote(th, a), b);
  assert.deepEqual(once.notes.map((n) => n.id), ["b", "a"]);
  assert.equal(appendNote(once, a), once, "a refetched duplicate is ignored");
});

test("sort: equal timestamps order by id, input untouched", () => {
  const input = [note({ id: "z" }), note({ id: "m" })];
  assert.deepEqual(sortNotes(input).map((n) => n.id), ["m", "z"]);
  assert.deepEqual(input.map((n) => n.id), ["z", "m"]);
});

test("read: only the viewer's unread notes are stamped", () => {
  const th = {
    ...mapTaskNoteThread({ can_read: true, unread: 1 }),
    notes: [note({ id: "to-gm" }), note({ id: "to-agent", authorId: GM, recipientId: AGENT })],
  };
  const read = markThreadRead(th, GM, "2026-10-07T12:00:00Z");
  assert.equal(read.unread, 0);
  assert.equal(read.notes[0].readAt, "2026-10-07T12:00:00Z");
  assert.equal(read.notes[1].readAt, null, "the other side's inbox is untouched");
  const settled = markThreadRead(read, GM, "later");
  assert.equal(settled, read, "nothing unread is a no-op");
});

test("own: authored notes align to the viewer side", () => {
  assert.equal(isOwnNote(note({}), AGENT), true);
  assert.equal(isOwnNote(note({}), GM), false);
  assert.equal(isOwnNote(note({ authorId: "" }), ""), false, "no viewer owns nothing");
});

test("days: consecutive notes group per calendar day in the given zone", () => {
  const notes = [
    note({ id: "1", createdAt: "2026-10-06T20:30:00Z" }),
    note({ id: "2", createdAt: "2026-10-06T22:30:00Z" }),
    note({ id: "3", createdAt: "2026-10-07T08:00:00Z" }),
  ];
  assert.deepEqual(
    groupNotesByDay(notes, "UTC").map((d) => [d.day, d.notes.length]),
    [["2026-10-06", 2], ["2026-10-07", 1]],
  );
  assert.deepEqual(
    groupNotesByDay(notes, "Asia/Riyadh").map((d) => [d.day, d.notes.length]),
    [["2026-10-06", 1], ["2026-10-07", 2]],
    "22:30Z is already the next day in Riyadh",
  );
  assert.deepEqual(groupNotesByDay([]), []);
});

test("deep link: task notifications open the task detail", () => {
  const src = readFileSync(new URL("../src/entities/notification/model.ts", import.meta.url), "utf8");
  assert.match(src, /entityType === "task"\) return `\$\{routes\.tasks\}\?task=/);
  const board = readFileSync(new URL("../src/widgets/tasks-board/ui/tasks-board.tsx", import.meta.url), "utf8");
  assert.match(board, /useTaskParam\(\)/, "the board reads ?task=");
});

test("i18n: en and ar carry every key the notes panel uses", () => {
  const panel = readFileSync(new URL("../src/features/task-notes/ui/task-notes.tsx", import.meta.url), "utf8");
  const used = new Set([...panel.matchAll(/\bt\("([a-zA-Z_.]+)"/g)].map((m) => m[1]));
  for (const b of ["closed", "no_creator", "self_assigned", "not_participant"]) used.add(`blocked.${b}`);
  for (const locale of ["en", "ar"]) {
    const msgs = JSON.parse(readFileSync(new URL(`../src/shared/i18n/messages/${locale}.json`, import.meta.url), "utf8"));
    const notes = msgs.tasks.notes;
    for (const key of used) {
      const val = key.split(".").reduce((o: Record<string, unknown> | undefined, k) => o?.[k] as Record<string, unknown> | undefined, notes);
      assert.equal(typeof val, "string", `${locale}: tasks.notes.${key} missing`);
    }
    assert.equal(typeof msgs.tasks.detail.createdBy, "string", `${locale}: tasks.detail.createdBy`);
    assert.equal(typeof msgs.tasks.detail.createdByAutomation, "string", `${locale}: tasks.detail.createdByAutomation`);
    assert.equal(typeof msgs.notificationCenter.kinds.task_note, "string", `${locale}: notificationCenter.kinds.task_note`);
    for (const k of ["placeholder", "label", "emptyHint"]) assert.match(notes[k], /\{name\}/, `${locale}: ${k} names the recipient`);
  }
});

test("look: the task.note kind has an icon and tone", () => {
  const look = readFileSync(new URL("../src/entities/notification/ui/notification-look.ts", import.meta.url), "utf8");
  assert.match(look, /"task\.note": \{ icon: MessageSquareText, tone: "sky" \}/);
});

console.log(`\n${passed} passed`);
