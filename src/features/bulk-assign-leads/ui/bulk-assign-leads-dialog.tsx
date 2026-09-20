"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Lead, LeadOwner, LeadRepository } from "@/entities/lead";
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
  selectedIds: string[];
  repository: LeadRepository;
  onAssigned: (leads: Lead[]) => void;
};

export function BulkAssignLeadsDialog({
  selectedIds,
  repository,
  onAssigned,
}: Props) {
  const t = useTranslations("pipeline");
  const tc = useTranslations("common");
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [owners, setOwners] = useState<LeadOwner[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void repository.listOwners().then((list) => {
      setOwners(list);
      if (list[0]) setOwnerId(list[0].id);
    });
  }, [open, repository]);

  if (selectedIds.length === 0) return null;

  async function save() {
    const owner = owners.find((o) => o.id === ownerId);
    if (!owner) return;
    setBusy(true);
    try {
      const updated = await repository.bulkAssign(
        selectedIds,
        owner.id,
        owner.name,
      );
      onAssigned(updated);
      push({
        title: t("bulkAssignedTitle"),
        description: t("bulkAssignedBody", { count: updated.length }),
        tone: "success",
      });
      setOpen(false);
    } catch {
      push({ title: t("assignError"), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          {t("bulkAssign", { count: selectedIds.length })}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("bulkAssignTitle")}</DialogTitle>
          <DialogDescription>
            {t("bulkAssignHint", { count: selectedIds.length })}
          </DialogDescription>
        </DialogHeader>
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
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {tc("cancel")}
          </Button>
          <Button type="button" disabled={busy} onClick={() => void save()}>
            {tc("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
