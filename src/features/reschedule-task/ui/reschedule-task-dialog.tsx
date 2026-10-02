"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CalendarClock } from "lucide-react";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  useToast,
  useMutationFeedback,
} from "@/shared/ui";
import { applyFieldErrors } from "@/shared/lib/form-errors";

const schema = z.object({
  dueAt: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;
const FIELDS = schema.keyof().options;

type Props = {
  task: Task;
  repository: TaskRepository;
  onChanged: (task: Task) => void;
  compact?: boolean;
  /** Icon-only trigger for dense card footers; styled by `className`. */
  iconOnly?: boolean;
  className?: string;
};

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RescheduleTaskDialog({
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
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { dueAt: toLocalInputValue(task.dueAt) },
  });

  if (task.status === "done" || task.status === "cancelled") return null;

  async function onSubmit(values: FormValues) {
    try {
      const iso = new Date(values.dueAt).toISOString();
      const updated = await repository.reschedule(task.id, iso);
      onChanged(updated);
      push({ title: t("rescheduledTitle"), tone: "success" });
      setOpen(false);
    } catch (err) {
      if (!applyFieldErrors(form.setError, err, FIELDS)) feedback.error(err, t("actionError"));
    }
  }

  if (!allowed) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) form.reset({ dueAt: toLocalInputValue(task.dueAt) });
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        {iconOnly ? (
          <button
            type="button"
            aria-label={t("reschedule")}
            title={t("reschedule")}
            data-testid={`reschedule-task-${task.id}`}
            className={className}
          >
            <CalendarClock className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        ) : (
          <Button
            type="button"
            size={compact ? "sm" : "default"}
            variant="outline"
            data-testid={`reschedule-task-${task.id}`}
          >
            <CalendarClock className="h-4 w-4" strokeWidth={1.75} />
            {t("reschedule")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("rescheduleTitle")}</DialogTitle>
          <DialogDescription>{task.title}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="dueAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("dueAt")}</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                {tc("cancel")}
              </Button>
              <Button type="submit">{tc("save")}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
