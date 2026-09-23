"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createTaskRepository, type Task } from "@/entities/task";
import { useSessionUser } from "@/shared/api/session-context";
import { EmptyState, Screen } from "@/shared/ui";
import { isManagerRole } from "@/entities/user";
import { TasksBoard } from "@/widgets/tasks-board";

const repo = createTaskRepository();

export function TasksView() {
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const user = useSessionUser();
  const [tasks, setTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    void (async () => {
      if (isManagerRole(user.role)) {
        try {
          await repo.escalateOverdue();
        } catch {
          /* optional */
        }
        setTasks(await repo.list());
      } else {
        setTasks(await repo.listMine(user.id));
      }
    })();
  }, [user.id, user.role]);

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
      managerMode={isManagerRole(user.role)}
    />
  );
}
