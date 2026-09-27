"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import type { Task, TaskRepository } from "@/entities/task";
import { useCan } from "@/entities/viewer";
import { Button, useToast, useMutationFeedback } from "@/shared/ui";

type Props = {
  task: Task;
  repository: TaskRepository;
  onChanged: (task: Task) => void;
  compact?: boolean;
};

export function CompleteTaskButton({
  task,
  repository,
  onChanged,
  compact,
}: Props) {
  const allowed = useCan("tasks.write");
  const t = useTranslations("tasks");
  const { push } = useToast();
  const feedback = useMutationFeedback();
  const [busy, setBusy] = useState(false);

  if (task.status === "done" || task.status === "cancelled") return null;

  async function onClick() {
    setBusy(true);
    try {
      const updated = await repository.complete(task.id);
      onChanged(updated);
      push({ title: t("completedTitle"), tone: "success" });
    } catch (err) {
      feedback.error(err, t("actionError"));
    } finally {
      setBusy(false);
    }
  }

  if (!allowed) return null;

  return (
    <Button
      type="button"
      size={compact ? "sm" : "default"}
      variant={compact ? "secondary" : "default"}
      disabled={busy}
      onClick={() => void onClick()}
      data-testid={`complete-task-${task.id}`}
    >
      <Check className="h-4 w-4" strokeWidth={1.75} />
      {t("complete")}
    </Button>
  );
}
