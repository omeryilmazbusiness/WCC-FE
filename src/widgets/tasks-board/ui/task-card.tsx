"use client";

import { useTranslations } from "next-intl";
import { CalendarClock, CircleCheckBig, Link2, Siren, type LucideIcon } from "lucide-react";
import {
  TASK_KIND_LOOK,
  TASK_PRIORITY_LOOK,
  hasRelatedRecord,
  isTaskClosed,
  isTaskOverdue,
  type Task,
  type TaskPriority,
  type TaskRepository,
} from "@/entities/task";
import { CompleteTaskButton } from "@/features/complete-task";
import { CancelTaskDialog } from "@/features/cancel-task";
import { Link } from "@/shared/i18n/navigation";
import { initials } from "@/shared/lib/avatar";
import { cn } from "@/shared/lib/cn";
import { formatDate, formatRelativeTime } from "@/shared/lib/format";
import { hrefForRelated } from "@/shared/lib/related-href";
import { PackageLinkChip } from "@/features/package-link";
import { TONES, type Tone } from "@/shared/ui";
import { useRelatedText } from "../model/use-related-text";

type Props = {
  task: Task;
  locale: string;
  repository: TaskRepository;
  canWrite: boolean;
  /** Shows who owns the task; redundant on a personal board. */
  showAssignee: boolean;
  dragging: boolean;
  onChanged: (task: Task) => void;
  onOpen: (task: Task) => void;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
};

const ACTION =
  "inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10 disabled:opacity-50";

const DUE_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };

