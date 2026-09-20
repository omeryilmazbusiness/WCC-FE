"use client";

import { useTranslations } from "next-intl";
import {
  isTaskOverdue,
  type Task,
  type TaskRepository,
} from "@/entities/task";
import { hrefForRelated } from "@/shared/lib/related-href";
import { Link } from "@/shared/i18n/navigation";
import { EmptyState, StageBadge, TASK_STATUS_TONES } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { TaskActions } from "./task-actions";

type Props = {
  tasks: Task[];
  repository: TaskRepository;
  onChanged: (task: Task) => void;
  emptyTitle: string;
  emptyHint?: string;
};

export function TaskQueueList({
  tasks,
  repository,
  onChanged,
  emptyTitle,
  emptyHint,
}: Props) {
  const t = useTranslations("tasks");

  if (tasks.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyHint} />;
  }

  return (
    <ul className="flex flex-col gap-2.5" data-testid="task-queue">
      {tasks.map((task) => {
        const overdue = isTaskOverdue(task);
        const href = hrefForRelated({
          relatedType: task.relatedType,
          relatedId: task.relatedId,
          customerId: task.customerId,
        });
        return (
          <li
            key={task.id}
            data-testid={`task-row-${task.id}`}
            className={cn(
              "rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-[0_8px_24px_-18px_rgba(24,24,27,0.45)]",
              overdue && "border-amber-200/90",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StageBadge
                    tone={TASK_STATUS_TONES[task.status]}
                    label={t(`statuses.${task.status}`)}
                  />
                  <StageBadge
                    tone="zinc"
                    label={t(`kinds.${task.kind}`)}
                  />
                  {overdue ? (
                    <StageBadge tone="amber" label={t("overdue")} />
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-950">
                  {task.title}
                </p>
                <Link
                  href={href}
                  className="mt-1 inline-block text-xs font-medium text-sky-700 hover:underline"
                  data-testid={`task-related-${task.id}`}
                >
                  {task.relatedLabel}
                </Link>
                {task.dueAt ? (
                  <p className="mt-1 text-[11px] font-medium tabular-nums text-zinc-400">
                    {t("due")}: {new Date(task.dueAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
              <TaskActions
                task={task}
                repository={repository}
                onChanged={onChanged}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
