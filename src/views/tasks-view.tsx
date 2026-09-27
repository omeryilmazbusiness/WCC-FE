"use client";

import { useTranslations } from "next-intl";
import { createTaskRepository } from "@/entities/task";
import { useCan, useViewer } from "@/entities/viewer";
import { useApiQuery } from "@/shared/lib/use-api-query";
import { EmptyState, QueryState, Screen } from "@/shared/ui";
import { TasksBoard } from "@/widgets/tasks-board";

const repo = createTaskRepository();

export function TasksView() {
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const { user, scope } = useViewer();
  const canWrite = useCan("tasks.write");
  const managerMode = scope !== "own" && canWrite;

  const query = useApiQuery(
    () => (managerMode ? repo.list() : repo.listMine(user.id)),
    [user.id, managerMode],
  );
  const tasks = query.data;

  if (!tasks) {
    return (
      <Screen>
        <QueryState
          loading={query.loading}
          loadingLabel={tc("loading")}
          error={query.error}
          onRetry={() => void query.reload()}
        >
          {null}
        </QueryState>
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
      assigneeId={managerMode ? undefined : user.id}
      managerMode={managerMode}
    />
  );
}
