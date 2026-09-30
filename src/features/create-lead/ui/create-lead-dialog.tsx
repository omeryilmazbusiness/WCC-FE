"use client";

import { useState, type ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { useTranslations } from "next-intl";
import type { Lead, LeadRepository } from "@/entities/lead";
import { useCan } from "@/entities/viewer";
import { Button } from "@/shared/ui";
import { LeadFormDialog } from "./lead-form-dialog";

type Props = {
  repository: LeadRepository;
  onCreated: (lead: Lead) => void;
  /** Custom trigger element (click opens the form); defaults to a "New lead" button. */
  trigger?: ReactNode;
};

export function CreateLeadDialog({ repository, onCreated, trigger }: Props) {
  const allowed = useCan("leads.write");
  const t = useTranslations("pipeline");
  const [open, setOpen] = useState(false);

  if (!allowed) return null;

  return (
    <>
      {trigger ? (
        <Slot onClick={() => setOpen(true)}>{trigger}</Slot>
      ) : (
        <Button type="button" onClick={() => setOpen(true)}>
          {t("create")}
        </Button>
      )}
      <LeadFormDialog
        repository={repository}
        open={open}
        onOpenChange={setOpen}
        onSaved={onCreated}
      />
    </>
  );
}
