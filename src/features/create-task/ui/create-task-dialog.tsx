"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, CalendarOff, ListPlus, Loader2 } from "lucide-react";
import { createLeadRepository } from "@/entities/lead";
import {
  TASK_KIND_LOOK,
  TASK_KINDS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LOOK,
  type Task,
  type TaskRepository,
} from "@/entities/task";
import { useCan, useViewer } from "@/entities/viewer";
import { initials } from "@/shared/lib/avatar";
import { cn } from "@/shared/lib/cn";
import { formatDate } from "@/shared/lib/format";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TONES,
  useMutationFeedback,
} from "@/shared/ui";
import {
  DUE_PRESETS,
  TASK_TITLE_MAX,
  freshTaskDraft,
  resolveDue,
  validateTaskDraft,
  type DraftErrors,
  type TaskDraft,
} from "../model/draft";

type Props = {
  repository: TaskRepository;
  onCreated: (task: Task) => void;
  /** Lets the creator hand the task to a teammate; otherwise it is assigned to them. */
  canAssignOthers?: boolean;
  trigger: ReactNode;
};

type Owner = { id: string; name: string };

/** Manual task: title, kind, importance, deadline and assignee in one sheet. */
export function CreateTaskDialog({ repository, onCreated, canAssignOthers, trigger }: Props) {
  const allowed = useCan("tasks.write");
  const t = useTranslations("tasks.create");
  const tt = useTranslations("tasks");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { user } = useViewer();
  const feedback = useMutationFeedback();
  const self = useMemo<Owner>(() => ({ id: user.id, name: user.fullName }), [user.id, user.fullName]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(() => freshTaskDraft(new Date(), self));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [owners, setOwners] = useState<Owner[]>([self]);
  const leadRepo = useMemo(() => createLeadRepository(), []);

  useEffect(() => {
    if (!open || !canAssignOthers) return;
    let alive = true;
    leadRepo
      .listOwners()
      .then((rows) => {
        if (!alive) return;
        const rest = rows.filter((o) => o.id !== self.id).sort((a, b) => a.name.localeCompare(b.name, locale));
        setOwners([self, ...rest]);
      })
      .catch((err: unknown) => feedback.error(err));
    return () => {
      alive = false;
    };
  }, [open, canAssignOthers, leadRepo, self, locale, feedback]);

  function update(patch: Partial<TaskDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors({});
  }

  function reset() {
    setDraft(freshTaskDraft(new Date(), self));
    setErrors({});
  }

  async function submit() {
    const { errors: found, input } = validateTaskDraft(draft, new Date());
    setErrors(found);
    if (!input) return;
    setSubmitting(true);
    try {
      const created = await repository.create(input);
      feedback.success(t("created"), created.title);
      onCreated(created);
      setOpen(false);
      reset();
    } catch (err) {
      feedback.error(err, t("error"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!allowed) return null;

  const due = open ? resolveDue(draft, new Date()) : null;
  const dueSummary =
    due === "invalid" || due === null
      ? null
      : formatDate(due, locale, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const titleLength = [...draft.title.trim()].length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto" data-testid="create-task-dialog">
        <DialogHeader>
          <div className="flex items-center gap-3.5">
            <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]", TONES.indigo.gradient)} aria-hidden>
              <ListPlus className="h-6 w-6" strokeWidth={2.1} />
            </span>
            <div className="min-w-0">
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>{t("hint")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          className="space-y-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="task-title">{t("fields.title")}</Label>
              <span className={cn("text-[11px] tabular-nums", titleLength > TASK_TITLE_MAX ? "text-rose-600" : "text-zinc-400")}>
                {titleLength}/{TASK_TITLE_MAX}
              </span>
            </div>
            <Input
              id="task-title"
              autoFocus
              autoComplete="off"
              dir="auto"
              placeholder={t("titlePlaceholder")}
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
              aria-invalid={Boolean(errors.title)}
              className="h-12 text-[15px] font-medium"
              data-testid="create-task-title"
            />
            {errors.title ? <FieldError>{t(`errors.title.${errors.title}`, { max: TASK_TITLE_MAX })}</FieldError> : null}
          </div>

          <fieldset>
            <legend className="mb-2.5 text-[13px] font-semibold text-zinc-700">{t("fields.priority")}</legend>
            <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label={t("fields.priority")}>
              {TASK_PRIORITIES.map((priority) => {
                const look = TASK_PRIORITY_LOOK[priority];
                const Icon = look.icon;
                const active = draft.priority === priority;
                return (
                  <button
                    key={priority}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-testid={`create-task-priority-${priority}`}
                    onClick={() => update({ priority })}
                    className={cn(
                      "group flex flex-col items-center gap-2.5 rounded-[22px] border px-2 pb-3.5 pt-4 text-center transition-all",
                      active
                        ? "border-transparent bg-white shadow-[0_18px_40px_-22px_rgba(15,23,42,0.45)] ring-2 ring-zinc-900/80"
                        : "border-zinc-200/70 bg-zinc-50/60 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_30px_-24px_rgba(15,23,42,0.45)]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl transition-transform",
                        active ? cn(TONES[look.tone].gradient, "scale-105") : cn(TONES[look.tone].soft, "group-hover:scale-105"),
                      )}
                      aria-hidden
                    >
                      <Icon className="h-6 w-6" strokeWidth={2.1} />
                    </span>
                    <span className="text-[13px] font-semibold text-zinc-900">{tt(`priorities.${priority}`)}</span>
                    <span className="text-[11px] font-medium leading-snug text-zinc-500">{tt(`priorityHints.${priority}`)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2.5 text-[13px] font-semibold text-zinc-700">{t("fields.kind")}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={t("fields.kind")}>
              {TASK_KINDS.map((kind) => {
                const look = TASK_KIND_LOOK[kind];
                const Icon = look.icon;
                const active = draft.kind === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-testid={`create-task-kind-${kind}`}
                    onClick={() => update({ kind })}
                    className={cn(
                      "flex h-14 items-center gap-2.5 rounded-[18px] border px-2.5 text-start transition-all",
                      active
                        ? "border-transparent bg-white shadow-[0_14px_30px_-20px_rgba(15,23,42,0.45)] ring-2 ring-zinc-900/80"
                        : "border-zinc-200/70 bg-zinc-50/60 hover:bg-white",
                    )}
                  >
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", TONES[look.tone].soft)} aria-hidden>
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
                    </span>
                    <span className="truncate text-[13px] font-semibold text-zinc-900">{tt(`kinds.${kind}`)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <section className={cn("space-y-3 rounded-[22px] bg-gradient-to-br p-4 ring-1 ring-zinc-200/60", TONES.sky.tint)}>
            <p className="text-[13px] font-semibold text-zinc-700">{t("fields.due")}</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("fields.due")}>
              {DUE_PRESETS.map((preset) => {
                const active = draft.duePreset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-testid={`create-task-due-${preset}`}
                    onClick={() => update({ duePreset: preset })}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold transition-colors",
                      active ? "bg-zinc-950 text-white shadow-[0_8px_18px_-10px_rgba(15,23,42,0.8)]" : "bg-white text-zinc-600 ring-1 ring-zinc-200/80 hover:text-zinc-950",
                    )}
                  >
                    {preset === "none" ? <CalendarOff className="h-3.5 w-3.5" aria-hidden /> : null}
                    {t(`presets.${preset}`)}
                  </button>
                );
              })}
            </div>
            {draft.duePreset === "custom" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="task-due-date">{t("fields.date")}</Label>
                  <Input
                    id="task-due-date"
                    type="date"
                    value={draft.dueDate}
                    onChange={(e) => update({ dueDate: e.target.value })}
                    className="bg-white"
                    data-testid="create-task-due-date"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="task-due-time">{t("fields.time")}</Label>
                  <Input
                    id="task-due-time"
                    type="time"
                    value={draft.dueTime}
                    onChange={(e) => update({ dueTime: e.target.value })}
                    className="bg-white"
                    data-testid="create-task-due-time"
                  />
                </div>
              </div>
            ) : null}
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-500" data-testid="create-task-due-summary">
              <CalendarClock className={cn("h-3.5 w-3.5", TONES.sky.text)} aria-hidden />
              {errors.due ? (
                <span className="text-rose-600">{t(`errors.due.${errors.due}`)}</span>
              ) : due === "invalid" ? (
                <span className="text-rose-600">{t("errors.due.invalid")}</span>
              ) : dueSummary ? (
                dueSummary
              ) : (
                t("noDue")
              )}
            </p>
          </section>

          <div className="space-y-1.5">
            <Label htmlFor="task-assignee">{t("fields.assignee")}</Label>
            {canAssignOthers ? (
              <Select
                value={draft.assigneeId}
                onValueChange={(id) => update({ assigneeId: id, assigneeName: owners.find((o) => o.id === id)?.name ?? "" })}
              >
                <SelectTrigger id="task-assignee" className="h-12" data-testid="create-task-assignee">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.id === self.id ? t("me", { name: o.name }) : o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div id="task-assignee" className="flex h-12 items-center gap-3 rounded-2xl bg-zinc-50 px-3 ring-1 ring-zinc-200/70">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-zinc-600 ring-1 ring-zinc-200/70">
                  {initials(self.name)}
                </span>
                <span className="truncate text-[13px] font-medium text-zinc-700">{t("me", { name: self.name })}</span>
              </div>
            )}
            {errors.assignee ? <FieldError>{t("errors.assignee")}</FieldError> : null}
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={submitting} data-testid="create-task-submit">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {submitting ? t("saving") : t("submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ children }: { children: ReactNode }) {
  return <p className="text-[12px] font-medium text-rose-600">{children}</p>;
}