/** A task on the board: what, how important, when it is due and who owns it. */
export function TaskCard({ task, locale, repository, canWrite, showAssignee, dragging, onChanged, onOpen, onDragStart, onDragEnd }: Props) {
  const t = useTranslations("tasks");
  const relatedText = useRelatedText();
  const kind = TASK_KIND_LOOK[task.kind] ?? TASK_KIND_LOOK.custom;
  const KindIcon = kind.icon;
  const closed = isTaskClosed(task);
  const overdue = isTaskOverdue(task);
  const linked = hasRelatedRecord(task);
  const assignee = task.assigneeName || "—";
  const footerTime = closed ? (task.completedAt ?? task.updatedAt) : task.dueAt;
  const actionable = canWrite && !closed;

  return (
    <article
      draggable={actionable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/task-id", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(task);
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        // Dialogs opened from the card portal out of it but still bubble through React.
        if (!e.currentTarget.contains(target) || target.closest("a,button,input,textarea")) return;
        onOpen(task);
      }}
      data-testid="task-card"
      data-task={task.id}
      data-priority={task.priority}
      className={cn(
        "group relative cursor-pointer rounded-[20px] bg-white p-3.5 shadow-[0_0_0_1px_rgba(15,23,42,0.05),0_1px_2px_rgba(15,23,42,0.03)] transition-[box-shadow,transform] duration-200",
        actionable && "active:cursor-grabbing",
        "hover:-translate-y-px hover:shadow-[0_0_0_1px_rgba(15,23,42,0.07),0_14px_30px_-18px_rgba(15,23,42,0.35)]",
        overdue && "shadow-[0_0_0_1px_rgba(244,63,94,0.28),0_1px_2px_rgba(15,23,42,0.03)]",
        dragging && "rotate-1 opacity-50",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", closed ? TONES.zinc.soft : TONES[kind.tone].soft)}
          aria-hidden
        >
          <KindIcon className="h-[18px] w-[18px]" strokeWidth={2.1} />
        </span>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            dir="auto"
            title={task.title}
            onClick={() => onOpen(task)}
            className={cn(
              "line-clamp-2 w-full rounded-md text-start text-[14px] font-semibold leading-5 tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15",
              closed ? "text-zinc-400 line-through decoration-zinc-300" : "text-zinc-900",
            )}
            data-testid="task-card-open"
          >
            {task.title}
          </button>
          {task.description ? (
            <p dir="auto" className="mt-0.5 line-clamp-2 text-start text-[12px] leading-[1.125rem] text-zinc-500" data-testid="task-card-description">
              {task.description}
            </p>
          ) : (
            <p className="mt-0.5 truncate text-[12px] text-zinc-400">{t(`kinds.${task.kind}`)}</p>
          )}
        </div>
        <PriorityPill priority={task.priority} label={t(`priorities.${task.priority}`)} muted={closed} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" data-testid="task-card-chips">
        {!closed ? (
          task.dueAt ? (
            <Chip
              icon={CalendarClock}
              tone={overdue ? "rose" : "sky"}
              label={overdue ? t("overdue") : t("due")}
              value={formatDate(task.dueAt, locale, DUE_FORMAT)}
              filled={overdue}
              testId="task-card-due"
            />
          ) : (
            <Chip icon={CalendarClock} tone="zinc" label={t("card.noDue")} value={t("card.noDue")} testId="task-card-due" />
          )
        ) : task.status === "done" ? (
          <Chip icon={CircleCheckBig} tone="emerald" label={t("statuses.done")} value={t("statuses.done")} filled />
        ) : null}
        {task.escalatedAt && !closed ? (
          <Chip icon={Siren} tone="violet" label={t("escalated")} value={t("escalated")} filled />
        ) : null}
        {linked ? (
          <Link
            href={hrefForRelated(task)}
            title={relatedText(task)}
            className="inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-full bg-zinc-50 ps-1 pe-2.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
            data-testid="task-card-related"
          >
            <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full", TONES.indigo.soft)}>
              <Link2 className="h-3 w-3" strokeWidth={2.2} aria-hidden />
            </span>
            <span dir="auto" className="truncate">
              {relatedText(task)}
            </span>
          </Link>
        ) : null}
        {task.pkg ? (
          <PackageLinkChip
            packageId={task.pkg.packageId}
            code={task.pkg.packageCode}
            name={task.pkg.packageName}
            departureCode={task.pkg.departureCode}
            compact
            className="h-7"
          />
        ) : null}
      </div>

      <div className="mt-3 flex h-7 items-center gap-2" data-testid="task-card-meta">
        {showAssignee ? (
          <span className="flex min-w-0 items-center gap-1.5" title={`${t("fields.assignee")}: ${assignee}`}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[9.5px] font-semibold text-zinc-600" aria-hidden>
              {initials(task.assigneeName || "?")}
            </span>
            <span className="truncate text-[11.5px] font-medium text-zinc-500">{assignee}</span>
          </span>
        ) : null}

        <div className="relative ms-auto flex h-7 shrink-0 items-center">
          {footerTime ? (
            <time
              dateTime={footerTime}
              className={cn(
                "text-[11.5px] transition-opacity duration-150",
                overdue ? "font-semibold text-rose-600" : "text-zinc-400",
                actionable && "[@media(hover:hover)]:group-focus-within:opacity-0 [@media(hover:hover)]:group-hover:opacity-0",
              )}
            >
              {formatRelativeTime(footerTime, locale)}
            </time>
          ) : null}
          {actionable ? (
            <div
              className={cn(
                "absolute inset-y-0 end-0 flex items-center gap-0.5 rounded-full bg-white transition-opacity duration-150",
                "[@media(hover:hover)]:pointer-events-none [@media(hover:hover)]:opacity-0",
                "[@media(hover:hover)]:group-focus-within:pointer-events-auto [@media(hover:hover)]:group-focus-within:opacity-100",
                "[@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:opacity-100",
              )}
            >
              <CancelTaskDialog task={task} repository={repository} onChanged={onChanged} iconOnly className={ACTION} />
              <CompleteTaskButton
                task={task}
                repository={repository}
                onChanged={onChanged}
                iconOnly
                className={cn(ACTION, "bg-zinc-900 text-white hover:bg-zinc-700 hover:text-white")}
              />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function PriorityPill({ priority, label, muted }: { priority: TaskPriority; label: string; muted?: boolean }) {
  const look = TASK_PRIORITY_LOOK[priority];
  const Icon = look.icon;
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full ps-1.5 pe-2 text-[11px] font-semibold",
        muted ? TONES.zinc.soft : priority === "critical" ? TONES.rose.solid : TONES[look.tone].soft,
      )}
      data-testid="task-card-priority"
    >
      <Icon className="h-3 w-3" strokeWidth={2.4} aria-hidden />
      {label}
    </span>
  );
}

function Chip({
  icon: Icon,
  tone,
  label,
  value,
  filled,
  testId,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  filled?: boolean;
  testId?: string;
}) {
  return (
    <span
      title={label === value ? label : `${label}: ${value}`}
      data-testid={testId}
      className={cn(
        "inline-flex h-7 min-w-0 items-center gap-1.5 rounded-full ps-1 pe-2.5 text-[12px] font-medium",
        filled ? TONES[tone].soft : "bg-zinc-50 text-zinc-700",
      )}
    >
      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full", filled ? "bg-white/70" : TONES[tone].soft)}>
        <Icon className="h-3 w-3" strokeWidth={2.2} aria-hidden />
      </span>
      {label === value ? null : <span className="sr-only">{label}: </span>}
      <span dir="auto" className="truncate tabular-nums">
        {value}
      </span>
    </span>
  );
}
