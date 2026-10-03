"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Ban } from "lucide-react";
import type { Task, TaskRepository } from "@/entities/task";
import { useCan } from "@/entities/viewer";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  Textarea,
  useToast,
  useMutationFeedback,
} from "@/shared/ui";

type Props = {
  task: Task;
  repository: TaskRepository;
  onChanged: (task: Task) => void;
  compact?: boolean;
  /** Icon-only trigger for dense card footers; styled by `className`. */
  iconOnly?: boolean;
  className?: string;
};

export function CancelTaskDialog({
  task,
  repository,
  onChanged,
  compact,
  iconOnly,
  className,
}: Props) {
  const allowed = useCan("tasks.write");
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const { push } = useToast();
  const feedback = useMutationFeedback();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (task.status === "done" || task.status === "cancelled") return null;
  if (!allowed) return null;

  async function onConfirm() {
    setBusy(true);
    try {
      const updated = await repository.cancel(task.id, reason.trim());
      onChanged(updated);
      push({ title: t("cancelledTitle"), tone: "success" });
      setOpen(false);
    } catch (err) {
      feedback.error(err, t("actionError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setReason("");
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        {iconOnly ? (
          <button
            type="button"
            aria-label={t("cancelTask")}
            title={t("cancelTask")}
            data-testid={`cancel-task-${task.id}`}
            className={className}
          >
            <Ban className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        ) : (
          <Button
            type="button"
            size={compact ? "sm" : "default"}
            variant="outline"
            data-testid={`cancel-task-${task.id}`}
          >
            <Ban className="h-4 w-4" strokeWidth={1.75} />
            {t("cancelTask")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("cancelTaskTitle")}</DialogTitle>
          <DialogDescription>{task.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`cancel-reason-${task.id}`}>{t("cancelReason")}</Label>
          <Textarea
            id={`cancel-reason-${task.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() => void onConfirm()}
            data-testid={`confirm-cancel-task-${task.id}`}
          >
            {t("cancelTask")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
