"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Task, TaskRepository } from "@/entities/task";
import { createLeadRepository } from "@/entities/lead";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@/shared/ui";

type Props = {
  repository: TaskRepository;
  taskIds: string[];
  onAssigned: (tasks: Task[]) => void;
};

export function BulkAssignTasksDialog({
  repository,
  taskIds,
  onAssigned,
}: Props) {
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [ownerId, setOwnerId] = useState("");
  const [busy, setBusy] = useState(false);
  const leadRepo = useMemo(() => createLeadRepository(), []);
  const [owners, setOwners] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    void leadRepo.listOwners().then((rows) => {
      setOwners(rows.map((o) => ({ id: o.id, name: o.name })));
      if (rows[0]) setOwnerId(rows[0].id);
    });
  }, [open, leadRepo]);

  async function submit() {
    if (!ownerId || taskIds.length === 0) return;
    setBusy(true);
    try {
      const owner = owners.find((o) => o.id === ownerId);
      const updated = await repository.bulkAssign(
        taskIds,
        ownerId,
        owner?.name,
      );
      onAssigned(updated);
      push({ title: t("bulkAssignedTitle"), tone: "success" });
      setOpen(false);
    } catch (e) {
      push({
        title: t("actionError"),
        description: e instanceof Error ? e.message : undefined,
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" disabled={taskIds.length === 0}>
          {t("bulkAssign", { count: taskIds.length })}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("bulkAssignTitle")}</DialogTitle>
          <DialogDescription>
            {t("bulkAssignHint", { count: taskIds.length })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {owners.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button type="button" disabled={busy} onClick={() => void submit()}>
              {t("assign")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
