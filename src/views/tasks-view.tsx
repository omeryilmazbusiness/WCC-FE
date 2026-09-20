"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getMemoryTaskRepository, type Task } from "@/entities/task";
import { useSessionUser } from "@/shared/api/session-context";
import { EmptyState, Screen } from "@/shared/ui";
import { isManagerRole } from "@/entities/user";
import { TasksBoard } from "@/widgets/tasks-board";

export function TasksView() {
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const user = useSessionUser();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const repo = getMemoryTaskRepository();

  useEffect(() => {
    void (isManagerRole(user.role) ? repo.list() : repo.listMine(user.id)).then(
      setTasks,
    );
  }, [repo, user.id, user.role]);

  if (!tasks) {
    return (
      <Screen>
        <p className="text-sm font-medium text-zinc-500">{tc("loading")}</p>
      </Screen>
    );
  }

  if (tasks.length === 0) {
    return (
      <Screen>
        <EmptyState title={t("empty")} description={t("emptyHint")} />
      </Screen>
    );
  }

  return (
    <TasksBoard
      repository={repo}
      initialTasks={tasks}
      assigneeId={isManagerRole(user.role) ? undefined : user.id}
    />
  );
}
