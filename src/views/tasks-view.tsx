"use client";

import { useTranslations } from "next-intl";
import { createTaskRepository } from "@/entities/task";
import { useCan, useViewer } from "@/entities/viewer";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { QueryState, Screen } from "@/shared/ui";
import { TasksBoard } from "@/widgets/tasks-board";

const repo = createTaskRepository();

export function TasksView() {
  const tc = useTranslations("common");
  const { user, scope } = useViewer();
  const canWrite = useCan("tasks.write");
  const managerMode = scope !== "own" && canWrite;

  const query = useApiQuery(
    () => (managerMode ? repo.list() : repo.listMine(user.id)),
    [user.id, managerMode],
    { cacheKey: ["tasks", managerMode ? "all" : user.id] },
  );
  const tasks = query.data;

  if (!tasks) {
    return (
      <Screen>
        <QueryState
          loading={query.loading}
          loadingLabel={tc("loading")}
          loadingHeader
          error={query.error}
          onRetry={() => void query.reload()}
        >
          {null}
        </QueryState>
      </Screen>
    );
  }

  return (
    <TasksBoard
      repository={repo}
      initialTasks={tasks}
      assigneeId={managerMode ? undefined : user.id}
      managerMode={managerMode}
    />
  );
}
