/** Mirrors the API bound on a note (characters, after trimming). */
export const TASK_NOTE_MAX = 2000;

/** Why the viewer cannot post on a thread; empty when they can. */
export type TaskNoteBlocked = "" | "no_creator" | "self_assigned" | "closed" | "not_participant";

const BLOCKED: readonly TaskNoteBlocked[] = ["", "no_creator", "self_assigned", "closed", "not_participant"];

/** A message between a task's assignee and the manager who created it. */
export type TaskNote = {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  recipientId: string;
  recipientName: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

/** A task's notes as the viewer sees them, with what they may do. */
export type TaskNoteThread = {
  notes: TaskNote[];
  canRead: boolean;
  canPost: boolean;
  blocked: TaskNoteBlocked;
  /** Who a new note from the viewer reaches. */
  recipientId: string | null;
  recipientName: string;
  /** Notes addressed to the viewer that they have not opened. */
  unread: number;
  maxLength: number;
};

type Raw = Record<string, unknown>;

const str = (v: unknown) => (v == null ? "" : String(v));

export function mapTaskNote(raw: Raw): TaskNote {
  return {
    id: str(raw.id),
    taskId: str(raw.task_id ?? raw.taskId),
    authorId: str(raw.author_id ?? raw.authorId),
    authorName: str(raw.author_name ?? raw.authorName),
    recipientId: str(raw.recipient_id ?? raw.recipientId),
    recipientName: str(raw.recipient_name ?? raw.recipientName),
    body: str(raw.body),
    createdAt: str(raw.created_at ?? raw.createdAt),
    readAt: (raw.read_at ?? raw.readAt ?? null) as string | null,
  };
}

export function mapTaskNoteThread(raw: Raw | null | undefined): TaskNoteThread {
  const r = raw ?? {};
  const blocked = str(r.blocked) as TaskNoteBlocked;
  const notes = Array.isArray(r.notes) ? (r.notes as Raw[]).map(mapTaskNote) : [];
  const max = Number(r.max_length ?? r.maxLength);
  return {
    notes: sortNotes(notes),
    canRead: Boolean(r.can_read ?? r.canRead),
    canPost: Boolean(r.can_post ?? r.canPost),
    blocked: BLOCKED.includes(blocked) ? blocked : "not_participant",
    recipientId: (r.recipient_id ?? r.recipientId ?? null) as string | null,
    recipientName: str(r.recipient_name ?? r.recipientName),
    unread: Math.max(0, Number(r.unread ?? 0) || 0),
    maxLength: Number.isFinite(max) && max > 0 ? max : TASK_NOTE_MAX,
  };
}

/** The text the API will store: CRLF folded and surrounding whitespace dropped. */
export function normalizeNoteBody(body: string): string {
  return body.replace(/\r\n/g, "\n").trim();
}

/** Length the API counts (code points, so Arabic and emoji count as one each). */
export function noteLength(body: string): number {
  return [...normalizeNoteBody(body)].length;
}

export type NoteDraftIssue = "empty" | "tooLong";

export function validateNoteDraft(body: string, max = TASK_NOTE_MAX): NoteDraftIssue | null {
  const n = noteLength(body);
  if (n === 0) return "empty";
  if (n > max) return "tooLong";
  return null;
}

/** Oldest first; ties keep a stable id order so optimistic and fetched lists agree. */
export function sortNotes(notes: TaskNote[]): TaskNote[] {
  return [...notes].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

/** Adds a just-sent note to the thread without duplicating one a refetch already brought. */
export function appendNote(thread: TaskNoteThread, note: TaskNote): TaskNoteThread {
  if (thread.notes.some((n) => n.id === note.id)) return thread;
  return { ...thread, notes: sortNotes([...thread.notes, note]) };
}

/** Thread after the viewer opened it: their unread notes count as read. */
export function markThreadRead(thread: TaskNoteThread, viewerId: string, at: string): TaskNoteThread {
  if (thread.unread === 0) return thread;
  return {
    ...thread,
    unread: 0,
    notes: thread.notes.map((n) => (n.recipientId === viewerId && !n.readAt ? { ...n, readAt: at } : n)),
  };
}

export function isOwnNote(note: Pick<TaskNote, "authorId">, viewerId: string): boolean {
  return Boolean(viewerId) && note.authorId === viewerId;
}

export type TaskNoteDay = { day: string; notes: TaskNote[] };

function dayKey(iso: string, timeZone?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Groups consecutive notes by calendar day (YYYY-MM-DD in timeZone, local by default). */
export function groupNotesByDay(notes: TaskNote[], timeZone?: string): TaskNoteDay[] {
  const out: TaskNoteDay[] = [];
  for (const note of notes) {
    const day = dayKey(note.createdAt, timeZone);
    const last = out[out.length - 1];
    if (last && last.day === day) last.notes.push(note);
    else out.push({ day, notes: [note] });
  }
  return out;
}
