"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Inbox } from "lucide-react";
import { TASK_STATUS_LOOK, isTaskOverdue, type Task, type TaskRepository, type TaskStatus } from "@/entities/task";
import { cn } from "@/shared/lib/cn";
import { TONES } from "@/shared/ui";
import { TaskCard } from "./task-card";

/** How this column relates to the task being dragged. */
export type DropState = "idle" | "allowed" | "blocked";

type Props = {
  status: TaskStatus;
  tasks: Task[];
  locale: string;
  repository: TaskRepository;
  canWrite: boolean;
  showAssignee: boolean;
  dropState: DropState;
  draggingId: string | null;
  onChanged: (task: Task) => void;
  onOpenTask: (task: Task) => void;
  onDropTask: (taskId: string, status: TaskStatus) => void;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
};

/** One status lane: a fixed-height column whose cards scroll inside it. */
export function TaskColumn({
  status,
  tasks,
  locale,
  repository,
  canWrite,
  showAssignee,
  dropState,
  draggingId,
  onChanged,
  onOpenTask,
  onDropTask,
  onDragStart,
  onDragEnd,
}: Props) {
  const t = useTranslations("tasks");
  const look = TASK_STATUS_LOOK[status];
  const Icon = look.icon;
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const overdue = tasks.reduce((n, task) => n + (isTaskOverdue(task) ? 1 : 0), 0);

  const resetOver = () => {
    depth.current = 0;
    setOver(false);
  };

  return (
    <section
      aria-label={t(`statuses.${status}`)}
      data-testid={`task-column-${status}`}
      data-drop={dropState}
      onDragEnter={(e) => {
        if (dropState !== "allowed") return;
        e.preventDefault();
        depth.current += 1;
        setOver(true);
      }}
      onDragOver={(e) => {
        if (dropState !== "allowed") return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDragLeave={() => {
        if (dropState !== "allowed") return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        resetOver();
        const taskId = e.dataTransfer.getData("text/task-id");
        if (taskId && dropState === "allowed") onDropTask(taskId, status);
      }}
      className={cn(
        "flex h-[calc(100dvh-22rem)] min-h-[30rem] min-w-[18.5rem] flex-1 basis-0 flex-col rounded-[28px] border bg-gradient-to-b transition-all duration-200 min-[1440px]:h-[calc(100dvh-17.5rem)] min-[1440px]:min-h-[32rem]",
        TONES[look.tone].tint,
        "border-zinc-200/60 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.4)]",
        dropState === "blocked" && "opacity-45 saturate-50",
        dropState === "allowed" && "border-dashed border-zinc-300",
        over && "border-solid border-zinc-900/70 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] ring-4 ring-zinc-900/5",
      )}
    >
      <header className="flex items-center gap-3 px-4 pb-3 pt-4">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", TONES[look.tone].gradient)}>
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold tracking-tight text-zinc-950">{t(`statuses.${status}`)}</h2>
          <p className={cn("truncate text-[11.5px] font-medium", overdue ? "text-rose-600" : "text-zinc-500")} data-testid="task-column-sub">
            {overdue ? t("column.overdue", { count: overdue }) : t(`column.hints.${status}`)}
          </p>
        </div>
        <span
          className={cn("rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums", TONES[look.tone].soft)}
          data-testid="task-column-count"
        >
          {tasks.length.toLocaleString(locale)}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-y-contain px-3 pb-3 [scrollbar-gutter:stable] [scrollbar-width:thin]">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            locale={locale}
            repository={repository}
            canWrite={canWrite}
            showAssignee={showAssignee}
            dragging={draggingId === task.id}
            onChanged={onChanged}
            onOpen={onOpenTask}
            onDragStart={onDragStart}
            onDragEnd={() => {
              resetOver();
              onDragEnd();
            }}
          />
        ))}
        {tasks.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed px-4 py-8 text-center transition-colors",
              over ? "border-zinc-900/40 bg-white/80" : "border-zinc-200/80",
            )}
          >
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", TONES[look.tone].soft)}>
              <Inbox className="h-5 w-5" strokeWidth={2} />
            </span>
            <p className="text-[12px] font-medium text-zinc-400">{t("emptyColumn")}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
