"use client";

import type { Task, TaskRepository } from "@/entities/task";
import { CompleteTaskButton } from "@/features/complete-task";
import { RescheduleTaskDialog } from "@/features/reschedule-task";

type Props = {
  task: Task;
  repository: TaskRepository;
  onChanged: (task: Task) => void;
};

/** Shared action cluster — queue, table, and kanban reuse this. */
export function TaskActions({ task, repository, onChanged }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CompleteTaskButton
        task={task}
        repository={repository}
        onChanged={onChanged}
        compact
      />
      <RescheduleTaskDialog
        task={task}
        repository={repository}
        onChanged={onChanged}
        compact
      />
    </div>
  );
}
