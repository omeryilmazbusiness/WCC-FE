"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CalendarClock } from "lucide-react";
import type { Task, TaskRepository } from "@/entities/task";
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
} from "@/shared/ui";

const schema = z.object({
  dueAt: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  task: Task;
  repository: TaskRepository;
  onChanged: (task: Task) => void;
  compact?: boolean;
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
}: Props) {
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const { push } = useToast();
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
    } catch {
      push({ title: t("actionError"), tone: "error" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size={compact ? "sm" : "default"}
          variant="outline"
          data-testid={`reschedule-task-${task.id}`}
        >
          <CalendarClock className="h-4 w-4" strokeWidth={1.75} />
          {t("reschedule")}
        </Button>
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
