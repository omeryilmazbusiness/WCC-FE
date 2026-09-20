"use client";

import { useTranslations } from "next-intl";
import {
  canTransitionTask,
  isTaskOverdue,
  type Task,
  type TaskRepository,
  type TaskStatus,
} from "@/entities/task";
import { hrefForRelated } from "@/shared/lib/related-href";
import { Link } from "@/shared/i18n/navigation";
import { StageBadge, TASK_STATUS_TONES } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { TaskActions } from "./task-actions";

type Props = {
  status: TaskStatus;
  tasks: Task[];
  repository: TaskRepository;
  onChanged: (task: Task) => void;
  onDropTask: (taskId: string, status: TaskStatus) => void;
};

export function TaskColumn({
  status,
  tasks,
  repository,
  onChanged,
  onDropTask,
}: Props) {
  const t = useTranslations("tasks");

  return (
    <section
      className="flex min-h-[28rem] w-[17.5rem] shrink-0 flex-col rounded-[24px] border border-zinc-200/80 bg-zinc-50/80"
      data-testid={`task-column-${status}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData("text/task-id");
        if (taskId) onDropTask(taskId, status);
      }}
    >
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <StageBadge
          tone={TASK_STATUS_TONES[status]}
          label={t(`statuses.${status}`)}
        />
        <span className="rounded-xl bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-zinc-500 shadow-sm">
          {tasks.length}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-3 pb-3">
        {tasks.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs font-medium text-zinc-400">
            {t("emptyColumn")}
          </p>
        ) : null}
        {tasks.map((task) => {
          const overdue = isTaskOverdue(task);
          const href = hrefForRelated({
            relatedType: task.relatedType,
            relatedId: task.relatedId,
            customerId: task.customerId,
          });
          return (
            <article
              key={task.id}
              draggable={
                canTransitionTask(task.status, status) || task.status === status
              }
              onDragStart={(e) => {
                e.dataTransfer.setData("text/task-id", task.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              className={cn(
                "rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-[0_8px_24px_-18px_rgba(24,24,27,0.45)] transition-all duration-300",
                "cursor-grab active:cursor-grabbing hover:-translate-y-0.5",
                overdue && "border-amber-200/90",
              )}
            >
              <p className="text-sm font-semibold text-zinc-950">{task.title}</p>
              <p className="mt-1 text-xs font-medium text-zinc-500">
                {t(`kinds.${task.kind}`)}
              </p>
              <Link
                href={href}
                className="mt-2 inline-block text-xs font-medium text-sky-700 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {task.relatedLabel}
              </Link>
              <div className="mt-3">
                <TaskActions
                  task={task}
                  repository={repository}
                  onChanged={onChanged}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
