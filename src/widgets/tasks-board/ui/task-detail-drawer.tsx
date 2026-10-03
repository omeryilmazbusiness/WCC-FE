"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  AlignLeft,
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  CircleCheckBig,
  CircleSlash,
  IdCard,
  Link2,
  RefreshCw,
  Siren,
  type LucideIcon,
} from "lucide-react";
import {
  TASK_KIND_LOOK,
  TASK_PRIORITY_LOOK,
  TASK_STATUS_LOOK,
  hasRelatedRecord,
  isTaskClosed,
  isTaskOverdue,
  type Task,
  type TaskRepository,
} from "@/entities/task";
import { useCan } from "@/entities/viewer";
import { CancelTaskDialog } from "@/features/cancel-task";
import { CompleteTaskButton } from "@/features/complete-task";
import { Link } from "@/shared/i18n/navigation";
import { initials } from "@/shared/lib/avatar";
import { cn } from "@/shared/lib/cn";
import { formatDate, formatDateTime, formatRelativeTime } from "@/shared/lib/format";
import { hrefForRelated } from "@/shared/lib/related-href";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  IconTile,
  TONES,
  type Tone,
} from "@/shared/ui";
import { useRelatedText } from "../model/use-related-text";

const DUE_FORMAT: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };

type Props = {
  task: Task | null;
  locale: string;
  repository: TaskRepository;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: (task: Task) => void;
};

/** Side panel with everything about one task; actions stay available while it is open. */
export function TaskDetailDrawer({ task, locale, repository, open, onOpenChange, onChanged }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-[30rem] bg-zinc-50" data-testid="task-detail">
        {task ? <TaskDetail task={task} locale={locale} repository={repository} onChanged={onChanged} /> : null}
      </DrawerContent>
    </Drawer>
  );
}

type DetailProps = {
  task: Task;
  locale: string;
  repository: TaskRepository;
  onChanged: (task: Task) => void;
};

