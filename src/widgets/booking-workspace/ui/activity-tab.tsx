"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, History, MessageSquareText, Pin, Repeat2, Trash2, X } from "lucide-react";
import type { BookingActivity, BookingChangeRequest, BookingNote, BookingWorkspaceRepository } from "@/entities/booking";
import { useCan } from "@/entities/viewer";
import { cn } from "@/shared/lib/cn";
import { formatDateTime, formatRelativeTime } from "@/shared/lib/format";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { Button, InitialsAvatar, Input, QueryState, Textarea, useMutationFeedback } from "@/shared/ui";
import { WorkspaceSection } from "./section";

type Props = {
  bookingId: string;
  workspace: BookingWorkspaceRepository;
  /** Bumped by the parent after actions that write audit events. */
  version: number;
  onChanged: () => void;
};

const CHANGE_TONE: Record<BookingChangeRequest["status"], string> = {
  requested: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  rejected: "bg-rose-50 text-rose-700",
};

export function ActivityTab({ bookingId, workspace, version, onChanged }: Props) {
  const t = useTranslations("bookingWorkspace");
  const locale = useLocale();
  const feedback = useMutationFeedback();
  const canWrite = useCan("bookings.write");
  const notes = useApiQuery(() => workspace.listNotes(bookingId), [workspace, bookingId, version]);
  const changes = useApiQuery(() => workspace.listChanges(bookingId), [workspace, bookingId, version]);
  const activity = useApiQuery(() => workspace.activity(bookingId), [workspace, bookingId, version]);
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const reloadAll = () => {
    void notes.reload();
    void changes.reload();
    void activity.reload();
  };

  async function addNote() {
    setSaving(true);
    try {
      await workspace.addNote(bookingId, body.trim(), pinned);
      setBody("");
      setPinned(false);
      feedback.success(t("activity.noteAdded"));
      reloadAll();
    } catch (err) {
      feedback.error(err, t("errors.save"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(n: BookingNote) {
    try {
      await workspace.deleteNote(bookingId, n.id);
      feedback.success(t("activity.noteDeleted"));
      reloadAll();
    } catch (err) {
      feedback.error(err, t("errors.save"));
    }
  }

  async function resolve(c: BookingChangeRequest, status: "completed" | "rejected", note = "") {
    try {
      await workspace.resolveChange(bookingId, c.id, status, note);
      feedback.success(t("activity.resolved"));
      setRejecting(null);
      setRejectNote("");
      reloadAll();
      onChanged();
    } catch (err) {
      feedback.error(err, t("errors.save"));
    }
  }

  const sortedNotes = [...(notes.data ?? [])].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" data-testid="booking-tab-activity">
      <div className="space-y-4">
        <WorkspaceSection icon={MessageSquareText} tone="amber" title={t("activity.notes")}>
          <p className="-mt-1 mb-3 text-[12px] text-zinc-400">{t("activity.notesHint")}</p>
          {canWrite ? (
            <div className="space-y-2 rounded-2xl bg-amber-50/50 p-3">
              <Textarea
                rows={3}
                maxLength={4000}
                value={body}
                placeholder={t("activity.notePlaceholder")}
                onChange={(e) => setBody(e.target.value)}
                data-testid="note-body"
              />
              <div className="flex items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-medium text-zinc-600">
                  <input type="checkbox" className="h-4 w-4 accent-amber-500" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
                  {t("activity.pin")}
                </label>
                <Button size="sm" disabled={saving || !body.trim()} onClick={() => void addNote()} data-testid="note-add">
                  {t("activity.addNote")}
                </Button>
              </div>
            </div>
          ) : null}
          <QueryState loading={notes.loading && !notes.data} error={notes.error} onRetry={() => void notes.reload()}>
            {sortedNotes.length === 0 ? (
              <p className="mt-3 text-[13px] text-zinc-400">{t("activity.noNotes")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {sortedNotes.map((n) => (
                  <li key={n.id} className={cn("rounded-2xl p-3 ring-1", n.pinned ? "bg-amber-50/70 ring-amber-200" : "bg-white ring-zinc-100")} data-testid="note-item">
                    <div className="flex items-center gap-2">
                      <InitialsAvatar id={n.authorId} name={n.authorName || "?"} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-zinc-900">{n.authorName || t("activity.system")}</span>
                        <span className="text-[11.5px] text-zinc-400" title={formatDateTime(n.createdAt, locale)}>
                          {formatRelativeTime(n.createdAt, locale)}
                        </span>
                      </span>
                      {n.pinned ? <Pin className="h-4 w-4 text-amber-500" aria-label={t("activity.pinned")} /> : null}
                      {n.canDelete ? (
                        <button
                          type="button"
                          aria-label={t("activity.deleteNote")}
                          onClick={() => void deleteNote(n)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-zinc-800">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </WorkspaceSection>

        <WorkspaceSection icon={Repeat2} tone="indigo" title={t("activity.changes")}>
          <QueryState loading={changes.loading && !changes.data} error={changes.error} onRetry={() => void changes.reload()}>
            {(changes.data ?? []).length === 0 ? (
              <p className="text-[13px] text-zinc-400">{t("activity.noChanges")}</p>
            ) : (
              <ul className="space-y-2">
                {(changes.data ?? []).map((c) => (
                  <li key={c.id} className="rounded-2xl bg-white p-3 ring-1 ring-zinc-100" data-testid="change-item">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-semibold text-zinc-900">{t(`change.kind.${c.kind}`)}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", CHANGE_TONE[c.status])}>{t(`change.status.${c.status}`)}</span>
                      <span className="ms-auto text-[11.5px] text-zinc-400">{formatRelativeTime(c.createdAt, locale)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[13px] text-zinc-700">{c.details}</p>
                    <p className="mt-1 text-[11.5px] text-zinc-400">{t("activity.requestedBy", { name: c.requestedByName || "—" })}</p>
                    {c.resolutionNote ? <p className="mt-1 text-[12px] italic text-zinc-500">“{c.resolutionNote}”</p> : null}
                    {canWrite && c.status === "requested" ? (
                      rejecting === c.id ? (
                        <div className="mt-2 flex gap-2">
                          <Input value={rejectNote} placeholder={t("activity.rejectReason")} onChange={(e) => setRejectNote(e.target.value)} autoFocus />
                          <Button size="sm" variant="outline" disabled={!rejectNote.trim()} onClick={() => void resolve(c, "rejected", rejectNote.trim())}>
                            {t("activity.reject")}
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" onClick={() => void resolve(c, "completed")} data-testid="change-complete">
                            <Check className="h-4 w-4" aria-hidden />
                            {t("activity.complete")}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRejecting(c.id)}>
                            <X className="h-4 w-4" aria-hidden />
                            {t("activity.reject")}
                          </Button>
                        </div>
                      )
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </WorkspaceSection>
      </div>

      <WorkspaceSection icon={History} tone="violet" title={t("activity.timeline")}>
        <QueryState loading={activity.loading && !activity.data} error={activity.error} onRetry={() => void activity.reload()}>
          {(activity.data ?? []).length === 0 ? (
            <p className="text-[13px] text-zinc-400">{t("activity.noActivity")}</p>
          ) : (
            <ol className="relative space-y-3 border-s-2 border-zinc-100 ps-4">
              {(activity.data ?? []).map((a) => (
                <TimelineItem key={a.id} item={a} />
              ))}
            </ol>
          )}
        </QueryState>
      </WorkspaceSection>
    </div>
  );
}

const DETAIL_KEYS = ["status", "channel", "document", "kind", "amount", "currency", "full_name", "pnr", "note", "status_reason"] as const;

function TimelineItem({ item }: { item: BookingActivity }) {
  const t = useTranslations("bookingWorkspace.activity");
  const locale = useLocale();
  const known = t.has(`action.${item.action}`);
  const details = DETAIL_KEYS.flatMap((k) => {
    const v = item.details[k];
    if (v === undefined || v === null || v === "") return [];
    const from = item.details[`from_${k}`];
    return [from !== undefined && from !== "" ? `${String(from)} → ${String(v)}` : String(v)];
  });
  return (
    <li className="relative" data-testid="activity-item">
      <span className="absolute -start-[23px] top-1.5 h-3 w-3 rounded-full bg-violet-500 ring-4 ring-white" aria-hidden />
      <p className="text-[13.5px] font-semibold text-zinc-900">{known ? t(`action.${item.action}`) : t("action.other")}</p>
      {details.length ? <p className="truncate text-[12.5px] text-zinc-600" dir="auto">{details.join(" · ")}</p> : null}
      <p className="text-[11.5px] text-zinc-400" title={formatDateTime(item.createdAt, locale)}>
        {item.actorName || t("system")} · {formatRelativeTime(item.createdAt, locale)}
      </p>
    </li>
  );
}
