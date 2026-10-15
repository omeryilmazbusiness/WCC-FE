"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Check, CheckCheck, Lock, MessageSquareText, SendHorizontal } from "lucide-react";
import {
  appendNote,
  groupNotesByDay,
  isOwnNote,
  markThreadRead,
  noteLength,
  validateNoteDraft,
  type Task,
  type TaskNote,
  type TaskNoteThread,
  type TaskRepository,
} from "@/entities/task";
import { initials } from "@/shared/lib/avatar";
import { cn } from "@/shared/lib/cn";
import { formatDate } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { useRealtime } from "@/shared/lib/use-realtime";
import { Textarea, useMutationFeedback } from "@/shared/ui";

const LIVE_TOPICS = ["task.note"] as const;
const TIME_FORMAT: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
const DAY_FORMAT: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };
/** The counter appears once a draft uses this share of the limit. */
const COUNTER_FROM = 0.8;

type Props = {
  task: Task;
  repository: TaskRepository;
  viewerId: string;
  locale: string;
};

/** Note thread between a task's assignee and the manager who created it. */
export function TaskNotes({ task, repository, viewerId, locale }: Props) {
  const t = useTranslations("tasks.notes");
  const feedback = useMutationFeedback();
  const query = useApiQuery(() => repository.notes(task.id), [task.id, task.status, task.assigneeId], {
    cacheKey: ["task-notes", task.id],
  });
  const thread = query.data;
  const { refresh, setData } = query;

  useRealtime(() => void refresh(), { types: ["invalidate", "notification"], topics: LIVE_TOPICS });

  const unread = thread?.unread ?? 0;
  useEffect(() => {
    if (unread === 0) return;
    let cancelled = false;
    repository
      .markNotesRead(task.id)
      .then(() => {
        if (!cancelled) setData((cur) => (cur ? markThreadRead(cur, viewerId, new Date().toISOString()) : cur));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [unread, task.id, repository, viewerId, setData]);

  if (!thread) {
    return (
      <div className="space-y-2" aria-busy={query.loading} data-testid="task-notes-loading">
        {query.error ? (
          <button
            type="button"
            onClick={() => void query.reload()}
            className="w-full rounded-2xl border border-dashed border-zinc-200 px-4 py-4 text-center text-[13px] font-medium text-zinc-500 hover:bg-zinc-50"
          >
            {t("loadError")}
          </button>
        ) : (
          <>
            <div className="h-12 w-3/4 animate-pulse rounded-2xl bg-zinc-100" />
            <div className="ms-auto h-12 w-2/3 animate-pulse rounded-2xl bg-zinc-100" />
          </>
        )}
      </div>
    );
  }

  if (!thread.canRead) {
    return <Notice icon={Lock} text={t("blocked.not_participant")} testId="task-notes-private" />;
  }

  return (
    <div className="space-y-3" data-testid="task-notes">
      <NoteList notes={thread.notes} viewerId={viewerId} locale={locale} recipientName={thread.recipientName} canPost={thread.canPost} />
      {thread.canPost ? (
        <Composer
          thread={thread}
          onSend={async (body) => {
            try {
              const note = await repository.addNote(task.id, body);
              setData((cur) => (cur ? appendNote(cur, note) : cur));
              return true;
            } catch (err) {
              feedback.error(err, t("sendError"));
              return false;
            }
          }}
        />
      ) : thread.blocked ? (
        <Notice icon={Lock} text={t(`blocked.${thread.blocked}`)} testId="task-notes-blocked" />
      ) : null}
    </div>
  );
}

function NoteList({
  notes,
  viewerId,
  locale,
  recipientName,
  canPost,
}: {
  notes: TaskNote[];
  viewerId: string;
  locale: string;
  recipientName: string;
  canPost: boolean;
}) {
  const t = useTranslations("tasks.notes");
  const listRef = useRef<HTMLOListElement>(null);
  const days = useMemo(() => groupNotesByDay(notes), [notes]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [notes.length]);

  if (notes.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-zinc-200 px-4 py-5 text-center"
        data-testid="task-notes-empty"
      >
        <MessageSquareText className="h-5 w-5 text-zinc-300" aria-hidden />
        <p className="text-[13px] font-medium text-zinc-500">{t("empty")}</p>
        {canPost && recipientName ? (
          <p className="text-[12px] text-zinc-400">{t("emptyHint", { name: recipientName })}</p>
        ) : null}
      </div>
    );
  }

  return (
    <ol ref={listRef} className="max-h-[22rem] space-y-3 overflow-y-auto pe-1 [scrollbar-width:thin]" aria-label={t("title")} data-testid="task-notes-list">
      {days.map((day) => (
        <li key={day.day} className="space-y-2">
          <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            {formatDate(day.notes[0].createdAt, locale, DAY_FORMAT)}
          </p>
          <ul className="space-y-2">
            {day.notes.map((note) => (
              <NoteBubble key={note.id} note={note} own={isOwnNote(note, viewerId)} locale={locale} />
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function NoteBubble({ note, own, locale }: { note: TaskNote; own: boolean; locale: string }) {
  const t = useTranslations("tasks.notes");
  const SeenIcon = note.readAt ? CheckCheck : Check;
  return (
    <li className={cn("flex items-end gap-2", own && "flex-row-reverse")} data-testid="task-note" data-own={own ? "true" : "false"}>
      {own ? null : (
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10.5px] font-bold text-zinc-600"
          aria-hidden
        >
          {initials(note.authorName || "?")}
        </span>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5",
          own ? "rounded-ee-md bg-zinc-950 text-white" : "rounded-es-md bg-zinc-50 text-zinc-900 ring-1 ring-inset ring-zinc-200/70",
        )}
      >
        {own ? null : <p className="mb-0.5 text-[11.5px] font-semibold text-zinc-500">{note.authorName || t("someone")}</p>}
        <p dir="auto" className="whitespace-pre-wrap break-words text-start text-[13.5px] leading-relaxed">
          {note.body}
        </p>
        <p className="mt-1 flex items-center justify-end gap-1 text-[10.5px] text-zinc-400">
          <time dateTime={note.createdAt}>{formatDate(note.createdAt, locale, TIME_FORMAT)}</time>
          {own ? (
            <SeenIcon
              className={cn("h-3.5 w-3.5", note.readAt ? "text-sky-300" : "text-zinc-500")}
              aria-label={note.readAt ? t("seen") : t("sent")}
            />
          ) : null}
        </p>
      </div>
    </li>
  );
}

function Composer({ thread, onSend }: { thread: TaskNoteThread; onSend: (body: string) => Promise<boolean> }) {
  const t = useTranslations("tasks.notes");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const issue = validateNoteDraft(draft, thread.maxLength);
  const length = noteLength(draft);
  const showCounter = length >= thread.maxLength * COUNTER_FROM;

  async function send() {
    if (issue || sending) return;
    setSending(true);
    const ok = await onSend(draft);
    setSending(false);
    if (ok) setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <form
      className="rounded-2xl bg-white ring-1 ring-inset ring-zinc-200/80 focus-within:ring-zinc-300"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
      data-testid="task-notes-composer"
    >
      <label htmlFor="task-note-draft" className="sr-only">
        {t("label", { name: thread.recipientName || t("someone") })}
      </label>
      <Textarea
        id="task-note-draft"
        dir="auto"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t("placeholder", { name: thread.recipientName || t("someone") })}
        className="min-h-[76px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        maxLength={thread.maxLength * 2}
        disabled={sending}
        aria-invalid={issue === "tooLong"}
        data-testid="task-notes-input"
      />
      <div className="flex items-center gap-2 border-t border-zinc-100 px-3 py-2">
        <p className={cn("flex-1 truncate text-[11.5px]", issue === "tooLong" ? "font-semibold text-rose-600" : "text-zinc-400")}>
          {issue === "tooLong"
            ? t("tooLong", { max: thread.maxLength })
            : showCounter
              ? t("counter", { count: length, max: thread.maxLength })
              : t("shortcut")}
        </p>
        <button
          type="submit"
          disabled={Boolean(issue) || sending}
          className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-zinc-950 px-3 text-[12.5px] font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
          data-testid="task-notes-send"
        >
          <SendHorizontal className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
          {sending ? t("sending") : t("send")}
        </button>
      </div>
    </form>
  );
}

function Notice({ icon: Icon, text, testId }: { icon: typeof Lock; text: string; testId: string }) {
  return (
    <p
      className="flex items-center gap-2 rounded-2xl bg-zinc-50 px-3.5 py-3 text-[12.5px] font-medium text-zinc-500 ring-1 ring-inset ring-zinc-200/70"
      data-testid={testId}
    >
      <Icon className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
      {text}
    </p>
  );
}