function TaskDetail({ task, locale, repository, onChanged }: DetailProps) {
  const t = useTranslations("tasks");
  const relatedText = useRelatedText();
  const canWrite = useCan("tasks.write");
  const kind = TASK_KIND_LOOK[task.kind] ?? TASK_KIND_LOOK.custom;
  const status = TASK_STATUS_LOOK[task.status];
  const priority = TASK_PRIORITY_LOOK[task.priority];
  const KindIcon = kind.icon;
  const StatusIcon = status.icon;
  const PriorityIcon = priority.icon;
  const closed = isTaskClosed(task);
  const overdue = isTaskOverdue(task);
  const linked = hasRelatedRecord(task);
  const headerTone: Tone = closed ? "zinc" : kind.tone;

  return (
    <>
      <DrawerHeader className={cn("border-b border-zinc-200/60 bg-gradient-to-b px-6 pb-5 pe-6 pt-6", TONES[headerTone].tint)}>
        <div className="flex items-start gap-4 pe-8">
          <span
            className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]", TONES[headerTone].gradient)}
            aria-hidden
          >
            <KindIcon className="h-6 w-6" strokeWidth={2.1} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-zinc-500">{t(`kinds.${task.kind}`)}</p>
            <DrawerTitle
              dir="auto"
              className={cn(
                "mt-0.5 line-clamp-3 break-words text-start text-[19px] leading-snug tracking-tight",
                closed && "text-zinc-500 line-through decoration-zinc-300",
              )}
              data-testid="task-detail-title"
            >
              {task.title}
            </DrawerTitle>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Badge icon={StatusIcon} className={TONES[status.tone].soft} testId="task-detail-status">
                {t(`statuses.${task.status}`)}
              </Badge>
              <Badge
                icon={PriorityIcon}
                className={closed ? TONES.zinc.soft : task.priority === "critical" ? TONES.rose.solid : TONES[priority.tone].soft}
                testId="task-detail-priority"
              >
                {t(`priorities.${task.priority}`)}
              </Badge>
              {overdue ? (
                <Badge icon={CalendarClock} className={TONES.rose.soft}>
                  {t("overdue")}
                </Badge>
              ) : null}
              {task.escalatedAt && !closed ? (
                <Badge icon={Siren} className={TONES.violet.soft}>
                  {t("escalated")}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        <DrawerDescription className="sr-only">
          {[t(`statuses.${task.status}`), t(`priorities.${task.priority}`)].join(" · ")}
        </DrawerDescription>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <HeaderTile
            leading={<IconTile icon={CalendarClock} tone={overdue ? "rose" : closed ? "zinc" : "sky"} />}
            label={t("fields.dueAt")}
            value={task.dueAt ? formatDate(task.dueAt, locale, DUE_FORMAT) : t("card.noDue")}
            hint={task.dueAt && !closed ? formatRelativeTime(task.dueAt, locale) : undefined}
            danger={overdue}
            muted={!task.dueAt}
            testId="task-detail-due"
          />
          <HeaderTile
            leading={
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-[11px] font-bold text-zinc-600"
                aria-hidden
              >
                {initials(task.assigneeName || "?")}
              </span>
            }
            label={t("fields.assignee")}
            value={task.assigneeName || "—"}
            testId="task-detail-assignee"
          />
        </div>
      </DrawerHeader>

      <DrawerBody className="space-y-3.5 px-5 py-5">
        <Section icon={AlignLeft} tone="indigo" title={t("detail.description")} testId="task-detail-description">
          {task.description ? (
            <p dir="auto" className="whitespace-pre-wrap break-words text-start text-[13.5px] leading-relaxed text-zinc-700">
              {task.description}
            </p>
          ) : (
            <p className="rounded-2xl border border-dashed border-zinc-200 px-4 py-4 text-center text-[13px] font-medium text-zinc-400">
              {t("detail.noDescription")}
            </p>
          )}
        </Section>

        {closed && task.outcome ? (
          <Section
            icon={task.status === "done" ? CircleCheckBig : CircleSlash}
            tone={task.status === "done" ? "emerald" : "zinc"}
            title={task.status === "done" ? t("detail.outcomeDone") : t("detail.outcomeCancelled")}
            testId="task-detail-outcome"
          >
            <p dir="auto" className="whitespace-pre-wrap break-words text-start text-[13.5px] leading-relaxed text-zinc-700">
              {task.outcome}
            </p>
          </Section>
        ) : null}

        <Section icon={IdCard} tone="violet" title={t("detail.details")} testId="task-detail-details">
          <div className="divide-y divide-zinc-100">
            {linked ? (
              <Row
                leading={<IconTile icon={Link2} tone="indigo" size="lg" />}
                label={
                  t.has(`related.${task.relatedType}`)
                    ? t(`related.${task.relatedType}` as "related.lead")
                    : t("detail.related")
                }
                value={relatedText(task)}
                action={
                  <Link
                    href={hrefForRelated(task)}
                    className={rowActionClass}
                    data-testid="task-detail-related"
                  >
                    {t("detail.open")}
                    <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
                  </Link>
                }
              />
            ) : (
              <Row
                leading={<IconTile icon={Link2} tone="zinc" size="lg" />}
                label={t("detail.related")}
                value={t("detail.standalone")}
                muted
              />
            )}
            <Row
              leading={<IconTile icon={CalendarPlus} tone="zinc" size="lg" />}
              label={t("detail.created")}
              value={formatDateTime(task.createdAt, locale)}
              hint={formatRelativeTime(task.createdAt, locale)}
            />
            {task.status === "done" && task.completedAt ? (
              <Row
                leading={<IconTile icon={CircleCheckBig} tone="emerald" size="lg" />}
                label={t("detail.completed")}
                value={formatDateTime(task.completedAt, locale)}
                hint={formatRelativeTime(task.completedAt, locale)}
              />
            ) : (
              <Row
                leading={<IconTile icon={RefreshCw} tone="zinc" size="lg" />}
                label={t("detail.updated")}
                value={formatDateTime(task.updatedAt, locale)}
                hint={formatRelativeTime(task.updatedAt, locale)}
              />
            )}
          </div>
        </Section>
      </DrawerBody>

      {canWrite && !closed ? (
        <DrawerFooter className="justify-end gap-2 border-zinc-200/60 bg-white px-5 py-3.5" data-testid="task-detail-actions">
          <CancelTaskDialog task={task} repository={repository} onChanged={onChanged} />
          <CompleteTaskButton task={task} repository={repository} onChanged={onChanged} />
        </DrawerFooter>
      ) : null}
    </>
  );
}

function Badge({
  icon: Icon,
  className,
  testId,
  children,
}: {
  icon: LucideIcon;
  className: string;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold", className)}
      data-testid={testId}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
      {children}
    </span>
  );
}

function HeaderTile({
  leading,
  label,
  value,
  hint,
  danger,
  muted,
  testId,
}: {
  leading: ReactNode;
  label: string;
  value: string;
  hint?: string;
  danger?: boolean;
  muted?: boolean;
  testId?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-2xl bg-white/90 p-2.5 ring-1 ring-inset",
        danger ? "ring-rose-200" : "ring-zinc-200/70",
      )}
      data-testid={testId}
    >
      {leading}
      <span className="min-w-0">
        <span className="block text-[10.5px] font-medium text-zinc-400">{label}</span>
        <span
          dir="auto"
          className={cn(
            "block truncate text-start text-[13px] font-semibold tabular-nums",
            danger ? "text-rose-600" : muted ? "text-zinc-400" : "text-zinc-900",
          )}
        >
          {value}
        </span>
        {hint ? (
          <span className={cn("block truncate text-[11px]", danger ? "text-rose-500" : "text-zinc-400")}>{hint}</span>
        ) : null}
      </span>
    </div>
  );
}

function Section({
  icon,
  tone,
  title,
  testId,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-[24px] border border-zinc-200/60 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      data-testid={testId}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <IconTile icon={icon} tone={tone} />
        <h3 className="flex-1 text-[14px] font-semibold tracking-tight text-zinc-950">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Row({
  leading,
  label,
  value,
  hint,
  muted,
  action,
}: {
  leading: ReactNode;
  label: string;
  value: string;
  hint?: string;
  muted?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-zinc-400">{label}</p>
        <p dir="auto" className={cn("truncate text-start text-[13.5px] font-semibold", muted ? "text-zinc-400" : "text-zinc-900")}>
          {value}
        </p>
        {hint ? <p className="truncate text-[11.5px] text-zinc-400">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

const rowActionClass =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl bg-zinc-50 px-2.5 text-[12px] font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-200/70 transition hover:bg-zinc-100 hover:text-zinc-900";
