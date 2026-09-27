"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Lead, LeadOwner, LeadRepository } from "@/entities/lead";
import { useCan } from "@/entities/viewer";
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
  useMutationFeedback,
} from "@/shared/ui";

type Props = {
  lead: Lead;
  repository: LeadRepository;
  onAssigned: (lead: Lead) => void;
};

export function AssignLeadDialog({ lead, repository, onAssigned }: Props) {
  const allowed = useCan("leads.write");
  const t = useTranslations("pipeline");
  const feedback = useMutationFeedback();
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [owners, setOwners] = useState<LeadOwner[]>([]);
  const [ownerId, setOwnerId] = useState(lead.ownerId);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void repository
      .listOwners()
      .then(setOwners)
      .catch((err: unknown) => feedback.error(err));
    setOwnerId(lead.ownerId);
  }, [open, repository, lead.ownerId, feedback]);

  async function save() {
    const owner = owners.find((o) => o.id === ownerId);
    if (!owner) return;
    setBusy(true);
    try {
      const updated = await repository.assign(lead.id, owner.id, owner.name);
      onAssigned(updated);
      setOpen(false);
    } catch (err) {
      feedback.error(err);
    } finally {
      setBusy(false);
    }
  }

  if (!allowed) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {t("assign")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("assignTitle")}</DialogTitle>
          <DialogDescription>
            {t("assignHint", { name: lead.fullName })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger>
              <SelectValue placeholder={t("selectOwner")} />
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
