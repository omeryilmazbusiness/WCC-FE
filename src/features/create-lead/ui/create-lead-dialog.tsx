"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Lead, LeadRepository } from "@/entities/lead";
import { useCan } from "@/entities/viewer";
import { Button } from "@/shared/ui";
import { LeadFormDialog } from "./lead-form-dialog";

type Props = {
  repository: LeadRepository;
  onCreated: (lead: Lead) => void;
};

export function CreateLeadDialog({ repository, onCreated }: Props) {
  const allowed = useCan("leads.write");
  const t = useTranslations("pipeline");
  const [open, setOpen] = useState(false);

  if (!allowed) return null;

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        {t("create")}
      </Button>
      <LeadFormDialog
        repository={repository}
        open={open}
        onOpenChange={setOpen}
        onSaved={onCreated}
      />
    </>
  );
}
